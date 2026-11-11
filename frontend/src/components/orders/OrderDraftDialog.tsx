import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { CatalogProduct } from '../../context/ErpContext.tsx'
import { useErp } from '../../context/ErpContext.tsx'
import { cn } from '../../lib/utils.ts'
import type { Customer, Order } from '../../types/index.ts'
import { Button } from '../ui/button.tsx'
import { Dialog, DialogContent } from '../ui/dialog.tsx'
import { Input } from '../ui/input.tsx'
import { Select } from '../ui/select.tsx'

export interface DraftLine {
  key: string
  sku: string
  quantity: string
}

interface OrderDraftDialogProps {
  open: boolean
  order?: Order | null
  onClose: () => void
  onSubmit: (input: { customerId: number; branchId: number; lines: Array<{ sku: string; quantity: number }> }) => Promise<void>
}

export function OrderDraftDialog({ open, order, onClose, onSubmit }: OrderDraftDialogProps) {
  const { user, inventory, customers, products, branches } = useErp()
  const locked = user?.branchId != null
  const editing = Boolean(order)
  const [creating, setCreating] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [draftBranch, setDraftBranch] = useState(user?.branchId ?? branches[0]?.id ?? 1)
  const [lines, setLines] = useState<DraftLine[]>([{ key: 'line-1', sku: products[0]?.sku ?? '', quantity: '1' }])

  useEffect(() => {
    if (!open) return
    if (order) {
      setDraftBranch(order.branchId)
      setCustomerId(order.customerId ? String(order.customerId) : '')
      setLines(order.items.map((item) => ({
        key: crypto.randomUUID(),
        sku: item.sku,
        quantity: String(item.quantity),
      })))
      return
    }
    setDraftBranch(user?.branchId ?? branches[0]?.id ?? 1)
    setCustomerId('')
    setLines([{ key: crypto.randomUUID(), sku: products[0]?.sku ?? '', quantity: '1' }])
  }, [open, order, user?.branchId, branches, products])

  const draftBranchId = locked ? (user?.branchId ?? draftBranch) : draftBranch
  const branchCustomers = customers.filter((item: Customer) => item.branchId === draftBranchId)

  const draftLines = useMemo(() => lines.map((line) => {
    const quantity = Number(line.quantity)
    const stock = inventory.find((item) => item.branchId === draftBranchId && item.sku === line.sku)
    const taken = lines.filter((item) => item.sku === line.sku).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
    const available = (stock?.onHand ?? 0) - (stock?.reserved ?? 0)
    const duplicate = lines.filter((item) => item.sku === line.sku).length > 1
    const over = !duplicate && Number.isFinite(quantity) && quantity > 0 && taken > available
    return { ...line, quantity, available, duplicate, over, badQty: !Number.isInteger(quantity) || quantity < 1 }
  }), [lines, inventory, draftBranchId])

  const draftInvalid = !customerId || draftLines.some((line) => line.badQty || line.duplicate || line.over)

  async function submit() {
    if (draftInvalid || creating) return
    setCreating(true)
    try {
      await onSubmit({
        customerId: Number(customerId),
        branchId: draftBranchId,
        lines: draftLines.map((line) => ({ sku: line.sku, quantity: line.quantity })),
      })
      onClose()
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!creating && !next) onClose() }}>
      <DialogContent
        wide
        title={editing ? `Sửa đơn nháp ${order?.code ?? ''}` : 'Tạo đơn hàng mới'}
        description="Chọn khách trong danh sách và thêm một hoặc nhiều sản phẩm."
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          {locked || editing ? null : (
            <>
              <label className="mb-1 block text-[12px] font-medium text-slate-600" htmlFor="draft-branch">Chi nhánh</label>
              <Select
                id="draft-branch"
                className="w-full"
                value={draftBranch}
                disabled={creating}
                onChange={(event) => {
                  const next = Number(event.target.value)
                  setDraftBranch(next)
                  setCustomerId((current) => (customers.some((item) => String(item.id) === current && item.branchId === next) ? current : ''))
                }}
              >
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </Select>
            </>
          )}

          <label className="mb-1 mt-3 block text-[12px] font-medium text-slate-600" htmlFor="draft-customer">Khách hàng</label>
          <Select id="draft-customer" className="w-full" value={customerId} required disabled={creating} onChange={(event) => setCustomerId(event.target.value)}>
            <option value="">Chọn khách hàng</option>
            {branchCustomers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.code} · {customer.name}</option>
            ))}
          </Select>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-[12px] font-medium text-slate-600">Sản phẩm</p>
            <button
              type="button"
              className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-[12px] font-medium text-ink hover:bg-[#f5f6f8] disabled:opacity-40"
              disabled={creating || lines.length >= products.length}
              onClick={() => {
                const used = new Set(lines.map((line) => line.sku))
                const next = products.find((product: CatalogProduct) => !used.has(product.sku)) ?? products[0]
                if (!next) return
                setLines((current) => [...current, { key: crypto.randomUUID(), sku: next.sku, quantity: '1' }])
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm sản phẩm
            </button>
          </div>

          <div className="mt-2 space-y-2">
            {draftLines.map((line, index) => (
              <div key={line.key}>
                <div className="grid grid-cols-[minmax(0,1fr)_88px_32px] gap-2">
                  <Select
                    aria-label={`Sản phẩm ${index + 1}`}
                    className="w-full"
                    value={line.sku}
                    disabled={creating}
                    onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, sku: event.target.value } : item))}
                  >
                    {products.map((product) => <option key={product.sku} value={product.sku}>{product.sku} · {product.name}</option>)}
                  </Select>
                  <Input
                    aria-label={`Số lượng ${index + 1}`}
                    type="number"
                    min={1}
                    step={1}
                    value={line.quantity}
                    disabled={creating}
                    className="text-right"
                    onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, quantity: event.target.value } : item))}
                  />
                  <button
                    type="button"
                    className="flex h-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                    aria-label={`Xóa dòng ${index + 1}`}
                    disabled={creating || lines.length === 1}
                    onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className={cn('mt-1 text-[12px]', line.duplicate || line.over ? 'text-rose-600' : 'text-slate-500')}>
                  {line.duplicate
                    ? 'Sản phẩm này đã có trên đơn.'
                    : line.over
                      ? `Khả dụng ${Math.max(0, line.available)}. Vượt tồn, chưa lưu được đơn.`
                      : `Khả dụng ${line.available}`}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={creating} onClick={onClose}>Quay lại</Button>
            <Button type="submit" disabled={creating || draftInvalid}>
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {creating ? 'Đang ghi nhận...' : editing ? 'Lưu đơn nháp' : 'Tạo đơn nháp'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
