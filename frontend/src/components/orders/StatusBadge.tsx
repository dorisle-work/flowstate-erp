import { STATUS_LABEL } from '../../lib/status.ts'
import { cn } from '../../lib/utils.ts'
import type { OrderStatus } from '../../types/index.ts'

const DOT: Partial<Record<OrderStatus, string>> = {
  pending_approval: 'bg-amber-500 animate-pulse',
  dispatched: 'bg-emerald-500',
}

const TONE: Record<OrderStatus, string> = {
  draft: 'border-slate-300 bg-slate-100 text-slate-700',
  pending_approval: 'border-amber-300 bg-amber-50 text-amber-700',
  approved: 'border-blue-300 bg-blue-50 text-blue-700',
  dispatched: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  completed: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  rejected: 'border-rose-300 bg-rose-50 text-rose-700',
  cancelled: 'border-rose-300 bg-rose-50 text-rose-700',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn('inline-flex h-5 items-center rounded border px-1.5 text-[11px] font-medium leading-none', TONE[status])}>
      {DOT[status] ? <span className={cn('mr-1 h-1.5 w-1.5 rounded-full', DOT[status])} /> : null}
      {STATUS_LABEL[status]}
    </span>
  )
}
