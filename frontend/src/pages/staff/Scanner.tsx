import { useState, useCallback } from 'react'
import { QrScanner } from '../../components/QrScanner'
import { api } from '../../api'
import type { Exposant } from '../../types'
import { CheckCircle, XCircle } from 'lucide-react'

const IS_DEV = import.meta.env.DEV

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
        <div className="mb-4">
          {result.ok
            ? <CheckCircle size={64} className="text-green-400 mx-auto" strokeWidth={1.5} />
            : <XCircle size={64} className="text-red-400 mx-auto" strokeWidth={1.5} />
          }
        </div>
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
      {IS_DEV && (
        <form
          className="w-full max-w-sm flex gap-2"
          onSubmit={e => {
            e.preventDefault()
            const input = (e.currentTarget.elements.namedItem('uuid') as HTMLInputElement).value.trim()
            const match = input.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
            if (match) handleScan(match[1])
          }}
        >
          <input
            name="uuid"
            placeholder="[DEV] UUID ou URL exposant"
            className="flex-1 bg-gray-800 border border-yellow-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-yellow-700 hover:bg-yellow-600 rounded-lg text-sm text-white transition-colors"
          >
            Simuler
          </button>
        </form>
      )}
    </div>
  )
}
