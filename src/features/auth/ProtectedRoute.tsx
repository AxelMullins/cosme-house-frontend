import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'
import type { Role } from '@/schemas/auth.schema'

interface ProtectedRouteProps {
  requireRole?: Role
}

export function ProtectedRoute({ requireRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (requireRole && user.role !== requireRole) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
