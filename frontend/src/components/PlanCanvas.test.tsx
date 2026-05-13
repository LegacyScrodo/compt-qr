import { render, screen, fireEvent } from '@testing-library/react'
import { PlanCanvas } from './PlanCanvas'

const baseMarkers = [
  { id: 1, uuid: 'u1', stand: '1', statut: 'actif' as const, pos_x: 10, pos_y: 20 },
  { id: 2, uuid: 'u2', stand: '2', statut: 'inactif' as const, pos_x: 70, pos_y: 80 },
]

it('affiche tous les marqueurs en mode view', () => {
  render(<PlanCanvas mode="view" imageSrc="/test.png" markers={baseMarkers} />)
  expect(screen.getByText('1')).toBeInTheDocument()
  expect(screen.getByText('2')).toBeInTheDocument()
})

it('appelle onMarkerClick avec l\'id en mode view', () => {
  const onClick = vi.fn()
  render(<PlanCanvas mode="view" imageSrc="/x.png" markers={baseMarkers} onMarkerClick={onClick} />)
  fireEvent.click(screen.getByText('1'))
  expect(onClick).toHaveBeenCalledWith(1)
})

it('appelle onPlaceAt en mode edit quand on clique sur l\'image vide', () => {
  const onPlace = vi.fn()
  const { container } = render(
    <PlanCanvas mode="edit" imageSrc="/x.png" markers={baseMarkers} onPlaceAt={onPlace} />
  )
  const layer = container.querySelector('[data-testid="plan-click-layer"]') as HTMLElement
  Object.defineProperty(layer, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }),
  })
  fireEvent.click(layer, { clientX: 50, clientY: 75 })
  expect(onPlace).toHaveBeenCalledWith(50, 75)
})

it('met en évidence un marqueur via highlight', () => {
  const { container } = render(
    <PlanCanvas mode="view" imageSrc="/x.png" markers={baseMarkers} highlightId={1} />
  )
  const buttons = container.querySelectorAll('button')
  expect(buttons[0].className).toMatch(/animate-pulse/)
  expect(buttons[1].className).not.toMatch(/animate-pulse/)
})
