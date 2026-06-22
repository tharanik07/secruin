import { createContext, useContext, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

function isTokenExpired(token) {
  const payload = parseJwt(token)
  if (!payload?.exp) return false
  return Date.now() >= payload.exp * 1000
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token')
    if (token && isTokenExpired(token)) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      return null
    }
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    const payload = parseJwt(data.token)
    const userData = { ...data, userId: payload?.sub || data.email }
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  const register = async (email, password, fullName) => {
    const { data } = await api.post('/auth/register', { email, password, fullName })
    const payload = parseJwt(data.token)
    const userData = { ...data, userId: payload?.sub || data.email }
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
