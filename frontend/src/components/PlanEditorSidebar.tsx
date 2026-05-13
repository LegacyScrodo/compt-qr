// frontend/src/components/PlanEditorSidebar.tsx
import type { Exposant } from '../types'
import { MapPin, X } from 'lucide-react'

interface Props {
  toPlace: Exposant[]
  placed: Exposant[]
  selectedId: number | null
  onSelect: (id: number | null) => void
  onDetach: (id: number) => void
}

export function PlanEditorSidebar({ toPlace, placed, selectedId, onSelect, onDetach }: Props) {
  return (
    <aside className="w-full sm:w-72 sm:max-w-72 bg-gray-900 border-l border-gray-800 flex flex-col">
      <div className="p-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-white">À PLACER ({toPlace.length})</h3>
        <p className="text-xs text-gray-500 mt-1">
          Sélectionnez un exposant puis cliquez sur le plan pour le placer.
        </p>
      </div>
      <div className="overflow-y-auto max-h-64">
        {toPlace.length === 0 && (
          <p className="p-3 text-xs text-gray-500">Tous les exposants actifs sont placés.</p>
        )}
        {toPlace.map(e => (
          <button
            key={e.id}
            onClick={() => onSelect(selectedId === e.id ? null : e.id ?? null)}
            className={`w-full text-left px-3 py-2 text-sm border-b border-gray-800 hover:bg-gray-800 ${
              selectedId === e.id ? 'bg-blue-900/40 text-white' : 'text-gray-300'
            }`}
          >
            <div className="font-medium truncate">{e.nom}</div>
            {e.entreprise && <div className="text-xs text-gray-500 truncate">{e.entreprise}</div>}
          </button>
        ))}
      </div>
      <div className="p-3 border-t border-b border-gray-800">
        <h3 className="text-sm font-semibold text-white">SUR CE PLAN ({placed.length})</h3>
      </div>
      <div className="overflow-y-auto flex-1">
        {placed.map(e => (
          <div key={e.id} className="flex items-center justify-between px-3 py-2 text-sm border-b border-gray-800 text-gray-300">
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate flex items-center gap-1">
                <MapPin size={12} className="text-blue-400" />
                {e.nom}
              </div>
              {e.stand && <div className="text-xs text-gray-500">Stand {e.stand}</div>}
            </div>
            <button
              onClick={() => onDetach(e.id!)}
              aria-label={`Retirer ${e.nom} du plan`}
              className="p-1 text-gray-500 hover:text-red-400"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
