// frontend/src/pages/admin/PlanEditor.tsx
import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Image as ImageIcon, Trash2 } from 'lucide-react'
import { api } from '../../api'
import type { Exposant, PlanWithExposants } from '../../types'
import { PlanCanvas } from '../../components/PlanCanvas'
import { PlanEditorSidebar } from '../../components/PlanEditorSidebar'
import { useToast } from '../../components/Toast'
import { ConfirmDialog } from '../../components/ConfirmDialog'

export function PlanEditor() {
  const { id } = useParams<{ id: string }>()
  const planId = Number(id)
  const navigate = useNavigate()
  const toast = useToast()
  const [plan, setPlan] = useState<PlanWithExposants | null>(null)
  const [allExposants, setAllExposants] = useState<Exposant[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  useEffect(() => {
    if (!planId) return
    Promise.all([api.plans.get(planId), api.exposants.list()])
      .then(([p, exps]) => {
        setPlan(p)
        setAllExposants(exps)
        setRenameValue(p.nom)
      })
      .catch(() => toast.show('error', 'Plan introuvable'))
  }, [planId])

  const toPlace = useMemo(() => {
    if (!plan) return []
    const placedIds = new Set(plan.exposants.map(e => e.id))
    return allExposants.filter(e => e.statut === 'actif' && !placedIds.has(e.id))
  }, [plan, allExposants])

  const placed = useMemo(() => {
    if (!plan) return []
    return allExposants.filter(e => plan.exposants.some(p => p.id === e.id))
  }, [plan, allExposants])

  async function placeAt(x: number, y: number) {
    if (selectedId == null || !plan) return
    try {
      await api.exposants.setPosition(selectedId, { plan_id: planId, pos_x: x, pos_y: y })
      const updated = await api.plans.get(planId)
      setPlan(updated)
      setSelectedId(null)
      toast.show('success', 'Exposant placé')
    } catch (e) {
      toast.show('error', e instanceof Error ? e.message : 'Erreur')
    }
  }

  async function moveMarker(id: number, x: number, y: number) {
    // optimistic
    setPlan(prev => prev ? { ...prev, exposants: prev.exposants.map(m => m.id === id ? { ...m, pos_x: x, pos_y: y } : m) } : prev)
  }

  async function commitMove(id: number) {
    if (!plan) return
    const m = plan.exposants.find(x => x.id === id)
    if (!m || m.pos_x == null || m.pos_y == null) return
    try {
      await api.exposants.setPosition(id, { plan_id: planId, pos_x: m.pos_x, pos_y: m.pos_y })
    } catch {
      toast.show('error', 'Erreur sauvegarde position')
    }
  }

  async function detach(id: number) {
    try {
      await api.exposants.setPosition(id, { plan_id: null })
      const updated = await api.plans.get(planId)
      setPlan(updated)
    } catch {
      toast.show('error', 'Erreur')
    }
  }

  async function handleRename() {
    if (!plan) return
    try {
      const updated = await api.plans.update(plan.id, { nom: renameValue.trim() })
      setPlan({ ...plan, nom: updated.nom })
      setRenaming(false)
      toast.show('success', 'Plan renommé')
    } catch {
      toast.show('error', 'Erreur')
    }
  }

  async function handleDelete() {
    if (!plan) return
    try {
      await api.plans.delete(plan.id)
      navigate('/admin/plans')
    } catch {
      toast.show('error', 'Erreur')
    }
  }

  if (!plan) return <div className="text-gray-400">Chargement…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Link to="/admin/plans" className="text-gray-400 hover:text-white" aria-label="Retour"><ArrowLeft size={18} /></Link>
          {renaming ? (
            <div className="flex items-center gap-1">
              <input
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
              />
              <button onClick={handleRename} className="text-sm text-blue-400 hover:text-blue-300">OK</button>
              <button onClick={() => { setRenaming(false); setRenameValue(plan.nom) }} className="text-sm text-gray-400">Annuler</button>
            </div>
          ) : (
            <h1 className="text-xl font-bold">
              {plan.nom}
              <button onClick={() => setRenaming(true)} className="ml-2 text-sm text-blue-400 hover:text-blue-300">Renommer</button>
            </h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm cursor-pointer">
            <ImageIcon size={14} />
            Remplacer image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                try {
                  await api.plans.replaceImage(plan.id, f)
                  const updated = await api.plans.get(plan.id)
                  setPlan(updated)
                  toast.show('success', 'Image remplacée')
                } catch (err) {
                  toast.show('error', err instanceof Error ? err.message : 'Erreur')
                }
              }}
            />
          </label>
          <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded-lg text-sm">
            <Trash2 size={14} />
            Supprimer
          </button>
        </div>
      </div>

      {selectedId != null && (
        <div className="mb-3 p-2 bg-blue-900/30 border border-blue-800 text-blue-200 text-sm rounded-lg">
          Mode placement actif — cliquez sur le plan où placer l'exposant.
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-3 overflow-auto">
          <PlanCanvas
            mode="edit"
            imageSrc={plan.image_file}
            markers={plan.exposants}
            onPlaceAt={placeAt}
            onMoveMarker={(id, x, y) => moveMarker(id, x, y)}
            onMoveEnd={(id, _x, _y) => commitMove(id)}
          />
        </div>
        <PlanEditorSidebar
          toPlace={toPlace}
          placed={placed}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDetach={detach}
        />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        destructive
        title="Supprimer le plan"
        message={`"${plan.nom}" sera supprimé. Les exposants placés dessus seront détachés.`}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
