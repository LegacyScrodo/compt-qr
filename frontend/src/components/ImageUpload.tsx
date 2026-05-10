import { useState, ChangeEvent } from 'react'

interface Props {
  currentUrl: string | null
  currentFile: string | null
  onUrlChange: (url: string) => void
  onFileSelect: (file: File | null) => void
}

export function ImageUpload({ currentUrl, currentFile, onUrlChange, onFileSelect }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const existing = preview ?? currentFile ?? currentUrl

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    onFileSelect(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = ev => setPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm text-gray-400 mb-1">URL du logo (externe)</label>
        <input
          type="url" value={currentUrl ?? ''} onChange={e => onUrlChange(e.target.value)}
          placeholder="https://exemple.ch/logo.png"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Ou uploader un fichier (max 5 MB)</label>
        <input
          type="file" accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFile}
          className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-700 file:text-white hover:file:bg-gray-600"
        />
      </div>
      {existing && (
        <img src={existing} alt="Logo" className="h-16 w-16 object-contain rounded border border-gray-700 bg-gray-800 p-1" />
      )}
    </div>
  )
}
