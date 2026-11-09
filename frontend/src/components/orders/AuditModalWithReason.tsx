import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { ACTION_LABEL } from '../../lib/status.ts'
import type { OrderAction } from '../../types/index.ts'
import { Button } from '../ui/button.tsx'
import { Dialog, DialogContent } from '../ui/dialog.tsx'
import { Textarea } from '../ui/textarea.tsx'

interface AuditModalProps {
  action: Extract<OrderAction, 'reject' | 'cancel'> | null
  pending: boolean
  onClose: () => void
  onConfirm: (note: string) => void
}

export function AuditModalWithReason({ action, pending, onClose, onConfirm }: AuditModalProps) {
  const [note, setNote] = useState('')
  const length = note.trim().length
  const title = action === 'reject' ? 'Từ chối đơn hàng' : 'Hủy đơn hàng'

  return (
    <Dialog open={action !== null} onOpenChange={(open) => { if (!open && !pending) { setNote(''); onClose() } }}>
      <DialogContent
        title={title}
        description="Thao tác này ghi vào nhật ký duyệt. Lý do bắt buộc, tối thiểu 10 ký tự."
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (length < 10 || pending) return
            onConfirm(note.trim())
          }}
        >
          <label className="mb-1 block text-[12px] font-medium text-slate-600" htmlFor="audit-note">
            Lý do xử lý
          </label>
          <Textarea
            id="audit-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ghi rõ căn cứ để người sau đối soát."
            required
            minLength={10}
            disabled={pending}
          />
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className={length < 10 ? 'text-rose-600' : 'text-slate-400'}>{length}/10 ký tự</span>
            <span className="font-mono tracking-tight text-slate-400">X-Idempotency-Key</span>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => { if (!pending) { setNote(''); onClose() } }} disabled={pending}>
              Quay lại
            </Button>
            <Button type="submit" variant={action === 'reject' ? 'rose' : 'primary'} disabled={length < 10 || pending}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {pending ? 'Đang ghi nhận...' : action ? ACTION_LABEL[action] : 'Xác nhận'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
