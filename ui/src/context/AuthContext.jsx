import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')

  const login = (userData, jwt) => {
    localStorage.setItem('user',  JSON.stringify(userData))
    localStorage.setItem('token', jwt)
    setUser(userData)
    setToken(jwt)
  }

  const logout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    setUser(null)
    setToken('')
  }

  const updateUser = (newUserData) => {
    localStorage.setItem('user', JSON.stringify(newUserData))
    setUser(newUserData)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
