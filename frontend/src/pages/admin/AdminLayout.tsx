import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../api'

export function AdminLayout() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()

  async function logout() {
    await api.auth.logout().catch(() => {})
    setUser(null)
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <Link to="/admin/exposants" className="text-lg font-bold text-white">ComptQR</Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{user?.email}</span>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-white transition-colors">
            Déconnexion
          </button>
        </div>
      </nav>
      <main className="p-6 max-w-5xl mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
