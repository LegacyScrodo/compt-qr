import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, MapPin, Trash2, Pencil } from 'lucide-react'
import { api } from '../../api'
import type { Plan } from '../../types'
import { useToast } from '../../components/Toast'
import { ConfirmDialog } from '../../components/ConfirmDialog'

export function PlanList() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<Plan | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newNom, setNewNom] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    api.plans.list().then(setPlans).finally(() => setLoading(false))
  }, [])

  async function handleCreate() {
    const file = fileRef.current?.files?.[0]
    if (!newNom.trim() || !file) {
      toast.show('error', 'Nom et image requis')
      return
    }
    setCreating(true)
    try {
      const plan = await api.plans.create(newNom.trim(), file)
      setCreateOpen(false)
      setNewNom('')
      navigate(`/admin/plans/${plan.id}`)
    } catch (e) {
      toast.show('error', e instanceof Error ? e.message : 'Erreur')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    const plan = confirmDelete
    setConfirmDelete(null)
    try {
      await api.plans.delete(plan.id)
      setPlans(prev => prev.filter(p => p.id !== plan.id))
      toast.show('success', `"${plan.nom}" supprimé`)
    } catch {
      toast.show('error', 'Erreur lors de la suppression')
    }
  }

  if (loading) return <div className="text-gray-400">Chargement…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Plans</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={14} />
          Nouveau plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MapPin size={40} strokeWidth={1.5} className="mx-auto mb-3 text-gray-600" />
          <p className="text-sm">Aucun plan pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(p => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <Link to={`/admin/plans/${p.id}`} className="block aspect-video bg-gray-800 overflow-hidden">
                <img src={p.image_file} alt={p.nom} className="w-full h-full object-cover" />
              </Link>
              <div className="p-3 flex items-center justify-between">
                <div className="font-medium text-white truncate">{p.nom}</div>
                <div className="flex items-center gap-1">
                  <Link to={`/admin/plans/${p.id}`} className="p-1.5 rounded text-blue-400 hover:bg-gray-800" aria-label="Éditer">
                    <Pencil size={14} />
                  </Link>
                  <button onClick={() => setConfirmDelete(p)} className="p-1.5 rounded text-red-400 hover:bg-gray-800" aria-label="Supprimer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setCreateOpen(false)}>
          <div className="bg-gray-900 rounded-xl p-6 max-w-sm w-full border border-gray-800" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Nouveau plan</h2>
            <label className="block text-sm text-gray-400 mb-1">Nom</label>
            <input
              value={newNom}
              onChange={e => setNewNom(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              placeholder="Ex. Halle 1"
            />
            <label className="block text-sm text-gray-400 mb-1">Image</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-700 file:text-white hover:file:bg-gray-600 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg"
              >
                {creating ? 'Création…' : 'Créer'}
              </button>
              <button onClick={() => setCreateOpen(false)} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        destructive
        title="Supprimer le plan"
        message={`"${confirmDelete?.nom}" sera supprimé. Les exposants placés dessus seront détachés (pas supprimés).`}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
