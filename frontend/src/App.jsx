import { createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useToast, ToastContainer } from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import EventList from './pages/EventList'
import EventDetail from './pages/EventDetail'
import Queue from './pages/Queue'
import Checkout from './pages/Checkout'
import MyBookings from './pages/MyBookings'

const ToastContext = createContext(null)
export const useAppToast = () => useContext(ToastContext)

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

function AppContent() {
  const toast = useToast()

  return (
    <ToastContext.Provider value={toast}>
      <ToastContainer toasts={toast.toasts} />
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<EventList />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/queue/:eventId" element={<ProtectedRoute><Queue /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
        </Routes>
      </main>
    </ToastContext.Provider>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
