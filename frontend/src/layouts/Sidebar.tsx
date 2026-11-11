import { Boxes, ClipboardList, Contact, LayoutDashboard, Package, PanelLeftClose, PanelLeftOpen, ShieldCheck, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Select } from '../components/ui/select.tsx'
import { cn } from '../lib/utils.ts'
import { useErp } from '../context/ErpContext.tsx'

const GROUPS = [
  {
    label: 'Vận hành',
    links: [
      { to: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
      { to: '/orders', label: 'Đơn hàng', icon: ClipboardList },
      { to: '/customers', label: 'Khách hàng', icon: Contact },
      { to: '/inventory/ledger', label: 'Tồn kho', icon: Boxes },
      { to: '/products', label: 'Sản phẩm', icon: Package },
    ],
  },
  {
    label: 'Hệ thống',
    links: [
      { to: '/accounts', label: 'Tài khoản', icon: Users },
      { to: '/admin/roles-matrix', label: 'Phân quyền', icon: ShieldCheck },
    ],
  },
]

export function Sidebar({ collapsed, onToggle, mobileOpen, onClose }: { collapsed: boolean; onToggle: () => void; mobileOpen: boolean; onClose: () => void }) {
  const { user, branchScope, setBranchScope, branches } = useErp()
  const locked = user?.branchId != null

  return (
    <>
      {mobileOpen ? <button type="button" className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" aria-label="Đóng menu" onClick={onClose} /> : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[232px] flex-col bg-white text-ink transition-[width,transform] lg:static lg:translate-x-0',
          collapsed && 'lg:w-[76px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className={cn('flex h-16 items-center gap-2.5 px-5', collapsed && 'lg:justify-center lg:px-0')}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink text-[12px] font-bold text-white">FS</span>
          <span className={cn('text-[15px] font-semibold tracking-tight', collapsed && 'lg:hidden')}>FlowState</span>
        </div>
        <nav className="min-h-0 flex-1 overflow-auto px-3">
          {GROUPS.map((group) => (
            <div key={group.label} className="mb-3">
              <p className={cn('px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400', collapsed && 'lg:sr-only')}>{group.label}</p>
              {group.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/dashboard'}
                  onClick={onClose}
                  title={link.label}
                  className={({ isActive }) => cn(
                    'mb-1 flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-slate-500',
                    collapsed && 'lg:justify-center lg:px-0',
                    isActive ? 'bg-[#eef0f3] text-ink' : 'hover:bg-[#f5f6f8]',
                  )}
                >
                  <link.icon className="h-4 w-4 shrink-0" />
                  <span className={cn(collapsed && 'lg:hidden')}>{link.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className={cn('mt-4 px-5', collapsed && 'lg:hidden')}>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400" htmlFor="branch-switch">
            Chi nhánh
          </label>
          <Select
            id="branch-switch"
            className="h-10 w-full rounded-xl border-0 bg-[#f5f6f8] pl-3 disabled:bg-[#f5f6f8]"
            value={branchScope === 'all' ? 'all' : String(branchScope)}
            disabled={locked}
            onChange={(event) => setBranchScope(event.target.value === 'all' ? 'all' : Number(event.target.value))}
          >
            <option value="all">Tất cả chi nhánh</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </Select>
        </div>
        <div className={cn('mt-auto px-5 py-4', collapsed && 'lg:hidden')}>
          <p className="truncate text-[13px] font-semibold text-ink">{user?.name}</p>
          <p className="mt-0.5 text-[12px] text-slate-400">{user?.roleLabel}</p>
        </div>
        <button type="button" className="hidden h-12 items-center justify-center text-slate-400 hover:text-ink lg:flex" onClick={onToggle} aria-label={collapsed ? 'Mở sidebar' : 'Thu sidebar'}>
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </aside>
    </>
  )
}
