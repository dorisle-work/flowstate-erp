import type { SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/utils.ts'

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-9 rounded-lg border border-slate-200 bg-white pl-2.5 text-[13px] text-ink disabled:bg-slate-100 disabled:text-slate-400',
        className,
      )}
      {...props}
    />
  )
}
