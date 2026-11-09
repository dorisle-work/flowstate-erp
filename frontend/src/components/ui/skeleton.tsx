import { cn } from '../../lib/utils.ts'

export function Skeleton({ className }: { className?: string }) {
  return <span className={cn('block animate-pulse rounded bg-slate-200', className)} />
}
