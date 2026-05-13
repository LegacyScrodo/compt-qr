import { useRef, MouseEvent, useState, useEffect } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { PlanMarker } from './PlanMarker'

interface Marker {
  id: number
  uuid: string
  stand: string | null
  statut: 'actif' | 'inactif'
  pos_x: number | null
  pos_y: number | null
}

interface ViewProps {
  mode: 'view'
  imageSrc: string
  markers: Marker[]
  highlightId?: number | null
  onMarkerClick?: (id: number) => void
}

interface EditProps {
  mode: 'edit'
  imageSrc: string
  markers: Marker[]
  highlightId?: number | null
  onMarkerClick?: (id: number) => void
  onPlaceAt?: (x: number, y: number) => void
  onMoveMarker?: (id: number, x: number, y: number) => void
  onMoveEnd?: (id: number, x: number, y: number) => void
}

type Props = ViewProps | EditProps

function isEditProps(p: Props): p is EditProps {
  return p.mode === 'edit'
}

export function PlanCanvas(props: Props) {
  const { imageSrc, markers, highlightId, onMarkerClick } = props
  const layerRef = useRef<HTMLDivElement | null>(null)
  const [dragId, setDragId] = useState<number | null>(null)

  function pctFromEvent(clientX: number, clientY: number): { x: number; y: number } | null {
    const layer = layerRef.current
    if (!layer) return null
    const rect = layer.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
  }

  function handleLayerClick(e: MouseEvent) {
    if (!isEditProps(props) || !props.onPlaceAt) return
    if (e.target !== e.currentTarget) return // clic sur un marqueur, pas sur l'image
    const pos = pctFromEvent(e.clientX, e.clientY)
    if (pos) props.onPlaceAt(pos.x, pos.y)
  }

  // Drag d'un marqueur (edit mode)
  useEffect(() => {
    if (!isEditProps(props) || dragId === null) return
    let didMove = false
    let lastX = 0
    let lastY = 0
    const onMove = (ev: PointerEvent) => {
      const pos = pctFromEvent(ev.clientX, ev.clientY)
      if (pos && isEditProps(props)) {
        didMove = true
        lastX = pos.x
        lastY = pos.y
        if (props.onMoveMarker) props.onMoveMarker(dragId, pos.x, pos.y)
      }
    }
    const onUp = () => {
      if (didMove && isEditProps(props) && props.onMoveEnd) {
        props.onMoveEnd(dragId, lastX, lastY)
      }
      setDragId(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragId, props])

  const content = (
    <div
      ref={layerRef}
      data-testid="plan-click-layer"
      onClick={handleLayerClick}
      style={{ position: 'relative', display: 'inline-block', cursor: isEditProps(props) ? 'crosshair' : 'default' }}
    >
      <img src={imageSrc} alt="Plan" draggable={false} style={{ display: 'block', maxWidth: '100%', userSelect: 'none' }} />
      {markers.map(m => (
        m.pos_x !== null && m.pos_y !== null ? (
          <PlanMarker
            key={m.id}
            stand={m.stand}
            statut={m.statut}
            x={m.pos_x}
            y={m.pos_y}
            highlight={highlightId === m.id}
            onClick={onMarkerClick ? () => onMarkerClick(m.id) : undefined}
            onPointerDown={isEditProps(props) ? (e) => {
              e.stopPropagation()
              setDragId(m.id)
            } : undefined}
          />
        ) : null
      ))}
    </div>
  )

  if (isEditProps(props)) return content

  return (
    <TransformWrapper minScale={1} maxScale={4} doubleClick={{ disabled: false }} wheel={{ disabled: false }}>
      <TransformComponent wrapperStyle={{ width: '100%' }}>
        {content}
      </TransformComponent>
    </TransformWrapper>
  )
}
