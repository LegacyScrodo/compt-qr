import { Users, CheckCircle2, XCircle } from 'lucide-react'
import type { Exposant } from '../types'

interface Props { exposants: Exposant[] }

export function StatsBar({ exposants }: Props) {
  const actifs = exposants.filter(e => e.statut === 'actif').length
  const inactifs = exposants.length - actifs

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center">
          <Users size={18} className="text-gray-400" />
        </div>
        <div>
          <div className="text-2xl font-bold text-white leading-tight">{exposants.length}</div>
          <div className="text-xs text-gray-400">Total</div>
        </div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-green-950 flex items-center justify-center">
          <CheckCircle2 size={18} className="text-green-400" />
        </div>
        <div>
          <div className="text-2xl font-bold text-green-400 leading-tight">{actifs}</div>
          <div className="text-xs text-gray-400">Actifs</div>
        </div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-red-950 flex items-center justify-center">
          <XCircle size={18} className="text-red-400" />
        </div>
        <div>
          <div className="text-2xl font-bold text-red-400 leading-tight">{inactifs}</div>
          <div className="text-xs text-gray-400">Inactifs</div>
        </div>
      </div>
    </div>
  )
}
