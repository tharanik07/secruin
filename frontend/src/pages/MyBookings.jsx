import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAppToast } from '../App'
import api from '../services/api'

const STATUS_BADGE = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
}

export default function MyBookings() {
  const { user } = useAuth()
  const toast = useAppToast()
  const [bookings, setBookings] = useState([])
  const [events, setEvents] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: bookingData } = await api.get(`/bookings/user/${user.userId}`)
        setBookings(bookingData)
        const eventIds = [...new Set(bookingData.map(b => b.eventId))]
        const eventMap = {}
        await Promise.all(eventIds.map(async (eid) => {
          try { const { data } = await api.get(`/events/${eid}`); eventMap[eid] = data } catch {}
        }))
        setEvents(eventMap)
      } catch (err) { console.error(err) }
      setLoading(false)
    }
    fetchData()
  }, [user])

  const handleCancel = async (bookingId) => {
    try {
      await api.post(`/bookings/${bookingId}/cancel`)
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: 'CANCELLED' } : b))
      toast.success('Booking cancelled. Refund initiated.')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel')
    }
  }

  const copyId = (id) => {
    navigator.clipboard.writeText(id)
    toast.success('Booking ID copied!')
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      {[1, 2].map(i => (
        <div key={i} className="bg-white rounded-xl shadow p-6 h-28">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold mb-8">My Bookings</h1>

      {bookings.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-5xl mb-4">🎫</div>
          <p>No bookings yet. Go explore some events!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map(booking => {
            const event = events[booking.eventId]
            return (
              <div key={booking.id} className="bg-white rounded-xl shadow p-6">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-bold text-lg">{event?.name || 'Event'}</p>
                    {event && (
                      <p className="text-sm text-gray-500">
                        📍 {event.venue}, {event.city} • 📅 {new Date(event.eventDate).toLocaleDateString()}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-400">ID: {booking.id.substring(0, 8)}</p>
                      <button onClick={() => copyId(booking.id)} className="text-indigo-500 hover:text-indigo-700"
                        aria-label="Copy booking ID" title="Copy full ID">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-sm font-medium">₹{booking.totalAmount}</p>
                  </div>
                  <div className="flex items-center gap-3 self-start">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_BADGE[booking.status]}`}>
                      {booking.status}
                    </span>
                    {booking.status === 'CONFIRMED' && (
                      <button onClick={() => handleCancel(booking.id)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium">Cancel</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
