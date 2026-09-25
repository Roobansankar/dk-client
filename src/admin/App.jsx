import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { ToastProvider } from './lib/toast'
import { useTheme } from './lib/theme'
import { AppShell } from './components/Layout'
import { EmptyState, LoadingBlock } from './components/ui'
import { ShieldAlert } from 'lucide-react'
import LoginPage from './pages/Login'
import DashboardPage from './pages/Dashboard'
import AppointmentsPage from './pages/Appointments'
import AppointmentHistoryPage from './pages/AppointmentHistory'
import PaymentsPage from './pages/Payments'
import OfflineAppointmentNewPage from './pages/OfflineAppointmentNew'
import ServicesPage from './pages/Services'
import ProductsPage from './pages/Products'
import CombosPage from './pages/Combos'
import OrdersPage from './pages/Orders'
import StylistsPage from './pages/Stylists'
import StylistSetupPage from './pages/StylistSetup'
import PricingPlansPage from './pages/PricingPlans'
import GalleryPage from './pages/Gallery'
import VideosPage from './pages/Videos'
import ReviewsPage from './pages/Reviews'
import UsersPage from './pages/Users'
import RolesPage from './pages/Roles'
import SettingsPage from './pages/Settings'
import './styles/admin.css'

function RequirePermission({ perm, children }) {
  const { can } = useAuth()
  if (perm && !can(perm)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No access to this section"
        description="Your role doesn't include this permission. Ask a superadmin if you need it."
        className="min-h-[60svh]"
      />
    )
  }
  return children
}

function AdminRoutes() {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[var(--color-paper)]">
        <LoadingBlock label="Starting…" />
      </div>
    )
  }

  if (status === 'guest') {
    return (
      <Routes>
        <Route index element={<LoginPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    )
  }

  return (
    <AppShell>
      <Routes>
        <Route path="login" element={<Navigate to="/admin/dashboard" replace />} />
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <RequirePermission perm="dashboard.view">
              <DashboardPage />
            </RequirePermission>
          }
        />
        <Route
          path="appointments"
          element={
            <RequirePermission perm="appointments.view">
              <AppointmentsPage />
            </RequirePermission>
          }
        />
        <Route
          path="appointments/history"
          element={
            <RequirePermission perm="appointments.view">
              <AppointmentHistoryPage />
            </RequirePermission>
          }
        />
        <Route
          path="payments"
          element={
            <RequirePermission perm="payments.view">
              <PaymentsPage />
            </RequirePermission>
          }
        />
        <Route
          path="appointments/offline/new"
          element={
            <RequirePermission perm="appointments.offline">
              <OfflineAppointmentNewPage />
            </RequirePermission>
          }
        />
        <Route
          path="stylists"
          element={
            <RequirePermission perm="stylists.view">
              <StylistsPage />
            </RequirePermission>
          }
        />
        <Route
          path="stylists/:id/setup"
          element={
            <RequirePermission perm="stylists.view">
              <StylistSetupPage />
            </RequirePermission>
          }
        />
        <Route
          path="services/:gender"
          element={
            <RequirePermission perm="services.view">
              <ServicesPage />
            </RequirePermission>
          }
        />
        <Route path="services" element={<Navigate to="/admin/services/female" replace />} />
        <Route
          path="products"
          element={
            <RequirePermission perm="products.view">
              <ProductsPage />
            </RequirePermission>
          }
        />
        <Route
          path="combos"
          element={
            <RequirePermission perm="products.view">
              <CombosPage />
            </RequirePermission>
          }
        />
        <Route
          path="orders"
          element={
            <RequirePermission perm="orders.view">
              <OrdersPage />
            </RequirePermission>
          }
        />
        <Route
          path="pricing-plans"
          element={
            <RequirePermission perm="pricing.view">
              <PricingPlansPage />
            </RequirePermission>
          }
        />
        <Route
          path="gallery"
          element={
            <RequirePermission perm="gallery.view">
              <GalleryPage />
            </RequirePermission>
          }
        />
        <Route
          path="videos"
          element={
            <RequirePermission perm="videos.view">
              <VideosPage />
            </RequirePermission>
          }
        />
        <Route
          path="reviews"
          element={
            <RequirePermission perm="reviews.view">
              <ReviewsPage />
            </RequirePermission>
          }
        />
        <Route
          path="users"
          element={
            <RequirePermission perm="users.view">
              <UsersPage />
            </RequirePermission>
          }
        />
        <Route
          path="roles"
          element={
            <RequirePermission perm="roles.view">
              <RolesPage />
            </RequirePermission>
          }
        />
        <Route
          path="settings"
          element={
            <RequirePermission perm="settings.view">
              <SettingsPage />
            </RequirePermission>
          }
        />
        <Route
          path="*"
          element={<EmptyState title="Page not found" description="That route doesn't exist." />}
        />
      </Routes>
    </AppShell>
  )
}

/**
 * The admin area, mounted at `/admin/*` inside the public site's single React
 * app (see ../App.jsx). Scoped to its own `.admin-app` design system (see
 * styles/admin.css) and its own auth/toast providers — the public providers
 * (Gallery/Products/Catalogue/Stylists/Site) are never mounted here, so
 * visiting /admin never triggers their fetches.
 */
export default function AdminApp() {
  const { resolved } = useTheme()
  return (
    <div className="admin-app" data-theme={resolved}>
      <ToastProvider>
        <AuthProvider>
          <AdminRoutes />
        </AuthProvider>
      </ToastProvider>
    </div>
  )
}
