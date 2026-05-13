import { CSSProperties, forwardRef, MouseEvent, PointerEvent } from 'react'

interface Props {
  stand: string | null
  statut: 'actif' | 'inactif'
  x: number
  y: number
  highlight?: boolean
  onClick?: (e: MouseEvent) => void
  onPointerDown?: (e: PointerEvent) => void
  size?: number
  color?: string
}

export const PlanMarker = forwardRef<HTMLButtonElement, Props>(function PlanMarker(
  { stand, statut, x, y, highlight, onClick, onPointerDown, size = 32, color = '#1e1b4b' },
  ref,
) {
  const style: CSSProperties = {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    width: size,
    height: size,
    transform: 'translate(-50%, -50%)',
    backgroundColor: color,
  }
  const classes = [
    'rounded-full text-white text-xs font-semibold shadow-md flex items-center justify-center',
    'border-2 border-white cursor-pointer select-none touch-none',
    statut === 'inactif' ? 'opacity-50 grayscale' : '',
    highlight ? 'animate-pulse ring-4 ring-yellow-300' : '',
  ].filter(Boolean).join(' ')

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
      style={style}
      className={classes}
    >
      {stand ?? '—'}
    </button>
  )
})
