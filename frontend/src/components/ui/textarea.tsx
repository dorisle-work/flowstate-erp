import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils.ts'

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-24 w-full resize-y rounded-md border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-900 placeholder:text-slate-400',
        className,
      )}
      {...props}
    />
  )
}
