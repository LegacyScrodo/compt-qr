import { useState, useEffect, FormEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../../api'
import { Exposant } from '../../types'
import { ImageUpload } from '../../components/ImageUpload'

const EMPTY: Omit<Exposant, 'uuid' | 'id'> = {
  nom: '', entreprise: null, stand: null, email: null,
  telephone: null, site_web: null, description: null,
  logo_url: null, logo_file: null, statut: 'actif',
}

export function ExposantForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState(EMPTY)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit) return
    api.exposants.list().then(list => {
      const found = list.find(e => String(e.id) === id)
      if (found) setForm(found)
      else setError('Exposant introuvable')
    }).catch(() => setError('Erreur lors du chargement'))
  }, [id, isEdit])

  function set(field: keyof typeof EMPTY, value: string | null) {
    setForm(prev => ({ ...prev, [field]: value || null }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.nom.trim()) { setError('Le nom est obligatoire'); return }
    setSaving(true)
    setError('')
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
      navigate('/admin/exposants')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  const labelClass = "block text-sm text-gray-400 mb-1"

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/exposants" className="text-gray-400 hover:text-white">←</Link>
        <h1 className="text-xl font-bold">{isEdit ? 'Modifier l\'exposant' : 'Nouvel exposant'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-6 space-y-5 border border-gray-800">
        {error && <div className="bg-red-950 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Nom *</label>
            <input type="text" value={form.nom} onChange={e => set('nom', e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Entreprise / Stand</label>
            <input type="text" value={form.entreprise ?? ''} onChange={e => set('entreprise', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Numéro de stand</label>
            <input type="text" value={form.stand ?? ''} onChange={e => set('stand', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Téléphone</label>
            <input type="tel" value={form.telephone ?? ''} onChange={e => set('telephone', e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Site web</label>
            <input type="url" value={form.site_web ?? ''} onChange={e => set('site_web', e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Description courte</label>
            <textarea value={form.description ?? ''} onChange={e => set('description', e.target.value)}
              rows={3} className={inputClass + ' resize-none'} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Statut</label>
            <select value={form.statut} onChange={e => setForm(prev => ({ ...prev, statut: e.target.value as 'actif' | 'inactif' }))}
              className={inputClass}>
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
