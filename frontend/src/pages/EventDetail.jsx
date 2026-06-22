import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAppToast } from '../App'
import api from '../services/api'
import SeatMap from '../components/SeatMap'

export default function EventDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useAppToast()
  const [event, setEvent] = useState(null)
  const [seats, setSeats] = useState([])
  const [selectedSeats, setSelectedSeats] = useState([])
  const [locking, setLocking] = useState(false)

  const fetchSeats = async () => {
    const { data } = await api.get(`/events/${id}/seats`)
    setSeats(data)
  }

  useEffect(() => {
    const fetchData = async () => {
      const [eventRes] = await Promise.all([api.get(`/events/${id}`), fetchSeats()])
      setEvent(eventRes.data)
    }
    fetchData()
  }, [id])

  // Auto-refresh seat map every 10s to show updates from other users
  useEffect(() => {
    const interval = setInterval(fetchSeats, 10000)
    return () => clearInterval(interval)
  }, [id])

  const handleToggleSeat = (seat) => {
    if (selectedSeats.includes(seat.id)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seat.id))
    } else if (selectedSeats.length < 6) {
      setSelectedSeats([...selectedSeats, seat.id])
    } else {
      toast.info('Maximum 6 seats per booking')
    }
  }

  const handleBookNow = async () => {
    if (!user) { navigate('/login'); return }
    if (selectedSeats.length === 0) { toast.error('Select at least one seat'); return }

    setLocking(true)
    try {
      await api.post('/seats/lock', {
        eventId: id,
        seatIds: selectedSeats,
        userId: user.userId
      })

      const selectedSeatData = seats.filter((s) => selectedSeats.includes(s.id))
      sessionStorage.setItem('checkoutData', JSON.stringify({
        eventId: id,
        eventName: event.name,
        seats: selectedSeatData,
        seatIds: selectedSeats,
        totalAmount: selectedSeatData.reduce((sum, s) => sum + s.price, 0)
      }))
      toast.success('Seats locked! You have 5 minutes to complete payment.')
      navigate('/checkout')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Seats unavailable. Try different seats.')
      fetchSeats() // Refresh to show current state
    }
    setLocking(false)
  }

  if (!event) return <div className="text-center py-12"><span className="animate-spin inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></span></div>

  const totalPrice = seats.filter((s) => selectedSeats.includes(s.id)).reduce((sum, s) => sum + s.price, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
          <p className="text-gray-500 mb-1">📍 {event.venue}, {event.city}</p>
          <p className="text-gray-500 mb-4">📅 {new Date(event.eventDate).toLocaleString()}</p>
          {event.description && <p className="text-gray-700">{event.description}</p>}
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Select Your Seats</h2>
            <button onClick={fetchSeats} className="text-sm text-indigo-600 hover:underline" aria-label="Refresh seat availability">
              🔄 Refresh
            </button>
          </div>
          <SeatMap seats={seats} selectedSeats={selectedSeats} onToggleSeat={handleToggleSeat} />
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl shadow p-6 sticky top-6">
          <h3 className="font-bold text-lg mb-4">Booking Summary</h3>
          {selectedSeats.length === 0 ? (
            <p className="text-gray-400 text-sm">Select seats to continue</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">{selectedSeats.length} seat{selectedSeats.length > 1 ? 's' : ''} selected</p>
              <div className="border-t pt-3">
                {seats.filter((s) => selectedSeats.includes(s.id)).map((s) => (
                  <div key={s.id} className="flex justify-between text-sm py-1">
                    <span>{s.rowName}{s.seatNumber} ({s.category})</span>
                    <span>₹{s.price}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 flex justify-between font-bold">
                <span>Total</span>
                <span>₹{totalPrice.toFixed(2)}</span>
              </div>
              <button onClick={handleBookNow} disabled={locking}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {locking && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                {locking ? 'Locking...' : 'Book Now'}
              </button>
              <p className="text-xs text-gray-400 text-center">Max 6 seats per booking</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
