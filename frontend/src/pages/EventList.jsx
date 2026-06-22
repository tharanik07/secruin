import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

const PAGE_SIZE = 6

const EVENT_ICONS = {
  'Coldplay': '🎵', 'Arijit': '🎵', 'Music': '🎵', 'Concert': '🎵', 'Live': '🎵',
  'IPL': '🏏', 'Cricket': '🏏', 'Final': '🏏', 'Sports': '⚽',
  'Comic': '📚', 'Con': '📚', 'Festival': '🎪',
}

function getEventIcon(name) {
  for (const [key, icon] of Object.entries(EVENT_ICONS)) {
    if (name.includes(key)) return icon
  }
  return '🎫'
}

export default function EventList() {
  const [events, setEvents] = useState([])
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => { fetchEvents(); setPage(1) }, [city])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const params = city ? { city } : {}
      const { data } = await api.get('/events', { params })
      setEvents(data)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const totalPages = Math.ceil(events.length / PAGE_SIZE)
  const paginatedEvents = events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Upcoming Events</h1>
        <input type="text" placeholder="Filter by city..." value={city}
          onChange={(e) => setCity(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
          aria-label="Filter events by city" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-5 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-5 bg-gray-200 rounded-full w-20"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No events found</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedEvents.map(event => {
              const soldOut = event.availableSeats <= 0
              return (
                <Link key={event.id} to={soldOut ? '#' : `/events/${event.id}`}
                  className={`bg-white rounded-xl shadow-md overflow-hidden transition-shadow relative
                    ${soldOut ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-lg'}`}
                  onClick={e => { if (soldOut) e.preventDefault() }}>

                  {/* Sold Out overlay */}
                  {soldOut && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                      <span className="bg-red-600 text-white px-4 py-2 rounded-full font-bold text-lg rotate-[-10deg]">SOLD OUT</span>
                    </div>
                  )}

                  <div className="h-48 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <span className="text-6xl">{getEventIcon(event.name)}</span>
                  </div>
                  <div className="p-5">
                    <h2 className="text-lg font-bold mb-1">{event.name}</h2>
                    <p className="text-gray-500 text-sm mb-2">📍 {event.venue}, {event.city}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">
                        {new Date(event.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        soldOut ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {soldOut ? 'Sold Out' : `${event.availableSeats} left`}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 rounded border disabled:opacity-30 hover:bg-gray-100" aria-label="Previous page">←</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i + 1} onClick={() => setPage(i + 1)}
                  className={`px-3 py-1 rounded ${page === i + 1 ? 'bg-indigo-600 text-white' : 'border hover:bg-gray-100'}`}
                  aria-current={page === i + 1 ? 'page' : undefined}>{i + 1}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1 rounded border disabled:opacity-30 hover:bg-gray-100" aria-label="Next page">→</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
