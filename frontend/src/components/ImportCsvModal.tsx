import { useState, useRef, DragEvent } from 'react'
import { X, Upload, FileText, AlertCircle } from 'lucide-react'
import { api } from '../api'
import { useToast } from './Toast'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ImportCsvModal({ open, onClose, onSuccess }: Props) {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ inserted: number; skipped: number; errors: string[] } | null>(null)

  if (!open) return null

  function selectFile(f: File | undefined) {
    if (!f) return
    if (!/\.csv$/i.test(f.name)) {
      toast.show('error', 'Seuls les fichiers .csv sont acceptés')
      return
    }
    setFile(f)
    setResult(null)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    selectFile(e.dataTransfer.files[0])
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    try {
      const res = await api.exposants.importCsv(file)
      setResult(res)
      if (res.inserted > 0) {
        toast.show('success', `${res.inserted} exposant(s) importé(s)`)
        onSuccess()
      } else if (res.errors.length === 0 && res.skipped > 0) {
        toast.show('error', 'Aucun exposant inséré (toutes les lignes ignorées)')
      }
    } catch (err) {
      toast.show('error', err instanceof Error ? err.message : 'Erreur lors de l\'import')
    } finally {
      setUploading(false)
    }
  }

  function reset() {
    setFile(null)
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-gray-900 rounded-2xl p-6 border border-gray-800 max-w-md w-full animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-semibold text-white">Importer des exposants</h2>
            <p className="text-sm text-gray-400 mt-0.5">Fichier CSV avec colonne <code className="text-gray-300">nom</code> obligatoire.</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-gray-400 hover:text-white p-1 -mt-1 -mr-1">
            <X size={20} />
          </button>
        </div>

        {!result && !file && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-blue-500 bg-blue-500/5' : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            <Upload size={28} className="text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-white mb-1">Glissez-déposez votre fichier CSV</p>
            <p className="text-xs text-gray-500">ou cliquez pour parcourir</p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => selectFile(e.target.files?.[0])}
            />
          </div>
        )}

        {file && !result && (
          <div className="bg-gray-800 rounded-lg p-3 flex items-center gap-3 mb-4">
            <FileText size={20} className="text-gray-400" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">{file.name}</div>
              <div className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} Ko</div>
            </div>
            <button onClick={reset} aria-label="Retirer" className="text-gray-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
        )}

        {result && (
          <div className="space-y-3 mb-4">
            <div className="bg-green-950 border border-green-800 rounded-lg p-3 text-sm text-green-300">
              <strong>{result.inserted}</strong> exposant(s) importé(s)
              {result.skipped > 0 && <span className="text-gray-400"> · {result.skipped} ligne(s) ignorée(s)</span>}
            </div>
            {result.errors.length > 0 && (
              <div className="bg-red-950 border border-red-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-red-300 mb-2">
                  <AlertCircle size={14} />
                  <span>{result.errors.length} erreur(s)</span>
                </div>
                <ul className="text-xs text-red-200 space-y-0.5 max-h-32 overflow-y-auto">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          {!result ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
              >
                {uploading ? 'Import…' : 'Importer'}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
