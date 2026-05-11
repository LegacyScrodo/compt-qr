import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import type { Exposant } from '../../types'
import { StatusBadge } from '../../components/StatusBadge'
import { Skeleton } from '../../components/Skeleton'

export function ExposantList() {
  const [exposants, setExposants] = useState<Exposant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.exposants.list().then(setExposants).finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: number, nom: string) {
    if (!confirm(`Supprimer "${nom}" ?`)) return
    try {
      await api.exposants.delete(id)
      setExposants(prev => prev.filter(e => e.id !== id))
    } catch {
      setError('Erreur lors de la suppression')
    }
  }

  async function exportPdf() {
    try {
      const res = await api.exposants.exportPdf()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'compt-qr-badges.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Erreur lors de l\'export PDF')
    }
  }

  if (loading) return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-7 w-36" />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-gray-800 flex items-center gap-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-5 w-14 rounded-full" />
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
        <h1 className="text-xl font-bold">Exposants ({exposants.length})</h1>
        <div className="flex gap-3">
          <button onClick={exportPdf}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors">
            Exporter PDF
          </button>
          <Link to="/admin/exposants/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">
            + Ajouter
          </Link>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th className="px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">Nom</th>
              <th className="px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">Entreprise</th>
              <th className="px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">Stand</th>
              <th className="px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">Statut</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {exposants.filter(e => e.id !== undefined).map(e => (
              <tr key={e.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium">{e.nom}</td>
                <td className="px-4 py-3 text-sm text-gray-400">{e.entreprise ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-400">{e.stand ?? '—'}</td>
                <td className="px-4 py-3"><StatusBadge statut={e.statut} /></td>
                <td className="px-4 py-3 text-right space-x-3">
                  <Link to={`/admin/exposants/${e.id}`}
                    className="text-sm text-blue-400 hover:text-blue-300">Éditer</Link>
                  <button onClick={() => handleDelete(e.id!, e.nom)}
                    className="text-sm text-red-400 hover:text-red-300">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {exposants.length === 0 && (
          <div className="text-center py-12 text-gray-500">Aucun exposant enregistré.</div>
        )}
      </div>
    </div>
  )
}
