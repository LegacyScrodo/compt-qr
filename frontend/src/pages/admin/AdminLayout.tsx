import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../api'
import { ToastProvider } from '../../components/Toast'

export function AdminLayout() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isActive = (path: string) => location.pathname.startsWith(path)

  async function logout() {
    await api.auth.logout().catch(() => {})
    setUser(null)
    navigate('/login')
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold text-white">ComptQR</span>
            <Link
              to="/admin/exposants"
              className={`text-sm transition-colors ${
                isActive('/admin/exposants') ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Exposants
            </Link>
            <Link
              to="/admin/utilisateurs"
              className={`text-sm transition-colors ${
                isActive('/admin/utilisateurs') ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Utilisateurs
            </Link>
          </div>
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
    </ToastProvider>
  )
}
