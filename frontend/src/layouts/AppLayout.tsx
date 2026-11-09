import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useErp } from '../context/ErpContext.tsx'
import { CommandPalette } from './CommandPalette.tsx'
import { Sidebar } from './Sidebar.tsx'
import { Topbar } from './Topbar.tsx'

export function AppLayout() {
  const { toasts } = useErp()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [palette, setPalette] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPalette((open) => !open)
        return
      }
      if (event.key === '/' && !typing) {
        event.preventDefault()
        if (location.pathname === '/orders') {
          document.getElementById('order-search')?.focus()
        } else if (location.pathname === '/dashboard') {
          document.getElementById('dashboard-search')?.focus()
        } else {
          setPalette(true)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-ink">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} onSearch={() => setPalette(true)} />
        <main className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
      <div className="pointer-events-none fixed right-4 top-14 z-50 flex w-72 flex-col gap-2">
        {toasts.map((toast) => (
          <p key={toast.id} className={`pointer-events-auto rounded-lg border px-3 py-2 text-[13px] shadow-dock ${toast.tone === 'err' ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}>
            {toast.message}
          </p>
        ))}
      </div>
    </div>
  )
}
