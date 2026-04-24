import { createContext, useContext, useState, useEffect } from 'react'
import { BASE_URL } from '../api/socketConfig'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('gh_token'))
  const [loading, setLoading] = useState(true)

  // On mount, validate stored token
  useEffect(() => {
    if (token) {
      fetchMe(token)
    } else {
      setLoading(false)
    }
  }, [])

  async function fetchMe(t) {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
        setToken(t)
      } else {
        logout()
      }
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }

  async function login(email, password) {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.detail || 'Login failed')
    }

    localStorage.setItem('gh_token', data.access_token)
    setToken(data.access_token)
    setUser(data.user)
    return data.user
  }

  async function register(name, email, password, role) {
    const headers = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, email, password, role }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.detail || 'Registration failed')
    }

    return data
  }

  function logout() {
    localStorage.removeItem('gh_token')
    setToken(null)
    setUser(null)
  }

  function isAdmin() {
    return user?.role === 'admin'
  }

  function authHeaders() {
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, isAdmin, authHeaders }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
