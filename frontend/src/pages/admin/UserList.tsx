import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import type { UserProfile } from '../../types'
import { useAuth } from '../../hooks/useAuth'
import { Skeleton } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'
import { ConfirmDialog } from '../../components/ConfirmDialog'

export function UserList() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const [confirmDelete, setConfirmDelete] = useState<UserProfile | null>(null)

  useEffect(() => {
    api.users.list()
      .then(setUsers)
      .catch(() => toast.show('error', 'Erreur lors du chargement'))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete() {
    if (!confirmDelete) return
    const u = confirmDelete
    setConfirmDelete(null)
    try {
      await api.users.delete(u.id)
      setUsers(prev => prev.filter(x => x.id !== u.id))
      toast.show('success', `Utilisateur "${u.email}" supprimé`)
    } catch (err) {
      toast.show('error', err instanceof Error ? err.message : 'Erreur lors de la suppression')
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-xl font-bold">Utilisateurs ({users.length})</h1>
        <Link to="/admin/utilisateurs/new"
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">
          + Ajouter
        </Link>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
        <div className="overflow-x-auto">
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
                      <button onClick={() => setConfirmDelete(u)}
                        className="text-sm text-red-400 hover:text-red-300">Supprimer</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="text-center py-12 text-gray-500">Aucun utilisateur enregistré.</div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {users.map(u => (
          <div key={u.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-white truncate">
                  {u.email}
                  {u.id === user?.id && <span className="ml-2 text-xs text-gray-500">(vous)</span>}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {new Date(u.created_at).toLocaleDateString('fr-CH')}
                </div>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                u.role === 'admin'
                  ? 'bg-purple-900/50 text-purple-400'
                  : 'bg-blue-900/50 text-blue-400'
              }`}>
                {u.role}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-gray-800">
              <Link
                to={`/admin/utilisateurs/${u.id}`}
                className="flex-1 inline-flex items-center justify-center h-11 px-3 rounded-lg text-sm text-blue-400 hover:text-blue-300 bg-gray-800/50 hover:bg-gray-800 transition-colors"
              >
                Éditer
              </Link>
              {u.id !== user?.id && (
                <button
                  onClick={() => setConfirmDelete(u)}
                  className="inline-flex items-center justify-center h-11 px-3 rounded-lg text-sm text-red-400 hover:text-red-300 bg-gray-800/50 hover:bg-gray-800 transition-colors"
                >
                  Supprimer
                </button>
              )}
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="text-center py-12 text-gray-500">Aucun utilisateur enregistré.</div>
        )}
      </div>
      <ConfirmDialog
        open={confirmDelete !== null}
        destructive
        title="Supprimer l'utilisateur"
        message={`L'utilisateur "${confirmDelete?.email}" sera définitivement supprimé.`}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
