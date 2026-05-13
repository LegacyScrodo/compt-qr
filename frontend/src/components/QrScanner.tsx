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

    let scanner: Html5Qrcode | null = null
    let started = false

    try {
      scanner = new Html5Qrcode(divId)
      scannerRef.current = scanner
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        handleScan,
        undefined
      ).then(() => { started = true }).catch(err => {
        console.error('Camera error:', err)
      })
    } catch (err) {
      console.error('Scanner init error:', err)
    }

    return () => {
      if (scanner && started) {
        scanner.stop().catch(() => {})
      } else if (scanner) {
        try { scanner.clear() } catch { /* ignore */ }
      }
      scannerRef.current = null
    }
  }, [active, handleScan])

  return (
    <div id={divId} style={{ width: '100%', minHeight: '300px' }} />
  )
}
