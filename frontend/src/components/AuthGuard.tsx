import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface Props {
  role: 'admin' | 'staff'
  children: ReactNode
}

export function AuthGuard({ role, children }: Props) {
  const { user, loading } = useAuth()

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Chargement...</div>
  if (!user || user.role !== role) return <Navigate to="/login" replace />
  return <>{children}</>
}
