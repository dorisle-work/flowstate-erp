import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle, CheckCircle2, ChevronDown, Pencil, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useErp } from '../../context/ErpContext.tsx'
import { formatDate, formatMargin, formatMoney, formatQty } from '../../lib/format.ts'
import { actionsFor, canViewCost, stockShortages, stockTone, STATUS_LABEL } from '../../lib/status.ts'
import { cn } from '../../lib/utils.ts'
import type { OrderAction, OrderItem } from '../../types/index.ts'
import { Button } from '../ui/button.tsx'
import { Skeleton } from '../ui/skeleton.tsx'
import { ActionBar } from './ActionBar.tsx'
import { AuditModalWithReason } from './AuditModalWithReason.tsx'
import { CompactDataTable } from './CompactDataTable.tsx'
import { OrderDraftDialog } from './OrderDraftDialog.tsx'
import { OrderWorkflowStepper } from './OrderWorkflowStepper.tsx'
import { StatusBadge } from './StatusBadge.tsx'

export function OrderDetailPage() {
  const { id } = useParams()
  const { orders, loading, user, transition, updateOrder } = useErp()
  const order = orders.find((item) => item.code === id || String(item.id) === id)
  const [pending, setPending] = useState<OrderAction | null>(null)
  const [dialog, setDialog] = useState<Extract<OrderAction, 'reject' | 'cancel'> | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(true)
  const showCost = canViewCost(user)
  const canEditDraft = Boolean(order?.status === 'draft' && user?.permissions.some((slug) => slug === 'orders.create' || slug === 'orders.update'))

  const columns = useMemo<ColumnDef<OrderItem>[]>(() => [
    {
      accessorKey: 'sku',
      header: 'SKU',
      meta: { sticky: 'left', width: '96px' },
      cell: ({ row }) => <span className="font-mono text-[12px] font-medium tracking-tight">{row.original.sku}</span>,
    },
    { accessorKey: 'name', header: 'Sản phẩm' },
    {
      accessorKey: 'unitPrice',
      header: 'Đơn giá',
      meta: { align: 'right', width: '120px' },
      cell: ({ row }) => <span className="font-mono tracking-tight">{formatMoney(row.original.unitPrice)}</span>,
    },
    {
      accessorKey: 'quantity',
      header: 'SL',
      meta: { align: 'right', width: '64px' },
      cell: ({ row }) => <span className="font-mono tracking-tight">{formatQty(row.original.quantity)}</span>,
    },
    {
      accessorKey: 'totalPrice',
      header: 'Thành tiền',
      meta: { align: 'right', width: '128px' },
      cell: ({ row }) => <span className="font-mono tracking-tight">{formatMoney(row.original.totalPrice)}</span>,
    },
    {
      id: 'stock',
      header: 'Tồn',
      meta: { align: 'right', sticky: 'right', width: '132px' },
      enableSorting: false,
      cell: ({ row }) => {
        const tone = stockTone(row.original)
        const shortBy = row.original.quantity - row.original.availableQuantity
        const label = tone === 'short' ? `Thiếu ${formatQty(shortBy)}` : `Còn ${formatQty(row.original.availableQuantity)}`
        const Icon = tone === 'short' ? XCircle : tone === 'low' ? AlertTriangle : CheckCircle2
        return (
          <span
            className={cn('inline-flex items-center justify-end gap-1 whitespace-nowrap text-[12px]', tone === 'short' ? 'text-rose-700' : tone === 'low' ? 'text-amber-700' : 'text-emerald-700')}
            title={tone === 'short' ? 'Không đủ hàng để xuất' : tone === 'low' ? 'Tồn sát ngưỡng an toàn' : 'Đủ hàng để xuất'}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {label}
          </span>
        )
      },
    },
  ], [])

  async function run(action: OrderAction, note?: string) {
    if (!order || pending) return
    setPending(action)
    try {
      await transition(order.id, action, note)
      setDialog(null)
    } catch {
      setDialog(null)
    } finally {
      setPending(null)
    }
  }

  if (!order && loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!order || !user) {
    return (
      <div className="p-4">
        <p className="text-slate-600">Không tìm thấy đơn hàng trong phạm vi chi nhánh của bạn.</p>
        <Link to="/orders" className="mt-2 inline-block text-ink">Về danh sách</Link>
      </div>
    )
  }

  const actions = actionsFor(user, order)
  const shortages = stockShortages(order)

  return (
    <div className="flex min-h-full flex-col gap-3 p-4 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/orders" className="text-[12px] text-slate-500 hover:text-slate-800">Đơn hàng</Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-semibold text-ink">{order.code}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-[13px] text-slate-600">
            {order.customerName}
            <span className="px-1.5 text-slate-300">/</span>
            {order.branchName}
            <span className="px-1.5 text-slate-300">/</span>
            <span className="font-mono text-[12px] tracking-tight">{formatDate(order.createdAt)}</span>
          </p>
        </div>
        {canEditDraft ? (
          <Button variant="outline" className="h-9 rounded-full px-3 text-[12px]" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Sửa đơn nháp
          </Button>
        ) : null}
      </div>

      <OrderWorkflowStepper order={order} />

      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,1.86fr)_minmax(280px,1fr)]">
        <CompactDataTable data={order.items} columns={columns} caption={`Hàng trên ${order.code}`} />
        <aside className="rounded-xl border border-slate-200 bg-white">
          <dl className="space-y-2 px-3 py-3">
            <Row label="Tạm tính" value={formatMoney(order.subtotal)} />
            <Row label="Thành tiền" value={formatMoney(order.totalAmount)} strong />
            {showCost && order.costPrice ? <Row label="Giá vốn" value={formatMoney(order.costPrice)} /> : null}
            {showCost && order.marginRate ? <Row label="Biên lợi nhuận" value={formatMargin(order.marginRate)} /> : null}
          </dl>
          <div className="border-t border-slate-200">
            <button
              type="button"
              className="flex h-9 w-full items-center justify-between px-3 text-left text-[12px] font-semibold uppercase tracking-wider text-slate-500"
              aria-expanded={auditOpen}
              onClick={() => setAuditOpen((value) => !value)}
            >
              Nhật ký duyệt
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', auditOpen && 'rotate-180')} />
            </button>
            {auditOpen ? (
              <ol className="space-y-3 px-3 pb-3">
                {[...order.auditLogs].reverse().map((log) => (
                  <li key={log.id} className="border-l border-slate-200 pl-3">
                    <p className="font-mono text-[11px] tracking-tight text-slate-500">{formatDate(log.createdAt)}</p>
                    <p className="text-[13px] font-medium text-slate-800">{log.actorName}</p>
                    <p className="text-[12px] text-slate-500">
                      {log.actorRole} · {log.fromStatus ? `${STATUS_LABEL[log.fromStatus]} → ${STATUS_LABEL[log.toStatus]}` : STATUS_LABEL[log.toStatus]}
                    </p>
                    {log.note ? <p className="mt-0.5 text-[12px] text-slate-700">{log.note}</p> : null}
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        </aside>
      </div>

      <ActionBar
        actions={actions}
        pending={pending}
        shortages={shortages}
        onAction={(action) => {
          if (action === 'reject' || action === 'cancel') {
            setDialog(action)
            return
          }
          void run(action)
        }}
      />

      <AuditModalWithReason
        action={dialog}
        pending={pending === 'reject' || pending === 'cancel'}
        onClose={() => setDialog(null)}
        onConfirm={(note) => { if (dialog) void run(dialog, note) }}
      />

      <OrderDraftDialog
        open={editOpen}
        order={order}
        onClose={() => setEditOpen(false)}
        onSubmit={async (input) => {
          await updateOrder(order.id, { customerId: input.customerId, lines: input.lines })
        }}
      />
    </div>
  )
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={cn('font-mono tracking-tight', strong ? 'text-[15px] font-semibold text-slate-900' : 'text-slate-800')}>{value}</dd>
    </div>
  )
}
