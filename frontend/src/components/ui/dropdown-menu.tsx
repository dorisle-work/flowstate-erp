import * as Dropdown from '@radix-ui/react-dropdown-menu'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils.ts'

export const Menu = Dropdown.Root
export const MenuTrigger = Dropdown.Trigger

export function MenuContent({ children, align = 'end' }: { children: ReactNode; align?: 'start' | 'end' }) {
  return (
    <Dropdown.Portal>
      <Dropdown.Content
        align={align}
        sideOffset={6}
        className="z-50 min-w-52 rounded-lg border border-slate-200 bg-white p-1 text-[13px] text-slate-700 shadow-dock"
      >
        {children}
      </Dropdown.Content>
    </Dropdown.Portal>
  )
}

export function MenuItem({
  children,
  onSelect,
  disabled,
}: {
  children: ReactNode
  onSelect?: () => void
  disabled?: boolean
}) {
  return (
    <Dropdown.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center rounded-md px-2 py-1.5 outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[highlighted]:bg-slate-100',
      )}
    >
      {children}
    </Dropdown.Item>
  )
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{children}</div>
}
