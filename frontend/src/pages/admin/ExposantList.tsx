import { useEffect, useState, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { Search, ArrowUp, ArrowDown, ArrowUpDown, Plus, Download, Upload as UploadIcon } from 'lucide-react'
import { api } from '../../api'
import type { Exposant } from '../../types'
import { StatusBadge } from '../../components/StatusBadge'
import { Skeleton } from '../../components/Skeleton'
import { StatsBar } from '../../components/StatsBar'
import { QrCode } from 'lucide-react'
import { QrModal } from '../../components/QrModal'
import { useToast } from '../../components/Toast'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ImportCsvModal } from '../../components/ImportCsvModal'

type SortKey = 'nom' | 'entreprise' | 'stand' | 'statut'
type SortDir = 'asc' | 'desc'
type StatusFilter = 'all' | 'actif' | 'inactif'

export function ExposantList() {
  const [exposants, setExposants] = useState<Exposant[]>([])
  const [loading, setLoading] = useState(true)
  const [qrExposant, setQrExposant] = useState<Exposant | null>(null)
  const toast = useToast()
  const [confirmDelete, setConfirmDelete] = useState<Exposant | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const [searchParams, setSearchParams] = useSearchParams()
  const urlQ = searchParams.get('q') ?? ''
  const urlStatut = (searchParams.get('statut') as StatusFilter) ?? 'all'
  const urlSort = (searchParams.get('sort') as SortKey) ?? 'nom'
  const urlDir = (searchParams.get('dir') as SortDir) ?? 'asc'

  const [searchInput, setSearchInput] = useState(urlQ)
  const [search, setSearch] = useState(urlQ)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.exposants.list().then(setExposants).finally(() => setLoading(false))
  }, [])

  // Debounce 300ms: searchInput → search → URL
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (searchInput) next.set('q', searchInput)
        else next.delete('q')
        return next
      }, { replace: true })
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput, setSearchParams])

  // Cmd+K / Ctrl+K → focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function setStatusFilter(value: StatusFilter) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value === 'all') next.delete('statut')
      else next.set('statut', value)
      return next
    }, { replace: true })
  }

  function toggleSort(key: SortKey) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (urlSort === key) {
        if (urlDir === 'asc') next.set('dir', 'desc')
        else { next.delete('sort'); next.delete('dir') }
      } else {
        next.set('sort', key)
        next.set('dir', 'asc')
      }
      return next
    }, { replace: true })
  }

  const filteredAndSorted = useMemo(() => {
    const q = search.toLowerCase()
    const filtered = exposants.filter(e => {
      const matchesQ = !q
        || e.nom.toLowerCase().includes(q)
        || (e.entreprise ?? '').toLowerCase().includes(q)
        || (e.stand ?? '').toLowerCase().includes(q)
      const matchesStatus = urlStatut === 'all' || e.statut === urlStatut
      return matchesQ && matchesStatus
    })

    const sorted = [...filtered].sort((a, b) => {
      const av = (a[urlSort] ?? '').toString().toLowerCase()
      const bv = (b[urlSort] ?? '').toString().toLowerCase()
      if (av === bv) return 0
      const cmp = av < bv ? -1 : 1
      return urlDir === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [exposants, search, urlStatut, urlSort, urlDir])

  const hasFilters = search !== '' || urlStatut !== 'all'

  function resetFilters() {
    setSearchInput('')
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  async function handleDelete() {
    if (!confirmDelete?.id) return
    const exposant = confirmDelete
    setConfirmDelete(null)
    try {
      await api.exposants.delete(exposant.id!)
      setExposants(prev => prev.filter(e => e.id !== exposant.id))
      toast.show('success', `"${exposant.nom}" supprimé`)
    } catch {
      toast.show('error', 'Erreur lors de la suppression')
    }
  }

  async function exportPdf() {
    try {
      const res = await api.exposants.exportPdf()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'compt-qr-badges.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.show('error', 'Erreur lors de l\'export PDF')
    }
  }

  async function exportCsv() {
    try {
      const res = await api.exposants.exportCsv()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'exposants.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.show('error', 'Erreur lors de l\'export CSV')
    }
  }

  if (loading) return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-7 w-36" />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-gray-800 flex items-center gap-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )

  const emptyState = (
    <div className="text-center py-16 px-4">
      {exposants.length === 0 ? (
        <>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-800 mb-4">
            <Plus size={24} className="text-gray-400" />
          </div>
          <h3 className="text-white font-semibold mb-1">Aucun exposant pour le moment</h3>
          <p className="text-sm text-gray-400 mb-5">Ajoutez votre premier exposant pour générer son badge QR.</p>
          <Link
            to="/admin/exposants/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
          >
            <Plus size={16} />
            Créer le premier exposant
          </Link>
        </>
      ) : (
        <>
          <p className="text-gray-400 mb-3">Aucun résultat pour ces filtres.</p>
          <button
            onClick={resetFilters}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Réinitialiser les filtres
          </button>
        </>
      )}
    </div>
  )

  return (
    <div>
      <StatsBar exposants={exposants} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold">
          Exposants <span className="text-gray-400 font-normal">({filteredAndSorted.length}{hasFilters ? ` / ${exposants.length}` : ''})</span>
        </h1>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            <UploadIcon size={14} />
            Importer
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            <Download size={14} />
            CSV
          </button>
          <button
            onClick={exportPdf}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            PDF
          </button>
          <Link to="/admin/exposants/new"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">
            <Plus size={14} />
            Ajouter
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {([
          { value: 'all' as const, label: 'Tous' },
          { value: 'actif' as const, label: 'Actifs' },
          { value: 'inactif' as const, label: 'Inactifs' },
        ]).map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              urlStatut === opt.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Rechercher par nom, entreprise ou stand…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-16 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <kbd className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-1 px-1.5 py-0.5 rounded border border-gray-700 bg-gray-800 text-[10px] text-gray-400">
          <span>⌘</span>K
        </kbd>
      </div>

      {/* Desktop table - visible from sm: */}
      <div className="hidden sm:block bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                {([
                  { key: 'nom' as const, label: 'Nom' },
                  { key: 'entreprise' as const, label: 'Entreprise' },
                  { key: 'stand' as const, label: 'Stand' },
                  { key: 'statut' as const, label: 'Statut' },
                ]).map(col => (
                  <th key={col.key} className="px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">
                    <button
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-white transition-colors"
                    >
                      {col.label}
                      {urlSort === col.key
                        ? (urlDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)
                        : <ArrowUpDown size={12} className="opacity-40" />
                      }
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredAndSorted.map(e => (
                <tr key={e.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{e.nom}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{e.entreprise ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{e.stand ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge statut={e.statut} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => setQrExposant(e)}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                        aria-label={`QR code de ${e.nom}`}
                      >
                        <QrCode size={16} />
                      </button>
                      <Link
                        to={`/admin/exposants/${e.id}`}
                        className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm text-blue-400 hover:text-blue-300 hover:bg-gray-800 transition-colors"
                      >
                        Éditer
                      </Link>
                      <button
                        onClick={() => setConfirmDelete(e)}
                        className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-gray-800 transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredAndSorted.length === 0 && emptyState}
      </div>

      {/* Mobile cards - visible < sm */}
      <div className="sm:hidden space-y-3">
        {filteredAndSorted.map(e => (
          <div key={e.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-white truncate">{e.nom}</div>
                {e.entreprise && <div className="text-sm text-gray-400 truncate">{e.entreprise}</div>}
              </div>
              <StatusBadge statut={e.statut} />
            </div>
            {e.stand && <div className="text-xs text-gray-500 mb-3">Stand {e.stand}</div>}
            <div className="flex items-center gap-2 pt-3 border-t border-gray-800">
              <button
                onClick={() => setQrExposant(e)}
                className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                aria-label={`QR code de ${e.nom}`}
              >
                <QrCode size={18} />
              </button>
              <Link
                to={`/admin/exposants/${e.id}`}
                className="flex-1 inline-flex items-center justify-center h-11 px-3 rounded-lg text-sm text-blue-400 hover:text-blue-300 bg-gray-800/50 hover:bg-gray-800 transition-colors"
              >
                Éditer
              </Link>
              <button
                onClick={() => setConfirmDelete(e)}
                className="inline-flex items-center justify-center h-11 px-3 rounded-lg text-sm text-red-400 hover:text-red-300 bg-gray-800/50 hover:bg-gray-800 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
        {filteredAndSorted.length === 0 && emptyState}
      </div>

      {qrExposant && (
        <QrModal exposant={qrExposant} onClose={() => setQrExposant(null)} />
      )}
      <ConfirmDialog
        open={confirmDelete !== null}
        destructive
        title="Supprimer l'exposant"
        message={`Cette action est irréversible. "${confirmDelete?.nom}" sera définitivement supprimé.`}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
      <ImportCsvModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          // Reload list
          api.exposants.list().then(setExposants)
        }}
      />
    </div>
  )
}
