import { useState, useEffect, useRef, FormEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../../api'
import type { Exposant } from '../../types'
import { ImageUpload } from '../../components/ImageUpload'
import { useToast } from '../../components/Toast'

const EMPTY: Omit<Exposant, 'uuid' | 'id'> = {
  nom: '', entreprise: null, stand: null, email: null,
  telephone: null, site_web: null, description: null,
  logo_url: null, logo_file: null, statut: 'actif',
}

export function ExposantForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof EMPTY, string>>>({})
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!isEdit) return
    api.exposants.getById(Number(id))
      .then(data => setForm({
        nom: data.nom,
        entreprise: data.entreprise,
        stand: data.stand,
        email: data.email,
        telephone: data.telephone,
        site_web: data.site_web,
        description: data.description,
        logo_url: data.logo_url,
        logo_file: data.logo_file,
        statut: data.statut,
      }))
      .catch(() => toast.show('error', 'Exposant introuvable'))
  }, [id, isEdit])

  function set(field: keyof typeof EMPTY, value: string | null) {
    setForm(prev => ({ ...prev, [field]: value || null }))
  }

  function validateField(field: keyof typeof EMPTY, value: string | null): string | undefined {
    if (field === 'nom') {
      if (!value || !value.trim()) return 'Le nom est obligatoire'
      if (value.length > 100) return 'Maximum 100 caractères'
    }
    if (field === 'email' && value) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email invalide'
    }
    if (field === 'site_web' && value) {
      try { new URL(value) } catch { return 'URL invalide (ex. https://exemple.ch)' }
    }
    if (field === 'telephone' && value) {
      if (!/^[+\d\s()\-.]+$/.test(value)) return 'Numéro invalide'
    }
    return undefined
  }

  function handleBlur(field: keyof typeof EMPTY) {
    const value = form[field] as string | null
    const err = validateField(field, value)
    setFieldErrors(prev => ({ ...prev, [field]: err }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    // Validate all fields
    const errors: Partial<Record<keyof typeof EMPTY, string>> = {}
    ;(Object.keys(EMPTY) as Array<keyof typeof EMPTY>).forEach(key => {
      const v = form[key] as string | null
      const err = validateField(key, v)
      if (err) errors[key] = err
    })

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      // Focus first invalid
      const first = (Object.keys(errors) as Array<keyof typeof EMPTY>)[0]
      const input = formRef.current?.querySelector(`[name="${first}"]`) as HTMLElement | null
      input?.focus()
      return
    }

    setSaving(true)
    try {
      let saved: Exposant
      if (isEdit) {
        saved = await api.exposants.update(Number(id), form)
      } else {
        saved = await api.exposants.create(form)
      }
      if (logoFile && saved.id) {
        await api.exposants.uploadLogo(saved.id, logoFile)
      }
      toast.show('success', isEdit ? 'Exposant mis à jour' : 'Exposant créé')
      navigate('/admin/exposants')
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
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/exposants" aria-label="Retour à la liste" className="text-gray-400 hover:text-white">←</Link>
        <h1 className="text-xl font-bold">{isEdit ? 'Modifier l\'exposant' : 'Nouvel exposant'}</h1>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-6 space-y-5 border border-gray-800">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Nom *</label>
            <input
              type="text"
              name="nom"
              value={form.nom}
              onChange={e => set('nom', e.target.value)}
              onBlur={() => handleBlur('nom')}
              aria-invalid={fieldErrors.nom ? 'true' : undefined}
              aria-describedby={fieldErrors.nom ? 'nom-error' : undefined}
              className={inputClass(!!fieldErrors.nom)}
            />
            {fieldErrors.nom && (
              <p id="nom-error" role="alert" className="text-xs text-red-400 mt-1">
                {fieldErrors.nom}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Entreprise / Stand</label>
            <input
              type="text"
              name="entreprise"
              value={form.entreprise ?? ''}
              onChange={e => set('entreprise', e.target.value)}
              onBlur={() => handleBlur('entreprise')}
              aria-invalid={fieldErrors.entreprise ? 'true' : undefined}
              aria-describedby={fieldErrors.entreprise ? 'entreprise-error' : undefined}
              className={inputClass(!!fieldErrors.entreprise)}
            />
            {fieldErrors.entreprise && (
              <p id="entreprise-error" role="alert" className="text-xs text-red-400 mt-1">
                {fieldErrors.entreprise}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Numéro de stand</label>
            <input
              type="text"
              name="stand"
              value={form.stand ?? ''}
              onChange={e => set('stand', e.target.value)}
              onBlur={() => handleBlur('stand')}
              aria-invalid={fieldErrors.stand ? 'true' : undefined}
              aria-describedby={fieldErrors.stand ? 'stand-error' : undefined}
              className={inputClass(!!fieldErrors.stand)}
            />
            {fieldErrors.stand && (
              <p id="stand-error" role="alert" className="text-xs text-red-400 mt-1">
                {fieldErrors.stand}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              name="email"
              value={form.email ?? ''}
              onChange={e => set('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              autoComplete="off"
              aria-invalid={fieldErrors.email ? 'true' : undefined}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              className={inputClass(!!fieldErrors.email)}
            />
            {fieldErrors.email && (
              <p id="email-error" role="alert" className="text-xs text-red-400 mt-1">
                {fieldErrors.email}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Téléphone</label>
            <input
              type="tel"
              name="telephone"
              value={form.telephone ?? ''}
              onChange={e => set('telephone', e.target.value)}
              onBlur={() => handleBlur('telephone')}
              autoComplete="off"
              aria-invalid={fieldErrors.telephone ? 'true' : undefined}
              aria-describedby={fieldErrors.telephone ? 'telephone-error' : undefined}
              className={inputClass(!!fieldErrors.telephone)}
            />
            {fieldErrors.telephone && (
              <p id="telephone-error" role="alert" className="text-xs text-red-400 mt-1">
                {fieldErrors.telephone}
              </p>
            )}
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Site web</label>
            <input
              type="url"
              name="site_web"
              value={form.site_web ?? ''}
              onChange={e => set('site_web', e.target.value)}
              onBlur={() => handleBlur('site_web')}
              autoComplete="off"
              aria-invalid={fieldErrors.site_web ? 'true' : undefined}
              aria-describedby={fieldErrors.site_web ? 'site_web-error' : undefined}
              className={inputClass(!!fieldErrors.site_web)}
            />
            {fieldErrors.site_web && (
              <p id="site_web-error" role="alert" className="text-xs text-red-400 mt-1">
                {fieldErrors.site_web}
              </p>
            )}
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Description courte</label>
            <textarea
              name="description"
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value)}
              onBlur={() => handleBlur('description')}
              aria-invalid={fieldErrors.description ? 'true' : undefined}
              aria-describedby={fieldErrors.description ? 'description-error' : undefined}
              rows={3}
              className={inputClass(!!fieldErrors.description) + ' resize-none'}
            />
            {fieldErrors.description && (
              <p id="description-error" role="alert" className="text-xs text-red-400 mt-1">
                {fieldErrors.description}
              </p>
            )}
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Statut</label>
            <select value={form.statut} onChange={e => setForm(prev => ({ ...prev, statut: e.target.value as 'actif' | 'inactif' }))}
              className={inputClass(false)}>
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Logo</label>
            <ImageUpload
              currentUrl={form.logo_url}
              currentFile={form.logo_file}
              onUrlChange={url => set('logo_url', url)}
              onFileSelect={setLogoFile}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors">
            {saving ? 'Enregistrement...' : (isEdit ? 'Mettre à jour' : 'Créer')}
          </button>
          <Link to="/admin/exposants"
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
