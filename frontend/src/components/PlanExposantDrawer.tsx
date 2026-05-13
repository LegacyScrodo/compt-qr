// frontend/src/components/PlanExposantDrawer.tsx
import { Link } from 'react-router-dom'
import { X, ExternalLink } from 'lucide-react'

interface Props {
  exposant: {
    uuid: string
    nom: string
    entreprise: string | null
    stand: string | null
    statut: 'actif' | 'inactif'
  } | null
  onClose: () => void
}

export function PlanExposantDrawer({ exposant, onClose }: Props) {
  if (!exposant) return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 animate-slide-up">
      <div className="bg-white rounded-t-2xl shadow-xl mx-auto max-w-sm p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-900">{exposant.nom}</h3>
            {exposant.entreprise && (
              <p className="text-sm text-gray-600">{exposant.entreprise}</p>
            )}
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        <div className="flex items-center gap-2 mb-4">
          {exposant.stand && (
            <span className="inline-block bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded-full">
              Stand {exposant.stand}
            </span>
          )}
          {exposant.statut === 'inactif' && (
            <span className="inline-block bg-gray-200 text-gray-600 text-xs font-medium px-2 py-1 rounded-full">
              Inactif
            </span>
          )}
        </div>
        <Link
          to={`/e/${exposant.uuid}`}
          className="inline-flex items-center justify-center w-full gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Voir la fiche complète
          <ExternalLink size={14} />
        </Link>
      </div>
    </div>
  )
}
