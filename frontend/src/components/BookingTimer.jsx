import { useState, useEffect, useRef } from 'react'

export default function BookingTimer({ seconds, onExpired, seatIds, userId }) {
  const [remaining, setRemaining] = useState(seconds)
  const expiredRef = useRef(false)

  useEffect(() => {
    if (remaining <= 0 && !expiredRef.current) {
      expiredRef.current = true
      // Release seats explicitly so other users see them immediately
      if (seatIds?.length && userId) {
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/seats/release`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seatIds, userId })
        }).catch(() => {})
      }
      onExpired()
      return
    }
    const timer = setInterval(() => setRemaining(r => r - 1), 1000)
    return () => clearInterval(timer)
  }, [remaining, onExpired, seatIds, userId])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const isUrgent = remaining < 60
  const pct = (remaining / seconds) * 100

  return (
    <div className={`p-4 rounded-lg ${isUrgent ? 'bg-red-50 border border-red-200' : 'bg-indigo-50 border border-indigo-200'}`}>
      <p className={`text-sm font-medium text-center ${isUrgent ? 'text-red-600' : 'text-indigo-600'}`}>
        Time remaining to complete payment
      </p>
      <p className={`text-3xl font-bold font-mono text-center mt-1 ${isUrgent ? 'text-red-700 animate-pulse' : 'text-indigo-700'}`}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </p>
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3">
        <div className={`h-1.5 rounded-full transition-all duration-1000 ${isUrgent ? 'bg-red-500' : 'bg-indigo-500'}`}
          style={{ width: `${pct}%` }}></div>
      </div>
    </div>
  )
}
