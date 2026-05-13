import { render, screen } from '@testing-library/react'
import { PlanMarker } from './PlanMarker'

it('affiche le numéro de stand', () => {
  render(<PlanMarker stand="12" statut="actif" x={50} y={50} />)
  expect(screen.getByText('12')).toBeInTheDocument()
})

it('affiche un tiret si pas de stand', () => {
  render(<PlanMarker stand={null} statut="actif" x={10} y={20} />)
  expect(screen.getByText('—')).toBeInTheDocument()
})

it('applique la classe inactif quand statut=inactif', () => {
  const { container } = render(<PlanMarker stand="5" statut="inactif" x={0} y={0} />)
  expect(container.firstChild).toHaveClass('opacity-50')
})

it('applique la classe highlight quand highlight=true', () => {
  const { container } = render(<PlanMarker stand="5" statut="actif" x={0} y={0} highlight />)
  expect(container.firstChild).toHaveClass('animate-pulse')
})

it('positionne via inline style en pourcentage', () => {
  const { container } = render(<PlanMarker stand="5" statut="actif" x={42.5} y={67.8} />)
  const el = container.firstChild as HTMLElement
  expect(el.style.left).toBe('42.5%')
  expect(el.style.top).toBe('67.8%')
})
