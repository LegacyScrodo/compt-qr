import { useState, useEffect, FormEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { api } from '../../api'

export function UserForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'staff'>('staff')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit) return
    api.users.list()
      .then(list => {
        const found = list.find(u => String(u.id) === id)
        if (found) { setEmail(found.email); setRole(found.role) }
        else setError('Utilisateur introuvable')
      })
      .catch(() => setError('Erreur lors du chargement'))
  }, [id, isEdit])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError("L'email est obligatoire"); return }
    if (!isEdit && !password) { setError('Le mot de passe est obligatoire'); return }
    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        await api.users.update(Number(id), { email, role, ...(password ? { password } : {}) })
      } else {
        await api.users.create({ email, password, role })
      }
      navigate('/admin/utilisateurs')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  const labelClass = "block text-sm text-gray-400 mb-1"

  return (
    <div className="max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/utilisateurs" className="text-gray-400 hover:text-white">←</Link>
        <h1 className="text-xl font-bold">
          {isEdit ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-6 space-y-4 border border-gray-800">
        {error && (
          <div className="bg-red-950 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className={labelClass}>Email *</label>
          <input
            type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            required className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>
            {isEdit ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required={!isEdit}
              minLength={8}
              className={inputClass + ' pr-10'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              aria-label={showPassword ? 'Masquer' : 'Afficher'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {!isEdit && <p className="text-xs text-gray-500 mt-1">Minimum 8 caractères</p>}
        </div>

        <div>
          <label className={labelClass}>Rôle *</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as 'admin' | 'staff')}
            className={inputClass}
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors">
            {saving ? 'Enregistrement...' : (isEdit ? 'Mettre à jour' : 'Créer')}
          </button>
          <Link to="/admin/utilisateurs"
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
