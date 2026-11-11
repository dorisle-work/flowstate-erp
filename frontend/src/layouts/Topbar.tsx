import { Bell, Menu, Search } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu as Dropdown, MenuContent, MenuItem, MenuTrigger } from '../components/ui/dropdown-menu.tsx'
import { useErp } from '../context/ErpContext.tsx'

export function Topbar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, orders, notices, markNotice, markAllNotices, logout, webhookConfigured } = useErp()
  const orderKey = pathname.match(/^\/orders\/([^/]+)/)?.[1]
  const order = orders.find((item) => item.code === orderKey || String(item.id) === orderKey)
  const unread = notices.filter((notice) => notice.unread).length
  const title = pathname.startsWith('/inventory')
    ? 'Sổ cái kho'
    : pathname.startsWith('/orders')
      ? 'Đơn hàng'
      : pathname.startsWith('/products')
        ? 'Sản phẩm'
        : pathname.startsWith('/customers')
          ? 'Khách hàng'
        : pathname.startsWith('/accounts')
          ? 'Tài khoản'
          : pathname.startsWith('/permissions') || pathname.startsWith('/admin')
            ? 'Phân quyền'
            : 'Tổng quan'

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 bg-[#f5f6f8] px-4 lg:px-6">
      <button type="button" className="rounded-full p-2 text-slate-500 hover:bg-white lg:hidden" onClick={onMenu} aria-label="Mở menu">
        <Menu className="h-4 w-4" />
      </button>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-ink">{title}</p>
        {order ? <p className="truncate text-[12px] text-slate-400">{order.code}</p> : null}
      </div>
      <button type="button" onClick={onSearch} className="mx-auto hidden h-10 w-full max-w-md items-center gap-2 rounded-full bg-white px-4 text-[13px] text-slate-400 shadow-[0_8px_24px_rgba(15,23,42,0.06)] md:inline-flex">
        <Search className="h-4 w-4" />
        Tra cứu mã đơn, SKU...
        <span className="ml-auto text-[11px] text-slate-300">Ctrl K</span>
      </button>
      <div className="ml-auto flex items-center gap-1.5 md:ml-0">
        <button type="button" onClick={onSearch} className="rounded-full p-2 text-slate-500 hover:bg-white md:hidden" aria-label="Tìm kiếm">
          <Search className="h-4 w-4" />
        </button>
        <Dropdown>
          <MenuTrigger asChild>
            <button type="button" className="relative rounded-full p-2 text-slate-500 hover:bg-white" aria-label="Thông báo">
              <Bell className="h-4 w-4" />
              {unread > 0 ? <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-rose-500" /> : null}
            </button>
          </MenuTrigger>
          <MenuContent>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[12px] font-semibold text-slate-500">Thông báo</span>
              <button type="button" className="text-[11px] text-ink" onClick={markAllNotices}>Đã xem</button>
            </div>
            <p className="px-2 pb-1 text-[11px] text-slate-400">
              Telegram: {webhookConfigured ? 'đã cấu hình' : 'chưa cấu hình (chỉ ghi trong app)'}
            </p>
            {notices.length === 0 ? <p className="px-2 py-3 text-[12px] text-slate-500">Không có thông báo.</p> : null}
            {notices.map((notice) => (
              <MenuItem
                key={notice.id}
                onSelect={() => {
                  markNotice(notice.id)
                  if (notice.download || notice.href?.startsWith('blob:')) {
                    const anchor = document.createElement('a')
                    anchor.href = notice.href ?? '#'
                    anchor.download = notice.download ?? 'so-cai-kho.xls'
                    anchor.click()
                    return
                  }
                  if (notice.href?.startsWith('/')) {
                    navigate(notice.href)
                    return
                  }
                  if (notice.orderId) {
                    const target = orders.find((item) => item.id === notice.orderId)
                    navigate(`/orders/${target?.code ?? notice.orderId}`)
                  }
                }}
              >
                <span>
                  <span className="flex items-center gap-1.5">
                    {notice.unread ? <span className="h-1.5 w-1.5 rounded-full bg-[#3ddc97]" /> : null}
                    <span className="font-mono text-[12px] tracking-tight">{notice.title}</span>
                  </span>
                  <span className="block text-[11px] text-slate-500">{notice.body}</span>
                </span>
              </MenuItem>
            ))}
          </MenuContent>
        </Dropdown>
        <Dropdown>
          <MenuTrigger asChild>
            <button type="button" className="flex h-10 items-center gap-2 rounded-full px-1 hover:bg-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-white shadow-[0_6px_16px_rgba(28,31,38,0.18)]">
                {user?.name.slice(0, 1)}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-[12px] font-medium leading-none text-slate-800">{user?.name}</span>
                <span className="text-[10px] text-slate-400">{user?.roleLabel}</span>
              </span>
            </button>
          </MenuTrigger>
          <MenuContent>
            <div className="px-2 py-1.5">
              <p className="text-[13px] font-medium text-slate-800">{user?.name}</p>
              <p className="font-mono text-[11px] tracking-tight text-slate-500">{user?.email}</p>
            </div>
            <MenuItem onSelect={logout}>Đăng xuất</MenuItem>
          </MenuContent>
        </Dropdown>
      </div>
    </header>
  )
}
