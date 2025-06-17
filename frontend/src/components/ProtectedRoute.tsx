import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store'
import { useEffect } from 'react'

export function ProtectedRoute() {
  const { isAuthenticated, refreshUser } = useAuthStore()

  useEffect(() => {
    // Try to refresh user data on mount if authenticated
    if (isAuthenticated) {
      refreshUser()
    }
  }, [isAuthenticated, refreshUser])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}