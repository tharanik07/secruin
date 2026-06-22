import { useState, useEffect, useRef } from 'react'
import api from '../services/api'

export default function QueueStatus({ token, onReady }) {
  const [status, setStatus] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!token) return

    const poll = async () => {
      try {
        const { data } = await api.get(`/queue/status/${token}`)
        setStatus(data)
        if (data.status === 'YOUR_TURN') {
          clearInterval(intervalRef.current)
          onReady()
        }
      } catch (err) {
        console.error('Queue poll error:', err)
      }
    }

    poll() // immediate first call
    intervalRef.current = setInterval(poll, 2000)
    return () => clearInterval(intervalRef.current)
  }, [token, onReady])

  if (!status) {
    return (
      <div className="text-center py-8">
        <span className="animate-spin inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></span>
        <p className="mt-3 text-gray-500">Connecting to queue...</p>
      </div>
    )
  }

  if (status.status === 'EXPIRED') {
    return (
      <div className="max-w-md mx-auto text-center space-y-4">
        <div className="text-5xl">⏰</div>
        <h2 className="text-xl font-bold text-red-600">Queue session expired</h2>
        <p className="text-gray-500">Please rejoin the queue.</p>
      </div>
    )
  }

  const progress = status.totalInQueue > 0
    ? ((status.totalInQueue - status.position) / status.totalInQueue) * 100
    : 0

  return (
    <div className="max-w-md mx-auto text-center space-y-6">
      <div className="text-6xl animate-bounce">🎫</div>
      <h2 className="text-2xl font-bold">You're in the Queue</h2>

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <div>
          <p className="text-gray-500 text-sm">Your Position</p>
          <p className="text-4xl font-bold text-indigo-600">{status.position}</p>
          <p className="text-gray-400 text-sm">of {status.totalInQueue} in queue</p>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3" role="progressbar"
          aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
          <div className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(progress, 5)}%` }}></div>
        </div>

        <p className="text-sm text-gray-500">
          Estimated wait: <span className="font-medium">{status.estimatedWaitSeconds}s</span>
        </p>
      </div>

      <p className="text-sm text-gray-400">
        Please keep this page open. You'll be redirected automatically when it's your turn.
      </p>
    </div>
  )
}
