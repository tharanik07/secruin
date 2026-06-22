import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAppToast } from '../App'
import api from '../services/api'
import BookingTimer from '../components/BookingTimer'

export default function Checkout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useAppToast()
  const [checkoutData, setCheckoutData] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [bookingStatus, setBookingStatus] = useState(null)
  const [bookingId, setBookingId] = useState(null)

  useEffect(() => {
    const data = sessionStorage.getItem('checkoutData')
    if (!data) { navigate('/'); return }
    setCheckoutData(JSON.parse(data))
  }, [navigate])

  const processPayment = async () => {
    setProcessing(true)
    setBookingStatus('processing')
    try {
      const { data } = await api.post('/bookings', {
        userId: user.userId,
        eventId: checkoutData.eventId,
        seatIds: checkoutData.seatIds,
        totalAmount: checkoutData.totalAmount
      })
      setBookingId(data.id)

      const pollStatus = setInterval(async () => {
        try {
          const res = await api.get(`/bookings/${data.id}/status`)
          if (res.data.status === 'CONFIRMED') {
            clearInterval(pollStatus)
            setBookingStatus('confirmed')
            sessionStorage.removeItem('checkoutData')
            toast.success('Booking confirmed! 🎉')
          } else if (res.data.status === 'FAILED') {
            clearInterval(pollStatus)
            setBookingStatus('failed')
            toast.error('Payment failed. You can retry.')
          }
        } catch { clearInterval(pollStatus) }
      }, 1500)

      setTimeout(() => clearInterval(pollStatus), 30000)
    } catch (err) {
      setBookingStatus('failed')
      toast.error(err.response?.data?.error || 'Booking failed')
    }
    setProcessing(false)
  }

  const handleRetry = async () => {
    // Re-lock the seats and try again
    try {
      await api.post('/seats/lock', {
        eventId: checkoutData.eventId,
        seatIds: checkoutData.seatIds,
        userId: user.userId
      })
      setBookingStatus(null)
      setBookingId(null)
      toast.info('Seats re-locked. Try payment again.')
    } catch {
      toast.error('Seats no longer available. Select new seats.')
      sessionStorage.removeItem('checkoutData')
      navigate(`/events/${checkoutData.eventId}`)
    }
  }

  const handleBack = () => {
    // Release seats then go back
    api.post('/seats/release', { seatIds: checkoutData.seatIds, userId: user.userId }).catch(() => {})
    sessionStorage.removeItem('checkoutData')
    navigate(checkoutData ? `/events/${checkoutData.eventId}` : '/')
  }

  const handleExpired = useCallback(() => {
    toast.error('Time expired! Seats released.')
    sessionStorage.removeItem('checkoutData')
    navigate('/')
  }, [navigate, toast])

  if (!checkoutData) return null

  return (
    <div className="max-w-lg mx-auto mt-8 animate-fade-in">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Checkout</h1>
          {!bookingStatus && (
            <button onClick={handleBack} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
          )}
        </div>

        {/* Timer - passes seatIds for release on expiry */}
        {!bookingStatus && (
          <BookingTimer seconds={300} onExpired={handleExpired}
            seatIds={checkoutData.seatIds} userId={user.userId} />
        )}

        {/* Order summary */}
        <div className="my-6 space-y-3">
          <h3 className="font-medium text-gray-700">{checkoutData.eventName}</h3>
          <div className="border rounded-lg p-3 space-y-1">
            {checkoutData.seats.map(seat => (
              <div key={seat.id} className="flex justify-between text-sm">
                <span>Seat {seat.rowName}{seat.seatNumber} <span className="text-gray-400">({seat.category})</span></span>
                <span>₹{seat.price}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>₹{checkoutData.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* States */}
        {bookingStatus === 'processing' && (
          <div className="text-center py-6">
            <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-gray-600">Processing payment...</p>
            <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
          </div>
        )}

        {bookingStatus === 'confirmed' && (
          <div className="text-center py-6 space-y-3">
            <div className="text-5xl">✅</div>
            <h2 className="text-xl font-bold text-green-600">Booking Confirmed!</h2>
            <p className="text-sm text-gray-500">Booking ID: <code className="bg-gray-100 px-2 py-0.5 rounded">{bookingId?.substring(0, 8)}</code></p>
            <button onClick={() => navigate('/bookings')}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
              View My Bookings
            </button>
          </div>
        )}

        {bookingStatus === 'failed' && (
          <div className="text-center py-6 space-y-3">
            <div className="text-5xl">❌</div>
            <h2 className="text-xl font-bold text-red-600">Payment Failed</h2>
            <p className="text-sm text-gray-500">Your card was declined. No charge was made.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={handleRetry}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
                🔄 Retry Payment
              </button>
              <button onClick={() => { sessionStorage.removeItem('checkoutData'); navigate(`/events/${checkoutData.eventId}`) }}
                className="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50">
                Choose Different Seats
              </button>
            </div>
          </div>
        )}

        {/* Pay button */}
        {!bookingStatus && (
          <button onClick={processPayment} disabled={processing}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium text-lg disabled:opacity-50 mt-4">
            💳 Pay ₹{checkoutData.totalAmount.toFixed(2)}
          </button>
        )}
      </div>
    </div>
  )
}
