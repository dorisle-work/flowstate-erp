import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils.ts'

export const Dialog = DialogPrimitive.Root

export function DialogContent({
  children,
  title,
  description,
  wide = false,
}: {
  children: ReactNode
  title: string
  description?: string
  wide?: boolean
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/40" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 max-h-[min(720px,calc(100vh-2rem))] w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-dock',
          wide && 'w-[min(640px,calc(100vw-2rem))]',
        )}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <DialogPrimitive.Title className="text-[15px] font-semibold text-slate-900">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-[13px] text-slate-500">{description}</DialogPrimitive.Description>
            ) : null}
          </div>
          <DialogPrimitive.Close className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng">
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
