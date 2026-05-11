import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-900 border border-gray-800 mb-4">
          <Compass size={28} className="text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Page introuvable</h1>
        <p className="text-gray-400 mb-6">L'URL que vous suivez ne correspond à aucune page.</p>
        <Link
          to="/login"
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}
