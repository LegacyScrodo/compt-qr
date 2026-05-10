import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthGuard } from './AuthGuard'
import { AuthContext } from '../hooks/useAuth'
import type { AuthUser } from '../types'

function wrap(user: AuthUser | null, path = '/admin') {
  return render(
    <AuthContext.Provider value={{ user, loading: false, setUser: () => {} }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<div>login</div>} />
          <Route path="/admin" element={
            <AuthGuard role="admin"><div>admin content</div></AuthGuard>
          } />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

it('affiche le contenu pour l\'admin authentifié', () => {
  wrap({ role: 'admin', email: 'a@b.ch', id: 1 })
  expect(screen.getByText('admin content')).toBeInTheDocument()
})

it('redirige vers /login si non authentifié', () => {
  wrap(null)
  expect(screen.getByText('login')).toBeInTheDocument()
})

it('redirige vers /login si mauvais rôle', () => {
  wrap({ role: 'staff', email: 'a@b.ch', id: 2 })
  expect(screen.getByText('login')).toBeInTheDocument()
})
