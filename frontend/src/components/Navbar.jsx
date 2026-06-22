import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <nav className="bg-indigo-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold tracking-tight">🎫 EventHive</Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-4">
          <Link to="/" className="hover:text-indigo-200">Events</Link>
          {user ? (
            <>
              <Link to="/bookings" className="hover:text-indigo-200">My Bookings</Link>
              <span className="text-indigo-200 text-sm truncate max-w-[150px]">{user.email}</span>
              <button onClick={logout} className="bg-indigo-700 px-3 py-1 rounded hover:bg-indigo-800 text-sm">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-indigo-200">Login</Link>
              <Link to="/register" className="bg-white text-indigo-600 px-3 py-1 rounded font-medium hover:bg-indigo-50 text-sm">Sign Up</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(!open)} className="md:hidden p-1" aria-label="Toggle menu" aria-expanded={open}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open
              ? <path strokeLinecap="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-indigo-500 px-4 py-3 space-y-2">
          <Link to="/" onClick={() => setOpen(false)} className="block py-1 hover:text-indigo-200">Events</Link>
          {user ? (
            <>
              <Link to="/bookings" onClick={() => setOpen(false)} className="block py-1 hover:text-indigo-200">My Bookings</Link>
              <p className="text-indigo-200 text-sm">{user.email}</p>
              <button onClick={() => { logout(); setOpen(false) }} className="bg-indigo-700 px-3 py-1 rounded text-sm">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)} className="block py-1">Login</Link>
              <Link to="/register" onClick={() => setOpen(false)} className="block py-1">Sign Up</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
