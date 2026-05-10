import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PublicCard } from './PublicCard'
import { vi } from 'vitest'
import * as apiModule from '../../api'

it('affiche la carte de visite pour un exposant valide', async () => {
  vi.spyOn(apiModule.api.exposants, 'get').mockResolvedValue({
    uuid: 'test-uuid',
    nom: 'Jean Dupont',
    entreprise: 'Horlogerie Dupont',
    stand: '12',
    email: 'jean@dupont.ch',
    telephone: '+41 21 000 00 01',
    site_web: 'https://dupont.ch',
    description: 'Maître horloger.',
    logo_url: null,
    logo_file: null,
    statut: 'actif',
  })

  render(
    <MemoryRouter initialEntries={['/e/test-uuid']}>
      <Routes>
        <Route path="/e/:uuid" element={<PublicCard />} />
      </Routes>
    </MemoryRouter>
  )

  await waitFor(() => {
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument()
    expect(screen.getByText('Horlogerie Dupont')).toBeInTheDocument()
    expect(screen.getByText('Stand 12')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /jean@dupont.ch/ })).toHaveAttribute('href', 'mailto:jean@dupont.ch')
  })
})

it('affiche un message d\'erreur pour UUID inconnu', async () => {
  vi.spyOn(apiModule.api.exposants, 'get').mockRejectedValue(new Error('Not found'))

  render(
    <MemoryRouter initialEntries={['/e/00000000-0000-0000-0000-000000000000']}>
      <Routes>
        <Route path="/e/:uuid" element={<PublicCard />} />
      </Routes>
    </MemoryRouter>
  )

  await waitFor(() => {
    expect(screen.getByText(/introuvable/i)).toBeInTheDocument()
  })
})
