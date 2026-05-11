import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { X, Download } from 'lucide-react'
import type { Exposant } from '../types'

interface Props {
  exposant: Exposant
  onClose: () => void
}

export function QrModal({ exposant, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const url = `${window.location.origin}/e/${exposant.uuid}`

  function download() {
    const canvas = containerRef.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `qr-${exposant.nom.toLowerCase().replace(/\s+/g, '-')}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl p-6 border border-gray-800 max-w-xs w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-semibold text-white">{exposant.nom}</h2>
            {exposant.entreprise && (
              <p className="text-sm text-gray-400">{exposant.entreprise}</p>
            )}
            {exposant.stand && (
              <p className="text-xs text-gray-500 mt-0.5">Stand {exposant.stand}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 -mt-1 -mr-1"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex justify-center bg-white rounded-xl p-4" ref={containerRef}>
          <QRCodeCanvas value={url} size={220} level="M" />
        </div>

        <p className="text-xs text-gray-500 text-center mt-3 break-all">{url}</p>

        <button
          onClick={download}
          className="w-full mt-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Download size={14} />
          Télécharger PNG
        </button>
      </div>
    </div>
  )
}
