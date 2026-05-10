import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../api'
import type { Exposant } from '../../types'

const EVENT_COLOR = import.meta.env.VITE_EVENT_COLOR ?? '#1e1b4b'
const EVENT_NAME = import.meta.env.VITE_EVENT_NAME ?? 'Comptoir'

export function PublicCard() {
  const { uuid } = useParams()
  const [exposant, setExposant] = useState<Exposant | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uuid) return
    let mounted = true
    api.exposants.get(uuid)
      .then(data => { if (mounted) setExposant(data) })
      .catch(() => { if (mounted) setError(true) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [uuid])

  const logo = exposant?.logo_url ?? exposant?.logo_file

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400">Chargement...</div>
      </div>
    )
  }

  if (error || !exposant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-xl font-semibold text-gray-700">Exposant introuvable</h1>
          <p className="text-gray-500 mt-2 text-sm">Ce QR code ne correspond à aucun exposant.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start pt-8 px-4 pb-16">
      {/* En-tête événement */}
      <div className="w-full max-w-sm mb-6 text-center">
        <div className="inline-block px-4 py-1.5 rounded-full text-white text-xs font-semibold"
          style={{ backgroundColor: EVENT_COLOR }}>
          {EVENT_NAME}
        </div>
      </div>

      {/* Carte */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Bande couleur événement */}
        <div className="h-2" style={{ backgroundColor: EVENT_COLOR }} />

        <div className="p-6">
          {/* Logo / Avatar */}
          <div className="flex items-center gap-4 mb-5">
            {logo ? (
              <img src={logo} alt={exposant.nom}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                className="w-16 h-16 rounded-xl object-contain border border-gray-100 bg-gray-50 p-1 flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-2xl font-bold"
                style={{ backgroundColor: EVENT_COLOR }}>
                {exposant.nom.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{exposant.nom}</h1>
              {exposant.entreprise && (
                <p className="text-gray-500 text-sm mt-0.5">{exposant.entreprise}</p>
              )}
              {exposant.stand && (
                <p className="text-xs font-medium mt-1 px-2 py-0.5 rounded-full inline-block text-white"
                  style={{ backgroundColor: EVENT_COLOR }}>
                  Stand {exposant.stand}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          {exposant.description && (
            <p className="text-gray-600 text-sm mb-5 leading-relaxed">{exposant.description}</p>
          )}

          {/* Contacts */}
          <div className="space-y-3">
            {exposant.email && (
              <a href={`mailto:${exposant.email}`}
                className="flex items-center gap-3 text-sm text-gray-700 hover:text-gray-900 group">
                <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-base group-hover:bg-gray-200 transition-colors">📧</span>
                <span>{exposant.email}</span>
              </a>
            )}
            {exposant.telephone && (
              <a href={`tel:${exposant.telephone}`}
                className="flex items-center gap-3 text-sm text-gray-700 hover:text-gray-900 group">
                <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-base group-hover:bg-gray-200 transition-colors">📞</span>
                <span>{exposant.telephone}</span>
              </a>
            )}
            {exposant.site_web && (
              <a href={exposant.site_web} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-gray-700 hover:text-gray-900 group">
                <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-base group-hover:bg-gray-200 transition-colors">🌐</span>
                <span className="truncate">{exposant.site_web.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-gray-400">ComptQR · {EVENT_NAME}</p>
    </div>
  )
}
