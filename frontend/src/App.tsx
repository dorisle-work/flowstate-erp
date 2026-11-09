import { Navigate, Route, Routes } from 'react-router-dom'
import { OrderDetailPage } from './components/orders/OrderDetailPage.tsx'
import { OrdersListPage } from './components/orders/OrdersListPage.tsx'
import { useErp } from './context/ErpContext.tsx'
import { AppLayout } from './layouts/AppLayout.tsx'
import { AccountsPage } from './pages/AccountsPage.tsx'
import { CustomersPage } from './pages/CustomersPage.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { InventoryPage } from './pages/InventoryPage.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { PermissionsPage } from './pages/PermissionsPage.tsx'
import { ProductsPage } from './pages/ProductsPage.tsx'
import type { ReactNode } from 'react'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useErp()
  if (!ready) return <div className="grid h-screen place-items-center text-[13px] text-slate-500">Đang mở sổ...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={(
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        )}
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/orders" element={<OrdersListPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/inventory" element={<Navigate to="/inventory/ledger" replace />} />
        <Route path="/inventory/ledger" element={<InventoryPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/permissions" element={<Navigate to="/admin/roles-matrix" replace />} />
        <Route path="/admin/roles-matrix" element={<PermissionsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
