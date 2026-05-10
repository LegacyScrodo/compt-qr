import { useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface Props {
  onScan: (uuid: string) => void
  active: boolean
}

export function QrScanner({ onScan, active }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const divId = 'qr-reader-container'

  const handleScan = useCallback((text: string) => {
    const match = text.match(/\/e\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
    if (match) onScan(match[1])
  }, [onScan])

  useEffect(() => {
    if (!active) return

    const scanner = new Html5Qrcode(divId)
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 260, height: 260 } },
      handleScan,
      undefined
    ).catch(console.error)

    return () => {
      scanner.stop().catch(() => {})
      scannerRef.current = null
    }
  }, [active, handleScan])

  return (
    <div id={divId} className="w-full rounded-xl overflow-hidden" />
  )
}
