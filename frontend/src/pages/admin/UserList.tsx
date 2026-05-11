import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import type { UserProfile } from '../../types'
import { useAuth } from '../../hooks/useAuth'
import { Skeleton } from '../../components/Skeleton'

export function UserList() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.users.list()
      .then(setUsers)
      .catch(() => setError('Erreur lors du chargement'))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: number, email: string) {
    if (!confirm(`Supprimer l'utilisateur "${email}" ?`)) return
    try {
      await api.users.delete(id)
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  if (loading) return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-gray-800 flex items-center gap-6">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      {error && (
        <div className="mb-4 bg-red-950 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Utilisateurs ({users.length})</h1>
        <Link to="/admin/utilisateurs/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">
          + Ajouter
        </Link>
      </div>

      <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th className="px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">Rôle</th>
              <th className="px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">Créé le</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium">
                  {u.email}
                  {u.id === user?.id && (
                    <span className="ml-2 text-xs text-gray-500">(vous)</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    u.role === 'admin'
                      ? 'bg-purple-900/50 text-purple-400'
                      : 'bg-blue-900/50 text-blue-400'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">
                  {new Date(u.created_at).toLocaleDateString('fr-CH')}
                </td>
                <td className="px-4 py-3 text-right space-x-3">
                  <Link to={`/admin/utilisateurs/${u.id}`}
                    className="text-sm text-blue-400 hover:text-blue-300">Éditer</Link>
                  {u.id !== user?.id && (
                    <button onClick={() => handleDelete(u.id, u.email)}
                      className="text-sm text-red-400 hover:text-red-300">Supprimer</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-12 text-gray-500">Aucun utilisateur enregistré.</div>
        )}
      </div>
    </div>
  )
}
