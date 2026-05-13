import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { AuthGuard } from './components/AuthGuard'
import { LoginPage } from './pages/LoginPage'
import { AdminLayout } from './pages/admin/AdminLayout'
import { ExposantList } from './pages/admin/ExposantList'
import { ExposantForm } from './pages/admin/ExposantForm'
import { UserList } from './pages/admin/UserList'
import { UserForm } from './pages/admin/UserForm'
import { PlanList } from './pages/admin/PlanList'
import { PlanEditor } from './pages/admin/PlanEditor'
import { StaffLayout } from './pages/staff/StaffLayout'
import { Scanner } from './pages/staff/Scanner'
import { PublicCard } from './pages/public/PublicCard'
import { PlanView } from './pages/public/PlanView'
import { NotFound } from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/e/:uuid" element={<PublicCard />} />
          <Route path="/plan" element={<PlanView />} />
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
            <Route path="utilisateurs" element={<UserList />} />
            <Route path="utilisateurs/new" element={<UserForm />} />
            <Route path="utilisateurs/:id" element={<UserForm />} />
            <Route path="plans" element={<PlanList />} />
            <Route path="plans/:id" element={<PlanEditor />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
