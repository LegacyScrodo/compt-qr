import { useState, useEffect, useRef, FormEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { api } from '../../api'
import { useToast } from '../../components/Toast'

export function UserForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'staff'>('staff')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!isEdit) return
    api.users.list()
      .then(list => {
        const found = list.find(u => String(u.id) === id)
        if (found) { setEmail(found.email); setRole(found.role) }
        else toast.show('error', 'Utilisateur introuvable')
      })
      .catch(() => toast.show('error', 'Erreur lors du chargement'))
  }, [id, isEdit])

  function validateField(field: 'email' | 'password', value: string): string | undefined {
    if (field === 'email') {
      if (!value.trim()) return "L'email est obligatoire"
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email invalide'
    }
    if (field === 'password') {
      if (!isEdit && !value) return 'Mot de passe obligatoire'
      if (value && value.length < 8) return 'Minimum 8 caractères'
    }
    return undefined
  }

  function handleBlur(field: 'email' | 'password', value: string) {
    setFieldErrors(prev => ({ ...prev, [field]: validateField(field, value) }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const errors: typeof fieldErrors = {}
    const emailErr = validateField('email', email)
    if (emailErr) errors.email = emailErr
    const passwordErr = validateField('password', password)
    if (passwordErr) errors.password = passwordErr

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      const first = Object.keys(errors)[0] as 'email' | 'password'
      const input = formRef.current?.querySelector(`[name="${first}"]`) as HTMLElement | null
      input?.focus()
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        await api.users.update(Number(id), { email, role, ...(password ? { password } : {}) })
      } else {
        await api.users.create({ email, password, role })
      }
      toast.show('success', isEdit ? 'Utilisateur mis à jour' : 'Utilisateur créé')
      navigate('/admin/utilisateurs')
    } catch (err) {
      toast.show('error', err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = (hasError: boolean) =>
    `w-full bg-gray-800 border ${hasError ? 'border-red-500' : 'border-gray-700'} rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 ${hasError ? 'focus:ring-red-500' : 'focus:ring-blue-500'}`
  const labelClass = "block text-sm text-gray-400 mb-1"

  return (
    <div className="max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/utilisateurs" aria-label="Retour à la liste" className="text-gray-400 hover:text-white">←</Link>
        <h1 className="text-xl font-bold">
          {isEdit ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
        </h1>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-6 space-y-4 border border-gray-800">
        <div>
          <label className={labelClass}>Email *</label>
          <input
            type="email"
            name="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onBlur={() => handleBlur('email', email)}
            required
            autoComplete="off"
            aria-invalid={fieldErrors.email ? 'true' : undefined}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            className={inputClass(!!fieldErrors.email)}
          />
          {fieldErrors.email && (
            <p id="email-error" role="alert" className="text-xs text-red-400 mt-1">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>
            {isEdit ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onBlur={() => handleBlur('password', password)}
              required={!isEdit}
              minLength={8}
              autoComplete="new-password"
              aria-invalid={fieldErrors.password ? 'true' : undefined}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              className={inputClass(!!fieldErrors.password) + ' pr-10'}
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
          {fieldErrors.password ? (
            <p id="password-error" role="alert" className="text-xs text-red-400 mt-1">{fieldErrors.password}</p>
          ) : (
            !isEdit && <p className="text-xs text-gray-500 mt-1">Minimum 8 caractères</p>
          )}
        </div>

        <div>
          <label className={labelClass}>Rôle *</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as 'admin' | 'staff')}
            className={inputClass(false)}
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
