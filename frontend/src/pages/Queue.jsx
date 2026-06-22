import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAppToast } from '../App'
import api from '../services/api'
import QueueStatus from '../components/QueueStatus'

export default function Queue() {
  const { eventId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useAppToast()
  const [token, setToken] = useState(null)
  const [joined, setJoined] = useState(false)

  const joinQueue = async () => {
    try {
      const { data } = await api.post('/queue/join', { eventId, userId: user.userId })
      setToken(data.token)
      setJoined(true)
    } catch (err) { toast.error('Failed to join queue') }
  }

  const leaveQueue = () => {
    setJoined(false)
    setToken(null)
    toast.info('You left the queue')
    navigate('/')
  }

  const handleReady = useCallback(() => {
    toast.success("It's your turn! Redirecting...")
    navigate(`/events/${eventId}`)
  }, [navigate, eventId, toast])

  if (!joined) {
    return (
      <div className="max-w-md mx-auto text-center mt-16 space-y-6 animate-fade-in">
        <div className="text-6xl">🎫</div>
        <h1 className="text-2xl font-bold">High Demand Event</h1>
        <p className="text-gray-500">
          This event is experiencing high traffic. You'll be placed in a virtual queue
          to ensure a fair booking experience.
        </p>
        <button onClick={joinQueue}
          className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 font-medium">
          Join Queue
        </button>
      </div>
    )
  }

  return (
    <div className="mt-16 animate-fade-in">
      <QueueStatus token={token} onReady={handleReady} />
      <div className="text-center mt-6">
        <button onClick={leaveQueue} className="text-sm text-gray-500 hover:text-red-600">
          Leave Queue
        </button>
      </div>
    </div>
  )
}
