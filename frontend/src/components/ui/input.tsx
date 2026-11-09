import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils.ts'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-ink placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-400',
        className,
      )}
      {...props}
    />
  )
}
