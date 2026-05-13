import { useRef, useEffect, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { X, Download, Printer } from 'lucide-react'
import type { Exposant } from '../types'

interface Props {
  exposant: Exposant
  onClose: () => void
}

function useCircularLogo(src: string | null | undefined, size: number): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!src) { setDataUrl(null); return }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      // White circle background
      ctx.fillStyle = 'white'
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
      ctx.fill()
      // Clip to inner circle (padding of 10%)
      const pad = Math.round(size * 0.1)
      ctx.save()
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2 - pad, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2)
      ctx.restore()
      setDataUrl(canvas.toDataURL('image/png'))
    }
    img.onerror = () => setDataUrl(null)
    img.src = src
  }, [src, size])

  return dataUrl
}

export function QrModal({ exposant, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const url = `${window.location.origin}/e/${exposant.uuid}`

  const logoSrc = exposant.logo_url ?? exposant.logo_file ?? null
  const LOGO_SIZE = 66
  const logoDataUrl = useCircularLogo(logoSrc, LOGO_SIZE)

  function download() {
    const canvas = containerRef.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `qr-${exposant.nom.toLowerCase().replace(/\s+/g, '-')}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  function print() {
    window.print()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 print:bg-white flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        className="bg-gray-900 print:bg-white rounded-2xl print:rounded-none p-6 border border-gray-800 print:border-0 max-w-xs w-full animate-slide-up print:max-w-full print:w-full print:p-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="print:text-black">
            <h2 className="font-semibold text-white print:text-black">{exposant.nom}</h2>
            {exposant.entreprise && (
              <p className="text-sm text-gray-400 print:text-black">{exposant.entreprise}</p>
            )}
            {exposant.stand && (
              <p className="text-xs text-gray-500 print:text-black mt-0.5">Stand {exposant.stand}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 -mt-1 -mr-1 print:hidden"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex justify-center bg-white rounded-xl p-4" ref={containerRef}>
          <QRCodeCanvas
            value={url}
            size={220}
            level="H"
            imageSettings={logoDataUrl ? {
              src: logoDataUrl,
              height: LOGO_SIZE,
              width: LOGO_SIZE,
              excavate: true,
            } : undefined}
          />
        </div>

        <p className="text-xs text-gray-500 print:text-black text-center mt-3 break-all">{url}</p>

        <div className="flex gap-2 mt-4 print:hidden">
          <button
            onClick={download}
            className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download size={14} />
            Télécharger
          </button>
          <button
            onClick={print}
            className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Printer size={14} />
            Imprimer
          </button>
        </div>
      </div>
    </div>
  )
}
