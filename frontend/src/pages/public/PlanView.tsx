import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SearchX } from 'lucide-react'
import { api } from '../../api'
import type { Plan, PlanWithExposants } from '../../types'
import { PlanCanvas } from '../../components/PlanCanvas'
import { PlanExposantDrawer } from '../../components/PlanExposantDrawer'

const EVENT_NAME = import.meta.env.VITE_EVENT_NAME ?? 'Comptoir'
const EVENT_COLOR = import.meta.env.VITE_EVENT_COLOR ?? '#1e1b4b'

export function PlanView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [plans, setPlans] = useState<Plan[]>([])
  const [activePlan, setActivePlan] = useState<PlanWithExposants | null>(null)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [selectedExposantId, setSelectedExposantId] = useState<number | null>(null)
  const [highlightId, setHighlightId] = useState<number | null>(null)
  const highlightUuid = searchParams.get('highlight')

  useEffect(() => {
    api.plans.list().then(list => {
      setPlans(list)
      if (list.length > 0) setActiveId(list[0].id)
    })
  }, [])

  useEffect(() => {
    if (activeId == null) return
    api.plans.get(activeId).then(setActivePlan)
  }, [activeId])

  // Si ?highlight=:uuid présent, trouver le bon plan et y aller
  useEffect(() => {
    if (!highlightUuid || plans.length === 0) return
    let cancelled = false
    ;(async () => {
      for (const p of plans) {
        const full = await api.plans.get(p.id)
        if (cancelled) return
        const found = full.exposants.find(e => e.uuid === highlightUuid)
        if (found) {
          setActiveId(p.id)
          setActivePlan(full)
          setHighlightId(found.id ?? null)
          setSelectedExposantId(found.id ?? null)
          // clear le highlight après 4 secondes
          setTimeout(() => setHighlightId(null), 4000)
          return
        }
      }
    })()
    return () => { cancelled = true }
  }, [highlightUuid, plans])

  const selectedExposant = useMemo(() => {
    if (!activePlan || selectedExposantId == null) return null
    return activePlan.exposants.find(e => e.id === selectedExposantId) ?? null
  }, [activePlan, selectedExposantId])

  const filteredMarkers = useMemo(() => {
    if (!activePlan) return []
    if (!search.trim()) return activePlan.exposants
    const q = search.toLowerCase()
    return activePlan.exposants.filter(e =>
      e.nom.toLowerCase().includes(q) ||
      (e.entreprise ?? '').toLowerCase().includes(q) ||
      (e.stand ?? '').toLowerCase().includes(q)
    )
  }, [activePlan, search])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="px-4 py-3 text-center" style={{ backgroundColor: EVENT_COLOR }}>
        <h1 className="text-white text-sm font-semibold">{EVENT_NAME}</h1>
      </header>

      <div className="p-3 bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher un exposant…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {plans.length > 1 && (
        <div className="flex gap-1 px-3 py-2 bg-white border-b border-gray-200 overflow-x-auto">
          {plans.map(p => (
            <button
              key={p.id}
              onClick={() => { setActiveId(p.id); setSelectedExposantId(null); setSearchParams({}) }}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                activeId === p.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p.nom}
            </button>
          ))}
        </div>
      )}

      <main className="flex-1 flex items-center justify-center p-4">
        {!activePlan ? (
          <div className="text-center text-gray-500">
            <SearchX size={40} strokeWidth={1.5} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Aucun plan disponible</p>
          </div>
        ) : (
          <PlanCanvas
            mode="view"
            imageSrc={activePlan.image_file}
            markers={filteredMarkers}
            highlightId={highlightId}
            onMarkerClick={id => setSelectedExposantId(id)}
          />
        )}
      </main>

      <PlanExposantDrawer
        exposant={selectedExposant}
        onClose={() => setSelectedExposantId(null)}
      />
    </div>
  )
}
