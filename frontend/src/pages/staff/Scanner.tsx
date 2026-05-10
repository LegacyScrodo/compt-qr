import { useState, useCallback } from 'react'
import { QrScanner } from '../../components/QrScanner'
import { api } from '../../api'
import { Exposant } from '../../types'

type Result = { ok: true; exposant: Exposant } | { ok: false; reason: string } | null

export function Scanner() {
  const [result, setResult] = useState<Result>(null)
  const [scanning, setScanning] = useState(true)

  const handleScan = useCallback(async (uuid: string) => {
    setScanning(false)
    try {
      const exposant = await api.exposants.get(uuid)
      if (exposant.statut === 'actif') {
        setResult({ ok: true, exposant })
      } else {
        setResult({ ok: false, reason: 'Exposant inactif' })
      }
    } catch {
      setResult({ ok: false, reason: 'QR code inconnu' })
    }

    // Retour auto au scanner après 3 secondes
    setTimeout(() => {
      setResult(null)
      setScanning(true)
    }, 3000)
  }, [])

  if (result) {
    return (
      <div className={`flex-1 min-h-[calc(100vh-56px)] flex flex-col items-center justify-center p-8 ${
        result.ok ? 'bg-green-950' : 'bg-red-950'
      }`}>
        <div className={`text-6xl mb-4`}>{result.ok ? '✅' : '❌'}</div>
        <div className={`text-3xl font-bold mb-3 ${result.ok ? 'text-green-300' : 'text-red-300'}`}>
          {result.ok ? 'AUTORISÉ' : 'REFUSÉ'}
        </div>
        {result.ok ? (
          <>
            <div className="text-2xl text-white font-semibold">{result.exposant.nom}</div>
            {result.exposant.entreprise && (
              <div className="text-lg text-green-300 mt-1">{result.exposant.entreprise}</div>
            )}
            {result.exposant.stand && (
              <div className="text-base text-green-400 mt-1">Stand {result.exposant.stand}</div>
            )}
          </>
        ) : (
          <div className="text-lg text-red-300">{result.reason}</div>
        )}
        <div className="mt-8 text-sm text-gray-500">Retour automatique dans 3 secondes...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center p-4 pt-8 gap-6">
      <p className="text-gray-300 text-sm">Pointez la caméra sur le QR code de l'exposant</p>
      <div className="w-full max-w-sm">
        <QrScanner onScan={handleScan} active={scanning} />
      </div>
    </div>
  )
}
