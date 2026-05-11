import type { Exposant } from '../types'

interface Props { exposants: Exposant[] }

export function StatsBar({ exposants }: Props) {
  const actifs = exposants.filter(e => e.statut === 'actif').length
  const inactifs = exposants.length - actifs

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
        <div className="text-2xl font-bold text-white">{exposants.length}</div>
        <div className="text-xs text-gray-400 mt-0.5">Total</div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
        <div className="text-2xl font-bold text-green-400">{actifs}</div>
        <div className="text-xs text-gray-400 mt-0.5">Actifs</div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
        <div className="text-2xl font-bold text-red-400">{inactifs}</div>
        <div className="text-xs text-gray-400 mt-0.5">Inactifs</div>
      </div>
    </div>
  )
}
