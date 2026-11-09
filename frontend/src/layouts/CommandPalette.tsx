import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useErp } from '../context/ErpContext.tsx'
import { Dialog, DialogContent } from '../components/ui/dialog.tsx'
import { Input } from '../components/ui/input.tsx'
import { StatusBadge } from '../components/orders/StatusBadge.tsx'
import type { OrderStatus } from '../types/index.ts'

interface PaletteHit {
  id: string
  label: string
  hint: string
  to: string
  status?: OrderStatus
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { orders } = useErp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pages: PaletteHit[] = [
      { id: 'dashboard', label: 'Tổng quan', hint: 'Bảng điều khiển', to: '/dashboard' },
      { id: 'orders', label: 'Đơn hàng', hint: 'Danh sách', to: '/orders' },
      { id: 'inventory', label: 'Sổ cái kho', hint: 'Tồn và biến động', to: '/inventory/ledger' },
      { id: 'products', label: 'Sản phẩm', hint: 'Danh mục', to: '/products' },
      { id: 'customers', label: 'Khách hàng', hint: 'Danh bạ', to: '/customers' },
      { id: 'accounts', label: 'Tài khoản', hint: 'Người dùng', to: '/accounts' },
      { id: 'permissions', label: 'Phân quyền', hint: 'Ma trận vai trò', to: '/admin/roles-matrix' },
    ].filter((item) => !q || item.label.toLowerCase().includes(q))
    const matches: PaletteHit[] = orders
      .filter((order) => !q || order.code.toLowerCase().includes(q) || order.customerName.toLowerCase().includes(q))
      .slice(0, 8)
      .map((order) => ({ id: `order-${order.id}`, label: order.code, hint: order.customerName, to: `/orders/${order.code}`, status: order.status }))
    return [...pages, ...matches]
  }, [orders, query])

  useEffect(() => {
    setCursor(0)
  }, [query, open])

  function go(to: string) {
    navigate(to)
    onClose()
    setQuery('')
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) { setQuery(''); onClose() } }}>
      <DialogContent title="Tìm trong FlowState" description="Đơn hàng, khách, hoặc màn hình. Esc để đóng.">
        <Input
          autoFocus
          value={query}
          placeholder="Mã đơn, khách hàng, tồn kho"
          aria-label="Tìm kiếm"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setCursor((value) => Math.min(results.length - 1, value + 1))
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              setCursor((value) => Math.max(0, value - 1))
            }
            if (event.key === 'Enter' && results[cursor]) {
              event.preventDefault()
              go(results[cursor].to)
            }
          }}
        />
        <ul className="mt-2 max-h-72 overflow-auto">
          {results.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                className={`flex h-9 w-full items-center justify-between rounded-md px-2 text-left ${index === cursor ? 'bg-slate-100' : ''}`}
                onMouseEnter={() => setCursor(index)}
                onClick={() => go(item.to)}
              >
                <span>
                  <span className="font-mono text-[12px] font-medium tracking-tight text-ink">{item.label}</span>
                  <span className="ml-2 text-[12px] text-slate-500">{item.hint}</span>
                </span>
                {item.status ? <StatusBadge status={item.status} /> : null}
              </button>
            </li>
          ))}
          {results.length === 0 ? <li className="px-2 py-4 text-center text-slate-500">Không có kết quả.</li> : null}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
