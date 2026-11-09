import { ACTION_LABEL, ACTION_PENDING } from '../../lib/status.ts'
import type { OrderAction } from '../../types/index.ts'
import { Button } from '../ui/button.tsx'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip.tsx'

const VARIANT: Record<OrderAction, 'primary' | 'emerald' | 'rose' | 'indigo' | 'outline'> = {
  submit: 'indigo',
  approve: 'emerald',
  reject: 'rose',
  dispatch: 'primary',
  complete: 'emerald',
  cancel: 'outline',
}

interface ActionBarProps {
  actions: OrderAction[]
  pending: OrderAction | null
  shortages: string[]
  onAction: (action: OrderAction) => void
}

export function ActionBar({ actions, pending, shortages, onAction }: ActionBarProps) {
  if (actions.length === 0) {
    return (
      <div className="sticky bottom-3 z-30 flex h-12 items-center rounded-2xl border border-ink/15 bg-white px-3 text-[13px] text-ink shadow-dock">
        Không có thao tác ở trạng thái này với vai trò của bạn.
      </div>
    )
  }

  return (
    <div className="sticky bottom-3 z-30 flex h-12 items-center justify-end gap-2 rounded-2xl border border-ink/15 bg-white px-3 shadow-dock">
      {actions.map((action) => {
        const blocked = action === 'dispatch' && shortages.length > 0
        const busy = pending === action
        const disabled = pending !== null || blocked
        const button = (
          <Button
            variant={VARIANT[action]}
            disabled={disabled}
            aria-busy={busy}
            onClick={() => onAction(action)}
          >
            {busy ? ACTION_PENDING[action] : ACTION_LABEL[action]}
          </Button>
        )
        if (!blocked) return <span key={action}>{button}</span>
        return (
          <Tooltip key={action}>
            <TooltipTrigger>
              <span className="inline-flex">{button}</span>
            </TooltipTrigger>
            <TooltipContent>
              Tồn kho chi nhánh không đủ để xuất (Thiếu {shortages.join(', ')}).
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
