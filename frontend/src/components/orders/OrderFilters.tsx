import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BRANCHES } from '../../data/catalog.ts'
import { cn } from '../../lib/utils.ts'
import type { OrderStatus } from '../../types/index.ts'
import { Input } from '../ui/input.tsx'
import { Select } from '../ui/select.tsx'

export type StatusTab = 'all' | Extract<OrderStatus, 'pending_approval' | 'approved' | 'cancelled'>

const TABS: Array<{ id: StatusTab; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending_approval', label: 'Chờ duyệt' },
  { id: 'approved', label: 'Đã duyệt' },
  { id: 'cancelled', label: 'Đã hủy' },
]

interface OrderFiltersProps {
  search: string
  onSearch: (value: string) => void
  status: StatusTab
  onStatus: (value: StatusTab) => void
  counts: Record<StatusTab, number>
  from: string
  to: string
  onFrom: (value: string) => void
  onTo: (value: string) => void
  minAmount: string
  maxAmount: string
  onMinAmount: (value: string) => void
  onMaxAmount: (value: string) => void
  branchScope: number | 'all'
  onBranch: (value: number | 'all') => void
  branchLocked: boolean
}

export function OrderFilters(props: OrderFiltersProps) {
  const [draft, setDraft] = useState(props.search)

  useEffect(() => {
    const timer = window.setTimeout(() => props.onSearch(draft), 300)
    return () => window.clearTimeout(timer)
  }, [draft, props.onSearch])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            id="order-search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Mã đơn hoặc tên khách hàng"
            className="pl-8"
            aria-label="Tìm đơn hàng"
          />
        </div>
        <label className="flex items-center gap-1.5 text-[12px] text-slate-500">
          Từ
          <Input type="date" value={props.from} onChange={(event) => props.onFrom(event.target.value)} className="w-[148px] font-mono" />
        </label>
        <label className="flex items-center gap-1.5 text-[12px] text-slate-500">
          Đến
          <Input type="date" value={props.to} onChange={(event) => props.onTo(event.target.value)} className="w-[148px]" />
        </label>
        <label className="flex items-center gap-1.5 text-[12px] text-slate-500">
          Từ giá
          <Input type="number" min={0} value={props.minAmount} onChange={(event) => props.onMinAmount(event.target.value)} className="w-28" placeholder="0" />
        </label>
        <label className="flex items-center gap-1.5 text-[12px] text-slate-500">
          Đến giá
          <Input type="number" min={0} value={props.maxAmount} onChange={(event) => props.onMaxAmount(event.target.value)} className="w-28" placeholder="∞" />
        </label>
        <label className="flex items-center gap-1.5 text-[12px] text-slate-500">
          Chi nhánh
          <Select
            className="h-8 w-auto rounded-md"
            value={props.branchScope === 'all' ? 'all' : String(props.branchScope)}
            disabled={props.branchLocked}
            onChange={(event) => props.onBranch(event.target.value === 'all' ? 'all' : Number(event.target.value))}
          >
            <option value="all">Tất cả chi nhánh</option>
            {BRANCHES.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </Select>
        </label>
      </div>
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Lọc trạng thái">
        {TABS.map((tab) => {
          const active = props.status === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => props.onStatus(tab.id)}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium',
                active ? 'bg-ink font-semibold text-white shadow-sm' : 'text-slate-500 hover:bg-white',
              )}
            >
              {tab.label}
              <span className="text-[11px] font-semibold tabular-nums">{props.counts[tab.id]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
