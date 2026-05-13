import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../../api'
import type { Exposant } from '../../types'
import { Mail, Phone, Globe, SearchX, Eye, MapPin } from 'lucide-react'
import { Avatar } from '../../components/Avatar'
import { useAuth } from '../../hooks/useAuth'

const EVENT_COLOR = import.meta.env.VITE_EVENT_COLOR ?? '#1e1b4b'
const EVENT_NAME = import.meta.env.VITE_EVENT_NAME ?? 'Comptoir'

export function PublicCard() {
  const { uuid } = useParams()
  const [exposant, setExposant] = useState<Exposant | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start pt-8 px-4 pb-16">
        <div className="w-full max-w-sm mb-6">
          <div className="h-7 w-28 mx-auto bg-gray-200 rounded-full animate-pulse" />
        </div>
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="h-2 bg-gray-200" />
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gray-200 animate-pulse flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
              </div>
            </div>
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !exposant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <SearchX className="mx-auto mb-4 text-gray-300" size={48} strokeWidth={1.5} />
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

      {user?.role === 'admin' && (
        <div className="w-full max-w-sm mb-3 print:hidden">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs font-medium">
            <Eye size={12} />
            Aperçu admin — visible publiquement
          </div>
        </div>
      )}

      {/* Carte */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Bande couleur événement */}
        <div className="h-2" style={{ backgroundColor: EVENT_COLOR }} />

        <div className="p-6">
          {/* Logo / Avatar */}
          <div className="flex items-center gap-4 mb-5">
            <Avatar name={exposant.nom} logo={logo} size={64} />
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

          {exposant.plan_id != null && (
            <Link
              to={`/plan?highlight=${exposant.uuid}`}
              className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 mb-5"
            >
              <MapPin size={16} />
              Voir sur le plan
            </Link>
          )}

          {/* Contacts */}
          <div className="space-y-3">
            {exposant.email && (
              <a href={`mailto:${exposant.email}`}
                className="flex items-center gap-3 text-sm text-gray-700 hover:text-gray-900 group">
                <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                  <Mail size={16} className="text-gray-500" />
                </span>
                <span>{exposant.email}</span>
              </a>
            )}
            {exposant.telephone && (
              <a href={`tel:${exposant.telephone}`}
                className="flex items-center gap-3 text-sm text-gray-700 hover:text-gray-900 group">
                <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                  <Phone size={16} className="text-gray-500" />
                </span>
                <span>{exposant.telephone}</span>
              </a>
            )}
            {exposant.site_web && (
              <a href={exposant.site_web} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-gray-700 hover:text-gray-900 group">
                <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                  <Globe size={16} className="text-gray-500" />
                </span>
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
