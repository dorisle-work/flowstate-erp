import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatDate } from '../../lib/format.ts'
import { FLOW_STEPS, STATUS_LABEL } from '../../lib/status.ts'
import { cn } from '../../lib/utils.ts'
import type { AuditLog, Order, OrderStatus } from '../../types/index.ts'

function logFor(order: Order, status: OrderStatus): AuditLog | undefined {
  return [...order.auditLogs].reverse().find((log) => log.toStatus === status)
}

export function OrderWorkflowStepper({ order }: { order: Order }) {
  const [open, setOpen] = useState<OrderStatus | null>(null)
  const failed = order.status === 'rejected' || order.status === 'cancelled'
  const currentIndex = FLOW_STEPS.indexOf(order.status)
  const failureNote = [...order.auditLogs].reverse().find((log) => log.toStatus === 'rejected' || log.toStatus === 'cancelled')
  const breakIndex = failureNote?.fromStatus ? FLOW_STEPS.indexOf(failureNote.fromStatus) : -1

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const finished = order.status === 'completed'

  return (
    <section className="rounded-2xl border border-ink/15 bg-white px-3 py-4 sm:px-5">
      <ol className="flex w-full items-start">
        {FLOW_STEPS.map((step, index) => {
          const done = !failed && (finished || currentIndex > index)
          const current = !failed && !finished && currentIndex === index
          const upcoming = !done && !current
          const log = logFor(order, step)
          const solidBefore = index > 0 && !failed && index <= currentIndex
          const solidAfter = index < FLOW_STEPS.length - 1 && !failed && index < currentIndex
          return (
            <li key={step} className="relative min-w-0 flex-1">
              <button
                type="button"
                className="relative z-10 flex w-full flex-col items-center bg-transparent text-center"
                onClick={() => setOpen((value) => (value === step ? null : step))}
                aria-expanded={open === step}
              >
                <span className="flex w-full items-center">
                  <span className={cn('h-px flex-1', index === 0 && 'invisible', solidBefore ? 'bg-emerald-500' : 'border-t border-dashed border-slate-300')} />
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-white text-[11px] font-semibold',
                      done && 'border-emerald-500 bg-emerald-500 text-white',
                      current && 'step-pulse border-ink text-ink',
                      upcoming && 'border-slate-300 text-slate-300',
                      failed && index === breakIndex && 'border-rose-500 bg-rose-500 text-white',
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : index + 1}
                  </span>
                  <span className={cn('h-px flex-1', index === FLOW_STEPS.length - 1 && 'invisible', solidAfter ? 'bg-emerald-500' : 'border-t border-dashed border-slate-300')} />
                </span>
                <span className={cn('mt-1.5 px-0.5 text-[12px] font-medium leading-tight', current || done ? 'text-ink' : 'text-slate-400', failed && index === breakIndex && 'text-rose-700', failed && index !== breakIndex && 'text-slate-400')}>
                  {STATUS_LABEL[step]}
                </span>
              </button>
              {open === step ? (
                <div className={cn('absolute top-14 z-20 w-56 rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-dock', index === 0 ? 'left-0' : index === FLOW_STEPS.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2')}>
                  {log ? (
                    <>
                      <p className="font-medium text-slate-900">{log.actorName}</p>
                      <p className="text-[12px] text-slate-500">{log.actorRole}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{formatDate(log.createdAt)}</p>
                      {log.note ? <p className="mt-1.5 text-[12px] text-slate-700">{log.note}</p> : null}
                    </>
                  ) : (
                    <p className="text-[12px] text-slate-500">Chưa có ghi nhận cho bước này.</p>
                  )}
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>
      {failed && failureNote ? (
        <div className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          <p className="font-semibold">{order.status === 'rejected' ? 'Đơn bị từ chối' : 'Đơn đã hủy'}</p>
          <p className="mt-0.5">{failureNote.note}</p>
          <p className="mt-1 font-mono text-[11px] tracking-tight">
            {failureNote.actorName} · {failureNote.actorRole} · {formatDate(failureNote.createdAt)}
          </p>
        </div>
      ) : null}
    </section>
  )
}
