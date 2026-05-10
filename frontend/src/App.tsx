import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { AuthGuard } from './components/AuthGuard'
import { LoginPage } from './pages/LoginPage'
import { AdminLayout } from './pages/admin/AdminLayout'
import { ExposantList } from './pages/admin/ExposantList'
import { ExposantForm } from './pages/admin/ExposantForm'
import { StaffLayout } from './pages/staff/StaffLayout'
import { Scanner } from './pages/staff/Scanner'
import { PublicCard } from './pages/public/PublicCard'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/e/:uuid" element={<PublicCard />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/staff" element={<AuthGuard role="staff"><StaffLayout /></AuthGuard>}>
            <Route index element={<Navigate to="scan" replace />} />
            <Route path="scan" element={<Scanner />} />
          </Route>

          <Route path="/admin" element={<AuthGuard role="admin"><AdminLayout /></AuthGuard>}>
            <Route index element={<Navigate to="exposants" replace />} />
            <Route path="exposants" element={<ExposantList />} />
            <Route path="exposants/new" element={<ExposantForm />} />
            <Route path="exposants/:id" element={<ExposantForm />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
