import { useState } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../api'
import { ToastProvider } from '../../components/Toast'

export function AdminLayout() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isActive = (path: string) => location.pathname.startsWith(path)
  const [menuOpen, setMenuOpen] = useState(false)

  async function logout() {
    await api.auth.logout().catch(() => {})
    setUser(null)
    navigate('/login')
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <nav className="bg-gray-900 border-b border-gray-800">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="text-lg font-bold text-white">ComptQR</span>
              <div className="hidden sm:flex items-center gap-6">
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
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <span className="text-sm text-gray-400 truncate max-w-[200px]">{user?.email}</span>
              <button onClick={logout} className="text-sm text-gray-400 hover:text-white transition-colors">
                Déconnexion
              </button>
            </div>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          {menuOpen && (
            <div className="sm:hidden border-t border-gray-800 px-4 py-3 space-y-1 animate-slide-up">
              <Link
                to="/admin/exposants"
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive('/admin/exposants') ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                Exposants
              </Link>
              <Link
                to="/admin/utilisateurs"
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive('/admin/utilisateurs') ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                Utilisateurs
              </Link>
              <div className="border-t border-gray-800 my-2 pt-2">
                <div className="px-3 py-1 text-xs text-gray-500 truncate">{user?.email}</div>
                <button
                  onClick={() => { setMenuOpen(false); logout() }}
                  className="block w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          )}
        </nav>
        <main className="p-4 sm:p-6 max-w-5xl mx-auto">
          <Outlet />
        </main>
      </div>
    </ToastProvider>
  )
}
