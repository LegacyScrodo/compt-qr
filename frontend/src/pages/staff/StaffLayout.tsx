import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../api'

export function StaffLayout() {
  const { setUser } = useAuth()
  const navigate = useNavigate()

  async function logout() {
    await api.auth.logout().catch(() => {})
    setUser(null)
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <span className="font-bold text-white">ComptQR — Entrée</span>
        <button onClick={logout} className="text-sm text-gray-400 hover:text-white">Déconnexion</button>
      </div>
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  )
}
