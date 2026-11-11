import * as Popover from '@radix-ui/react-popover'
import { CalendarRange, Lock, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AuditModalWithReason } from '../components/orders/AuditModalWithReason.tsx'
import { OrderDraftDialog } from '../components/orders/OrderDraftDialog.tsx'
import { StatusBadge } from '../components/orders/StatusBadge.tsx'
import { Button } from '../components/ui/button.tsx'
import { Input } from '../components/ui/input.tsx'
import { Select } from '../components/ui/select.tsx'
import { useErp } from '../context/ErpContext.tsx'
import { dashboardMetrics, funnelSteps, rangeBounds, scopedOrders, stockLedger } from '../lib/dashboard.ts'
import { dayKey, formatMoney, formatPercent, formatQty, formatStamp } from '../lib/format.ts'
import { actionsFor } from '../lib/status.ts'
import { cn } from '../lib/utils.ts'
import type { Order, OrderAction } from '../types/index.ts'
import type { LedgerKind, RangeKey } from '../types/erp.ts'

const PRESETS: Array<{ id: Exclude<RangeKey, 'custom'>; label: string }> = [
  { id: 'today', label: 'Hôm nay' },
  { id: '7d', label: '7 ngày qua' },
  { id: 'month', label: 'Tháng này' },
]

const LEDGER_LABEL: Record<LedgerKind, string> = {
  issue: 'Xuất đơn hàng',
  receipt: 'Nhập kho',
  purchase: 'Nhập kho NCC',
  adjust: 'Điều chỉnh',
  count: 'Kiểm kê cân bằng',
}

const LEDGER_TONE: Record<LedgerKind, string> = {
  issue: 'border-rose-200 bg-rose-50 text-rose-700',
  receipt: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  purchase: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  adjust: 'border-amber-200 bg-amber-50 text-amber-700',
  count: 'border-slate-200 bg-slate-50 text-slate-600',
}

export function DashboardPage() {
  const { user, orders, inventory, branchScope, setBranchScope, transition, createOrder, branches, movements } = useErp()
  const locked = user?.branchId != null
  const initial = rangeBounds('month')
  const [preset, setPreset] = useState<RangeKey>('month')
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [query, setQuery] = useState('')
  const [pulsing, setPulsing] = useState(false)
  const [rejecting, setRejecting] = useState<Order | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [draftOpen, setDraftOpen] = useState(false)

  useEffect(() => {
    if (!pulsing) return undefined
    const timer = window.setTimeout(() => setPulsing(false), 420)
    return () => window.clearTimeout(timer)
  }, [pulsing, branchScope])

  const visible = useMemo(() => scopedOrders(orders, branchScope, from, to), [orders, branchScope, from, to])
  const metrics = useMemo(
    () => dashboardMetrics(orders, inventory, branchScope, from, to),
    [orders, inventory, branchScope, from, to],
  )
  const funnel = useMemo(() => funnelSteps(visible), [visible])
  const ledger = useMemo(
    () => stockLedger(orders, inventory, branchScope, from, to, movements),
    [orders, inventory, branchScope, from, to, movements],
  )
  const branchOrders = useMemo(
    () => orders.filter((order) => branchScope === 'all' || order.branchId === branchScope),
    [orders, branchScope],
  )
  const orderBars = useMemo(() => dailySeries(branchOrders, () => 1), [branchOrders])
  const valueBars = useMemo(() => dailySeries(branchOrders, (order) => Number(order.totalAmount)), [branchOrders])
  const stockBars = useMemo(() => inventory
    .filter((row) => branchScope === 'all' || row.branchId === branchScope)
    .map((row) => Math.max(row.onHand - row.reserved, 0))
    .sort((left, right) => left - right)
    .slice(0, 7), [inventory, branchScope])
  const queue = useMemo(() => {
    const q = query.trim().toLowerCase()
    return visible
      .filter((order) => order.status === 'pending_approval' || order.status === 'approved')
      .filter((order) => {
        if (!q) return true
        return order.code.toLowerCase().includes(q)
          || order.customerName.toLowerCase().includes(q)
          || order.items.some((item) => item.sku.toLowerCase().includes(q) || item.name.toLowerCase().includes(q))
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, 10)
  }, [visible, query])

  function applyPreset(next: Exclude<RangeKey, 'custom'>) {
    const bounds = rangeBounds(next)
    setPreset(next)
    setFrom(bounds.from)
    setTo(bounds.to)
  }

  function changeBranch(value: string) {
    if (locked) return
    setPulsing(true)
    setBranchScope(value === 'all' ? 'all' : Number(value))
  }

  async function run(order: Order, action: OrderAction, note?: string) {
    const key = `${order.id}:${action}`
    if (busyKey) return
    setBusyKey(key)
    try {
      await transition(order.id, action, note)
      if (action === 'reject') setRejecting(null)
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <section className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <span className="sr-only">Chi nhánh</span>
          <Select
            className={cn(
              'h-10 rounded-full border-0 bg-white pl-3 shadow-[0_6px_16px_rgba(15,23,42,0.04)] disabled:bg-white',
              locked && 'select-lock',
            )}
            value={branchScope === 'all' ? 'all' : String(branchScope)}
            disabled={locked}
            onChange={(event) => changeBranch(event.target.value)}
          >
            <option value="all">Tất cả chi nhánh</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </Select>
          {locked ? <Lock className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /> : null}
        </label>
        <div className="flex flex-wrap items-center gap-1">
          {PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                'h-8 rounded-lg px-2.5 text-[12px] font-medium',
                preset === item.id ? 'bg-ink text-white shadow-[0_8px_18px_rgba(28,31,38,0.16)]' : 'bg-white text-slate-500 shadow-[0_6px_16px_rgba(15,23,42,0.04)]',
              )}
              onClick={() => applyPreset(item.id)}
            >
              {item.label}
            </button>
          ))}
          <Popover.Root>
            <Popover.Trigger asChild>
              <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[12px] font-medium text-slate-500 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
                <CalendarRange className="h-3.5 w-3.5" />
                {from} – {to}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content className="z-50 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-dock" sideOffset={6} align="start">
                <label className="block text-[12px] font-medium text-slate-600" htmlFor="dash-from">Từ ngày</label>
                <Input id="dash-from" type="date" className="mt-1" value={from} onChange={(event) => { setPreset('custom'); setFrom(event.target.value) }} />
                <label className="mt-2 block text-[12px] font-medium text-slate-600" htmlFor="dash-to">Đến ngày</label>
                <Input id="dash-to" type="date" className="mt-1" value={to} onChange={(event) => { setPreset('custom'); setTo(event.target.value) }} />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            id="dashboard-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tra cứu mã đơn, SKU... (Ctrl + K)"
            className="rounded-full border-0 pl-8 shadow-[0_6px_16px_rgba(15,23,42,0.04)]"
          />
        </div>
        {user?.permissions.includes('orders.create') ? (
          <Button className="h-10 rounded-full bg-ink px-4 text-[12px] text-white hover:bg-black" onClick={() => setDraftOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Tạo đơn hàng mới
          </Button>
        ) : null}
      </section>

      {pulsing ? <DashboardSkeleton /> : (
        <>
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="Đơn chờ duyệt"
              value={`${formatQty(metrics.pending)} đơn`}
              bars={orderBars}
              note={metrics.stalePending > 0
                ? `${formatQty(metrics.stalePending)} đơn quá 4 giờ`
                : 'Không có đơn quá 4 giờ'}
              noteClass={metrics.stalePending > 0 ? 'text-amber-600' : 'text-emerald-600'}
            />
            <Kpi
              label="Giá trị hàng giữ chỗ"
              value={formatMoney(metrics.reservedValue)}
              bars={valueBars}
              barClass="bg-[#5b8cff]"
              note={`${formatQty(metrics.reservedUnits)} đơn vị đang khóa`}
              noteClass="text-slate-400"
            />
            <Kpi
              label="Hiệu suất xuất kho"
              value={metrics.fulfillment === null ? '—' : formatPercent(metrics.fulfillment)}
              bars={funnel.map((step) => step.count)}
              barClass="bg-[#3ddc97]"
              note={metrics.fulfillmentDelta === null
                ? 'Chưa đủ mốc hôm qua'
                : `${metrics.fulfillmentDelta >= 0 ? '+' : ''}${formatPercent(metrics.fulfillmentDelta)} so với hôm qua`}
              noteClass={metrics.fulfillmentDelta !== null && metrics.fulfillmentDelta < 0 ? 'text-rose-600' : 'text-emerald-600'}
            />
            <Kpi
              label="Cảnh báo tồn kho an toàn"
              value={`${formatQty(metrics.safetySkus)} SKU`}
              bars={stockBars.length > 0 ? stockBars : [0]}
              barClass="bg-[#f07167]"
              note={metrics.safetySkus > 0 ? 'Cần đề xuất nhập hàng' : 'Đang trên ngưỡng 20'}
              noteClass={metrics.safetySkus > 0 ? 'text-rose-600' : 'text-emerald-600'}
            />
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-5">
            <article className="rounded-[20px] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)] xl:col-span-3">
              <h2 className="text-[16px] font-semibold text-ink">Phễu trạng thái đơn</h2>
              <div className="mt-5 flex h-52 items-end gap-3">
                {funnel.map((step) => {
                  const peak = Math.max(...funnel.map((item) => item.count), 1)
                  return (
                    <div key={step.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                      <span className="text-[12px] font-semibold text-ink">{formatQty(step.count)}</span>
                      <div className="flex h-36 w-full items-end justify-center">
                        <div className={cn('w-10 max-w-full rounded-t-2xl', step.bar)} style={{ height: `${step.count === 0 ? 0 : Math.max((step.count / peak) * 100, 12)}%` }} />
                      </div>
                      <span className="text-center text-[11px] leading-tight text-slate-400">{step.label}</span>
                    </div>
                  )
                })}
              </div>
            </article>
            <article className="rounded-[20px] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)] xl:col-span-2">
              <h2 className="text-[16px] font-semibold text-ink">Nhật ký biến động kho</h2>
              {ledger.length === 0 ? (
                <p className="mt-3 text-[13px] text-slate-500">Chưa có biến động kho trong kỳ này.</p>
              ) : (
                <ul className="mt-2 max-h-[280px] space-y-2 overflow-auto pr-1">
                  {ledger.map((entry) => (
                    <li key={entry.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-100 pb-2 last:border-b-0">
                      <div className="min-w-0">
                        <span className={cn('inline-flex h-5 items-center rounded border px-1.5 text-[11px] font-medium', LEDGER_TONE[entry.kind])}>
                          {LEDGER_LABEL[entry.kind]}
                        </span>
                        <p className="mt-1 truncate text-[13px] font-medium text-ink">{entry.sku}</p>
                        <p className="truncate text-[11px] text-slate-500">{entry.productName}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn('font-mono text-[13px] font-semibold tabular-nums', entry.delta < 0 ? 'text-rose-600' : 'text-emerald-700')}>
                          {entry.delta > 0 ? `+${formatQty(entry.delta)}` : formatQty(entry.delta)}
                        </p>
                        <p className="font-mono text-[11px] tabular-nums text-slate-500">còn {formatQty(entry.balanceAfter)}</p>
                        <p className="font-mono text-[11px] tabular-nums text-slate-400">{formatStamp(entry.at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>

          <section className="overflow-hidden rounded-[20px] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-[16px] font-semibold text-ink">Đơn cần xử lý</h2>
              <p className="text-[12px] text-slate-500">{formatQty(queue.length)} đơn chờ duyệt hoặc chờ xuất</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-y border-slate-100 text-[12px] font-medium text-slate-400">
                    <th className="h-10 px-3 font-semibold">Mã đơn</th>
                    <th className="h-10 px-3 text-center font-semibold">Thời gian tạo</th>
                    <th className="h-10 px-3 font-semibold">Khách hàng</th>
                    <th className="h-10 px-3 text-right font-semibold">Giá trị</th>
                    <th className="h-10 px-3 text-center font-semibold">Trạng thái</th>
                    <th className="h-10 px-3 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-[13px] text-slate-500">Không có đơn cần xử lý trong kỳ này.</td>
                    </tr>
                  ) : queue.map((order) => {
                    const actions = user ? actionsFor(user, order) : []
                    const rowBusy = busyKey?.startsWith(`${order.id}:`) ?? false
                    return (
                      <tr key={order.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="h-10 px-3">
                          <Link to={`/orders/${order.code}`} className="font-mono text-[13px] font-semibold text-ink hover:underline">{order.code}</Link>
                        </td>
                        <td className="h-10 px-3 text-center font-mono text-[12px] tabular-nums text-slate-600">{formatStamp(order.createdAt)}</td>
                        <td className="h-10 max-w-[240px] truncate px-3 text-[13px] text-ink">{order.customerName} · {order.branchName}</td>
                        <td className="h-10 px-3 text-right font-mono text-[13px] font-medium tabular-nums">{formatMoney(order.totalAmount)}</td>
                        <td className="h-10 px-3 text-center"><StatusBadge status={order.status} /></td>
                        <td className="h-10 px-3">
                          <div className="flex justify-end gap-1">
                            {actions.includes('approve') ? (
                              <button type="button" className="h-7 rounded-md bg-emerald-50 px-2 text-[12px] font-medium text-emerald-700 disabled:opacity-50" disabled={rowBusy} onClick={() => void run(order, 'approve')}>
                                {busyKey === `${order.id}:approve` ? 'Đang ghi nhận...' : 'Phê duyệt'}
                              </button>
                            ) : null}
                            {actions.includes('dispatch') ? (
                              <button type="button" className="h-7 rounded-md bg-emerald-50 px-2 text-[12px] font-medium text-emerald-700 disabled:opacity-50" disabled={rowBusy} onClick={() => void run(order, 'dispatch')}>
                                {busyKey === `${order.id}:dispatch` ? 'Đang xuất kho...' : 'Xuất kho'}
                              </button>
                            ) : null}
                            {actions.includes('reject') ? (
                              <button type="button" className="h-7 rounded-md bg-rose-50 px-2 text-[12px] font-medium text-rose-700 disabled:opacity-50" disabled={rowBusy} onClick={() => setRejecting(order)}>
                                Từ chối
                              </button>
                            ) : null}
                            <Link to={`/orders/${order.code}`} className="inline-flex h-7 items-center rounded-md border border-slate-200 px-2 text-[12px] font-medium text-slate-600">Chi tiết</Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <AuditModalWithReason
        action={rejecting ? 'reject' : null}
        pending={busyKey?.endsWith(':reject') ?? false}
        onClose={() => { if (!busyKey) setRejecting(null) }}
        onConfirm={(note) => { if (rejecting) void run(rejecting, 'reject', note) }}
      />

      <OrderDraftDialog
        open={draftOpen}
        onClose={() => setDraftOpen(false)}
        onSubmit={async (input) => { await createOrder(input) }}
      />
    </div>
  )
}

function dailySeries(orders: Order[], score: (order: Order) => number): number[] {
  const end = new Date()
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end)
    date.setDate(end.getDate() - (6 - index))
    const key = dayKey(date.toISOString())
    return orders.filter((order) => dayKey(order.createdAt) === key).reduce((sum, order) => sum + score(order), 0)
  })
}

function Kpi({
  label,
  value,
  bars,
  note,
  noteClass,
  barClass = 'bg-ink',
}: {
  label: string
  value: string
  bars: number[]
  note: string
  noteClass: string
  barClass?: string
}) {
  const peak = Math.max(...bars, 1)
  return (
    <article className="rounded-[20px] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <p className="text-[12px] font-medium text-slate-400">{label}</p>
      <p className="mt-2 text-[28px] font-semibold tracking-tight text-ink">{value}</p>
      <div className="mt-4 flex h-10 items-end gap-1">
        {bars.map((bar, index) => (
          <div
            key={index}
            className={cn('min-w-0 flex-1 rounded-t-sm', barClass)}
            style={{ height: `${bar === 0 ? 8 : Math.max((bar / peak) * 100, 12)}%` }}
          />
        ))}
      </div>
      <p className={cn('mt-3 text-[12px]', noteClass)}>{note}</p>
    </article>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Đang tải số liệu chi nhánh">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-[124px] animate-pulse rounded-[20px] bg-slate-200/80" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="h-64 animate-pulse rounded-[20px] bg-slate-200/80 xl:col-span-3" />
        <div className="h-64 animate-pulse rounded-[20px] bg-slate-200/80 xl:col-span-2" />
      </div>
      <div className="h-72 animate-pulse rounded-[20px] bg-slate-200/80" />
    </div>
  )
}
