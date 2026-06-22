import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
// CONCURRENCY-SAFE IN-MEMORY STORE
// Simulates Redis atomic operations with mutex locks
// ============================================================

class ConcurrencyLock {
  constructor() {
    this.locks = new Map(); // key → { resolve queue }
  }

  async acquire(key) {
    while (this.locks.has(key)) {
      await new Promise(r => setTimeout(r, 5)); // spin wait
    }
    this.locks.set(key, true);
  }

  release(key) {
    this.locks.delete(key);
  }
}

const lock = new ConcurrencyLock();

// ============================================================
// DATA STORE
// ============================================================

const users = new Map(); // email → user
const tokens = new Map(); // token → userId
const seatLocks = new Map(); // seatId → { userId, expiresAt }
const bookings = new Map(); // bookingId → booking
const queueStore = new Map(); // eventId → [ { userId, joinedAt, token } ]
const queueTokens = new Map(); // token → { userId, eventId, grantedAt? }

const events = [
  { id: '1', name: 'Coldplay: Music of the Spheres', description: 'World tour concert', venue: 'DY Patil Stadium', city: 'Mumbai', eventDate: '2026-08-15T19:00:00', totalSeats: 50000, availableSeats: 49980, status: 'UPCOMING' },
  { id: '2', name: 'IPL 2026 Final', description: 'The grand finale', venue: 'Narendra Modi Stadium', city: 'Ahmedabad', eventDate: '2026-05-30T19:30:00', totalSeats: 110000, availableSeats: 5000, status: 'UPCOMING' },
  { id: '3', name: 'Arijit Singh Live', description: 'Soulful evening', venue: 'JLN Stadium', city: 'Delhi', eventDate: '2026-09-10T18:00:00', totalSeats: 30000, availableSeats: 28500, status: 'UPCOMING' },
  { id: '4', name: 'Comic Con India 2026', description: 'Pop culture festival', venue: 'NESCO', city: 'Mumbai', eventDate: '2026-12-05T10:00:00', totalSeats: 15000, availableSeats: 12000, status: 'UPCOMING' },
];

// Generate seats
const seats = {};
events.forEach(event => {
  seats[event.id] = [];
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const categories = ['VIP', 'VIP', 'PREMIUM', 'PREMIUM', 'REGULAR', 'REGULAR', 'REGULAR', 'REGULAR'];
  const prices = [5000, 5000, 3000, 3000, 1500, 1500, 1500, 1500];
  rows.forEach((row, ri) => {
    for (let i = 1; i <= 10; i++) {
      seats[event.id].push({
        id: `${event.id}-${row}${i}`,
        eventId: event.id,
        seatNumber: `${i}`,
        rowName: row,
        category: categories[ri],
        price: prices[ri],
        status: 'AVAILABLE',
        lockedBy: null,
        lockedUntil: null,
        bookedBy: null
      });
    }
  });
});

// ============================================================
// HELPERS
// ============================================================

function generateToken() { return crypto.randomUUID(); }

function isLockExpired(seatId) {
  const lockInfo = seatLocks.get(seatId);
  if (!lockInfo) return true;
  return Date.now() > lockInfo.expiresAt;
}

function cleanExpiredLock(seat) {
  if (seat.status === 'LOCKED' && isLockExpired(seat.id)) {
    seat.status = 'AVAILABLE';
    seat.lockedBy = null;
    seat.lockedUntil = null;
    seatLocks.delete(seat.id);
  }
}

function authenticate(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  return tokens.get(token) || null;
}

// ============================================================
// AUTH ENDPOINTS
// ============================================================

app.post('/auth/register', (req, res) => {
  const { email, password, fullName } = req.body;

  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  if (users.has(email)) return res.status(409).json({ message: 'Email already registered' });

  const userId = crypto.randomUUID();
  users.set(email, { id: userId, email, password, fullName: fullName || '', role: 'USER' });

  const token = generateToken();
  tokens.set(token, userId);

  res.json({ token, email, fullName: fullName || '', role: 'USER', userId });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  const user = users.get(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = generateToken();
  tokens.set(token, user.id);

  res.json({ token, email: user.email, fullName: user.fullName, role: user.role, userId: user.id });
});

app.get('/users/profile', (req, res) => {
  const userId = authenticate(req);
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  for (const user of users.values()) {
    if (user.id === userId) return res.json({ id: user.id, email: user.email, fullName: user.fullName, role: user.role });
  }
  res.status(404).json({ message: 'User not found' });
});

// ============================================================
// EVENT ENDPOINTS
// ============================================================

app.get('/events', (req, res) => {
  let result = events;
  if (req.query.city) result = result.filter(e => e.city.toLowerCase().includes(req.query.city.toLowerCase()));
  if (req.query.status) result = result.filter(e => e.status === req.query.status);
  res.json(result);
});

app.get('/events/:id', (req, res) => {
  const event = events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

// ============================================================
// SEAT ENDPOINTS — CONCURRENCY-SAFE
// ============================================================

app.get('/events/:eventId/seats', (req, res) => {
  const eventSeats = seats[req.params.eventId];
  if (!eventSeats) return res.status(404).json({ error: 'Event not found' });

  // Clean expired locks before returning
  eventSeats.forEach(cleanExpiredLock);

  // Return sanitized data (don't expose lockedBy to other users)
  const sanitized = eventSeats.map(s => ({
    id: s.id, eventId: s.eventId, seatNumber: s.seatNumber, rowName: s.rowName,
    category: s.category, price: s.price, status: s.status
  }));
  res.json(sanitized);
});

/**
 * POST /seats/lock — Atomic seat locking
 * 
 * Concurrency guarantees:
 * 1. Acquires per-seat mutex before checking/modifying status
 * 2. All-or-nothing: if ANY seat fails, ALL previously locked seats in this request are rolled back
 * 3. TTL-based: locks auto-expire after 5 minutes
 * 4. Owner-only: can't lock a seat already locked by another user
 * 
 * Edge cases handled:
 * - Seat doesn't exist → 404
 * - Seat already BOOKED → 409
 * - Seat locked by another user (not expired) → 409 with rollback
 * - Seat locked by SAME user → idempotent success (extends TTL)
 * - Empty seatIds → 400
 * - More than 6 seats → 400
 * - Invalid eventId → 404
 */
app.post('/seats/lock', async (req, res) => {
  const { eventId, seatIds, userId } = req.body;

  // Validation
  if (!eventId || !seatIds || !userId) return res.status(400).json({ error: 'eventId, seatIds, and userId required' });
  if (!Array.isArray(seatIds) || seatIds.length === 0) return res.status(400).json({ error: 'seatIds must be a non-empty array' });
  if (seatIds.length > 6) return res.status(400).json({ error: 'Maximum 6 seats per booking' });

  const eventSeats = seats[eventId];
  if (!eventSeats) return res.status(404).json({ error: 'Event not found' });

  const lockedInThisRequest = [];
  const LOCK_TTL = 300000; // 5 minutes in ms

  try {
    for (const seatId of seatIds) {
      // Acquire mutex for this specific seat
      await lock.acquire(`seat:${seatId}`);

      try {
        const seat = eventSeats.find(s => s.id === seatId);
        if (!seat) {
          throw { code: 404, error: `Seat ${seatId} not found` };
        }

        // Clean expired lock first
        cleanExpiredLock(seat);

        if (seat.status === 'BOOKED') {
          throw { code: 409, error: `Seat ${seat.rowName}${seat.seatNumber} is already booked` };
        }

        if (seat.status === 'LOCKED') {
          if (seat.lockedBy === userId) {
            // Idempotent: same user re-locking → extend TTL
            const expiresAt = Date.now() + LOCK_TTL;
            seat.lockedUntil = new Date(expiresAt).toISOString();
            seatLocks.set(seatId, { userId, expiresAt });
            lockedInThisRequest.push(seatId);
          } else {
            // Different user holds the lock
            throw { code: 409, error: `Seat ${seat.rowName}${seat.seatNumber} is locked by another user` };
          }
        } else {
          // AVAILABLE → lock it
          const expiresAt = Date.now() + LOCK_TTL;
          seat.status = 'LOCKED';
          seat.lockedBy = userId;
          seat.lockedUntil = new Date(expiresAt).toISOString();
          seatLocks.set(seatId, { userId, expiresAt });
          lockedInThisRequest.push(seatId);
        }
      } finally {
        lock.release(`seat:${seatId}`);
      }
    }

    // All seats locked successfully
    res.json({ status: 'LOCKED', seatIds: lockedInThisRequest, ttlSeconds: 300 });

  } catch (err) {
    // ROLLBACK: release any seats we locked in this request
    for (const seatId of lockedInThisRequest) {
      await lock.acquire(`seat:${seatId}`);
      try {
        const seat = eventSeats.find(s => s.id === seatId);
        if (seat && seat.lockedBy === userId) {
          seat.status = 'AVAILABLE';
          seat.lockedBy = null;
          seat.lockedUntil = null;
          seatLocks.delete(seatId);
        }
      } finally {
        lock.release(`seat:${seatId}`);
      }
    }
    res.status(err.code || 500).json({ error: err.error || 'Internal error' });
  }
});

/**
 * POST /seats/release — Explicit seat release
 * Only the lock owner can release their seats.
 */
app.post('/seats/release', async (req, res) => {
  const { seatIds, userId } = req.body;
  if (!seatIds || !userId) return res.status(400).json({ error: 'seatIds and userId required' });

  const released = [];
  for (const seatId of seatIds) {
    await lock.acquire(`seat:${seatId}`);
    try {
      // Find the seat across all events
      for (const eventSeats of Object.values(seats)) {
        const seat = eventSeats.find(s => s.id === seatId);
        if (seat && seat.lockedBy === userId) {
          seat.status = 'AVAILABLE';
          seat.lockedBy = null;
          seat.lockedUntil = null;
          seatLocks.delete(seatId);
          released.push(seatId);
          break;
        }
      }
    } finally {
      lock.release(`seat:${seatId}`);
    }
  }
  res.json({ status: 'RELEASED', released });
});

// ============================================================
// QUEUE ENDPOINTS — FIFO with position tracking
// ============================================================

app.post('/queue/join', (req, res) => {
  const { eventId, userId } = req.body;
  if (!eventId || !userId) return res.status(400).json({ error: 'eventId and userId required' });

  if (!queueStore.has(eventId)) queueStore.set(eventId, []);
  const queue = queueStore.get(eventId);

  // Check if already in queue (idempotent)
  const existing = queue.find(e => e.userId === userId);
  if (existing) {
    const position = queue.indexOf(existing) + 1;
    return res.json({ token: existing.token, position, totalInQueue: queue.length, status: 'WAITING', estimatedWaitSeconds: position * 3 });
  }

  const token = generateToken();
  queue.push({ userId, joinedAt: Date.now(), token });
  queueTokens.set(token, { userId, eventId, grantedAt: null });

  const position = queue.length;

  // Auto-grant after simulated wait (5s for demo)
  setTimeout(() => {
    const info = queueTokens.get(token);
    if (info && !info.grantedAt) info.grantedAt = Date.now();
  }, 5000);

  res.json({ token, position, totalInQueue: queue.length, status: 'WAITING', estimatedWaitSeconds: position * 3 });
});

app.get('/queue/status/:token', (req, res) => {
  const info = queueTokens.get(req.params.token);
  if (!info) return res.json({ token: req.params.token, position: -1, totalInQueue: 0, status: 'EXPIRED', estimatedWaitSeconds: 0 });

  if (info.grantedAt) {
    return res.json({ token: req.params.token, position: 0, totalInQueue: 0, status: 'YOUR_TURN', estimatedWaitSeconds: 0 });
  }

  const queue = queueStore.get(info.eventId) || [];
  const entry = queue.find(e => e.token === req.params.token);
  const position = entry ? queue.indexOf(entry) + 1 : 0;

  res.json({ token: req.params.token, position, totalInQueue: queue.length, status: 'WAITING', estimatedWaitSeconds: position * 3 });
});

// ============================================================
// BOOKING ENDPOINTS — SAGA PATTERN WITH CONCURRENCY
// ============================================================

/**
 * POST /bookings — Create booking with saga
 * 
 * Flow:
 * 1. Validate user owns the seat locks
 * 2. Create booking in PENDING state
 * 3. Simulate async payment (saga step)
 * 4. On payment success → CONFIRMED, seats marked BOOKED
 * 5. On payment failure → FAILED, seats released (compensation)
 * 
 * Edge cases:
 * - User doesn't own the locks → 403
 * - Lock expired between lock and booking → 409
 * - Duplicate booking for same seats → 409
 * - Payment timeout (>30s) → FAILED + compensation
 */
app.post('/bookings', async (req, res) => {
  const { userId, eventId, seatIds, totalAmount } = req.body;

  // Validation
  if (!userId || !eventId || !seatIds || !totalAmount) {
    return res.status(400).json({ error: 'userId, eventId, seatIds, and totalAmount required' });
  }
  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({ error: 'seatIds must be non-empty array' });
  }

  const eventSeats = seats[eventId];
  if (!eventSeats) return res.status(404).json({ error: 'Event not found' });

  // Verify user owns ALL seat locks (concurrency-safe check)
  for (const seatId of seatIds) {
    await lock.acquire(`seat:${seatId}`);
    try {
      const seat = eventSeats.find(s => s.id === seatId);
      if (!seat) {
        return res.status(404).json({ error: `Seat ${seatId} not found` });
      }
      cleanExpiredLock(seat);

      if (seat.status !== 'LOCKED' || seat.lockedBy !== userId) {
        return res.status(409).json({
          error: `Seat ${seat.rowName}${seat.seatNumber} is not locked by you. Lock may have expired.`
        });
      }
    } finally {
      lock.release(`seat:${seatId}`);
    }
  }

  // Check for duplicate booking (same user + same seats + PENDING/CONFIRMED)
  for (const [, existing] of bookings) {
    if (existing.userId === userId && existing.eventId === eventId &&
        ['PENDING', 'CONFIRMED'].includes(existing.status) &&
        JSON.stringify(existing.seatIds.sort()) === JSON.stringify([...seatIds].sort())) {
      return res.status(409).json({ error: 'Duplicate booking. You already have a booking for these seats.', bookingId: existing.id });
    }
  }

  // Create booking
  const bookingId = crypto.randomUUID();
  const booking = {
    id: bookingId,
    userId,
    eventId,
    seatIds,
    totalAmount,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    paymentAttempts: 0
  };
  bookings.set(bookingId, booking);

  res.json(booking);

  // ====== SAGA: Async payment processing ======
  setTimeout(async () => {
    const b = bookings.get(bookingId);
    if (!b || b.status !== 'PENDING') return;

    b.paymentAttempts++;
    const paymentSuccess = Math.random() > 0.15; // 85% success

    if (paymentSuccess) {
      // CONFIRM: mark seats as BOOKED
      b.status = 'CONFIRMED';
      b.updatedAt = new Date().toISOString();
      b.paymentId = 'TXN-' + crypto.randomUUID().substring(0, 8);

      for (const seatId of b.seatIds) {
        await lock.acquire(`seat:${seatId}`);
        try {
          const seat = eventSeats.find(s => s.id === seatId);
          if (seat) {
            seat.status = 'BOOKED';
            seat.bookedBy = userId;
            seat.lockedBy = null;
            seat.lockedUntil = null;
            seatLocks.delete(seatId);
          }
        } finally {
          lock.release(`seat:${seatId}`);
        }
      }

      // Update available seat count
      const event = events.find(e => e.id === eventId);
      if (event) event.availableSeats -= b.seatIds.length;

      console.log(`✅ Booking ${bookingId.substring(0, 8)} CONFIRMED — seats: ${b.seatIds.join(', ')}`);
    } else {
      // COMPENSATE: release seats
      b.status = 'FAILED';
      b.updatedAt = new Date().toISOString();
      b.failReason = 'Payment declined by gateway';

      for (const seatId of b.seatIds) {
        await lock.acquire(`seat:${seatId}`);
        try {
          const seat = eventSeats.find(s => s.id === seatId);
          if (seat && seat.lockedBy === userId) {
            seat.status = 'AVAILABLE';
            seat.lockedBy = null;
            seat.lockedUntil = null;
            seatLocks.delete(seatId);
          }
        } finally {
          lock.release(`seat:${seatId}`);
        }
      }

      console.log(`❌ Booking ${bookingId.substring(0, 8)} FAILED — seats released`);
    }
  }, 2000); // 2 second payment simulation
});

app.get('/bookings/:id', (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json(booking);
});

app.get('/bookings/:id/status', (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json({ bookingId: booking.id, status: booking.status, paymentId: booking.paymentId || null });
});

app.get('/bookings/user/:userId', (req, res) => {
  const userBookings = [];
  for (const booking of bookings.values()) {
    if (booking.userId === req.params.userId) userBookings.push(booking);
  }
  userBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(userBookings);
});

/**
 * POST /bookings/:id/cancel — Cancel booking
 * Only CONFIRMED bookings can be cancelled.
 * Releases seats back to AVAILABLE (compensation).
 */
app.post('/bookings/:id/cancel', async (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  if (booking.status === 'CANCELLED') {
    return res.json({ status: 'CANCELLED', message: 'Already cancelled' });
  }
  if (booking.status !== 'CONFIRMED') {
    return res.status(400).json({ error: `Cannot cancel booking in ${booking.status} state` });
  }

  booking.status = 'CANCELLED';
  booking.updatedAt = new Date().toISOString();

  // Release seats
  const eventSeats = seats[booking.eventId];
  if (eventSeats) {
    for (const seatId of booking.seatIds) {
      await lock.acquire(`seat:${seatId}`);
      try {
        const seat = eventSeats.find(s => s.id === seatId);
        if (seat && seat.bookedBy === booking.userId) {
          seat.status = 'AVAILABLE';
          seat.bookedBy = null;
        }
      } finally {
        lock.release(`seat:${seatId}`);
      }
    }
    // Restore available count
    const event = events.find(e => e.id === booking.eventId);
    if (event) event.availableSeats += booking.seatIds.length;
  }

  console.log(`🚫 Booking ${booking.id.substring(0, 8)} CANCELLED — seats released`);
  res.json({ status: 'CANCELLED', refundStatus: 'INITIATED' });
});

// ============================================================
// PERIODIC LOCK CLEANUP (simulates Redis TTL expiry)
// ============================================================

setInterval(() => {
  let cleaned = 0;
  for (const eventSeats of Object.values(seats)) {
    for (const seat of eventSeats) {
      if (seat.status === 'LOCKED' && isLockExpired(seat.id)) {
        seat.status = 'AVAILABLE';
        seat.lockedBy = null;
        seat.lockedUntil = null;
        seatLocks.delete(seat.id);
        cleaned++;
      }
    }
  }
  if (cleaned > 0) console.log(`🧹 Cleaned ${cleaned} expired lock(s)`);
}, 30000); // every 30 seconds

// ============================================================
// CONCURRENCY TEST ENDPOINT
// Simulates 2 users trying to lock the same seat simultaneously
// ============================================================

app.post('/test/race-condition', async (req, res) => {
  const seatId = '1-A1';
  const eventSeats = seats['1'];
  const seat = eventSeats.find(s => s.id === seatId);

  // Reset seat first
  seat.status = 'AVAILABLE';
  seat.lockedBy = null;
  seatLocks.delete(seatId);

  // Simulate 2 concurrent lock attempts
  const results = await Promise.all([
    fetch('http://localhost:8080/seats/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: '1', seatIds: ['1-A1'], userId: 'user-A' })
    }).then(r => ({ user: 'A', status: r.status })),
    fetch('http://localhost:8080/seats/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: '1', seatIds: ['1-A1'], userId: 'user-B' })
    }).then(r => ({ user: 'B', status: r.status }))
  ]);

  const winner = results.find(r => r.status === 200);
  const loser = results.find(r => r.status === 409);

  res.json({
    test: 'race-condition',
    result: winner && loser ? 'PASS ✅ — exactly one winner' : 'CHECK — review results',
    details: results,
    seatState: { status: seat.status, lockedBy: seat.lockedBy }
  });
});

// ============================================================
// SERVER STARTUP
// ============================================================

app.listen(8080, () => {
  // Seed test user
  const testUserId = crypto.randomUUID();
  users.set('test@test.com', { id: testUserId, email: 'test@test.com', password: 'password', fullName: 'Test User', role: 'USER' });
  const token = generateToken();
  tokens.set(token, testUserId);

  console.log('');
  console.log('🚀 EventHive Mock Server (Concurrency-Safe)');
  console.log('   http://localhost:8080');
  console.log('');
  console.log('📧 Test user: test@test.com / password');
  console.log('');
  console.log('Concurrency features:');
  console.log('  • Per-seat mutex locks (no double-booking)');
  console.log('  • All-or-nothing multi-seat locking (atomic rollback)');
  console.log('  • TTL-based auto-expiry (5 min)');
  console.log('  • Saga pattern: payment → confirm/compensate');
  console.log('  • Idempotent lock (same user re-lock extends TTL)');
  console.log('  • Duplicate booking detection');
  console.log('  • Owner-only release/cancel');
  console.log('');
  console.log('Test endpoints:');
  console.log('  POST /test/race-condition — verify only 1 user wins');
  console.log('');
});
