import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CompactDataTable } from '../components/orders/CompactDataTable.tsx'
import { Button } from '../components/ui/button.tsx'
import { Dialog, DialogContent } from '../components/ui/dialog.tsx'
import { Input } from '../components/ui/input.tsx'
import { useErp } from '../context/ErpContext.tsx'
import { formatMoney, formatQty } from '../lib/format.ts'
import { canViewCost } from '../lib/status.ts'

interface ProductRow {
  id: number
  sku: string
  name: string
  unit: string
  unitPrice: number
  cost: number
  onHand: number
  reserved: number
}

const emptyForm = { sku: '', name: '', unitPrice: '', cost: '' }

export function ProductsPage() {
  const { user, inventory, branchScope, products, saveProduct, removeProduct } = useErp()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const showCost = canViewCost(user)
  const canManage = Boolean(user?.permissions.includes('settings.manage'))

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products
      .map((product): ProductRow => {
        const stock = inventory.filter((item) => item.sku === product.sku && (branchScope === 'all' || item.branchId === branchScope))
        return {
          id: product.id,
          sku: product.sku,
          name: product.name,
          unit: 'cái',
          unitPrice: product.unitPrice,
          cost: product.cost,
          onHand: stock.reduce((sum, item) => sum + item.onHand, 0),
          reserved: stock.reduce((sum, item) => sum + item.reserved, 0),
        }
      })
      .filter((product) => !q || product.sku.toLowerCase().includes(q) || product.name.toLowerCase().includes(q))
  }, [inventory, branchScope, query, products])

  const columns = useMemo<ColumnDef<ProductRow>[]>(() => {
    const base: ColumnDef<ProductRow>[] = [
      {
        accessorKey: 'sku',
        header: 'SKU',
        meta: { sticky: 'left', width: '110px' },
        cell: ({ row }) => <span className="font-semibold text-ink">{row.original.sku}</span>,
      },
      { accessorKey: 'name', header: 'Sản phẩm' },
      { accessorKey: 'unit', header: 'Đơn vị', meta: { align: 'center', width: '90px' } },
      {
        accessorKey: 'unitPrice',
        header: 'Giá bán',
        meta: { align: 'right', width: '130px' },
        cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.unitPrice)}</span>,
      },
    ]
    if (showCost) {
      base.push(
        {
          accessorKey: 'cost',
          header: 'Giá vốn',
          meta: { align: 'right', width: '130px' },
          cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.cost)}</span>,
        },
        {
          id: 'margin',
          header: 'Biên LN',
          meta: { align: 'right', width: '90px' },
          cell: ({ row }) => {
            const margin = row.original.unitPrice === 0 ? 0 : (row.original.unitPrice - row.original.cost) / row.original.unitPrice
            return <span className="tabular-nums text-emerald-600">{`${(margin * 100).toFixed(1)}%`}</span>
          },
        },
      )
    }
    base.push(
      {
        accessorKey: 'onHand',
        header: 'Tồn',
        meta: { align: 'right', width: '90px' },
        cell: ({ row }) => <span className="tabular-nums">{formatQty(row.original.onHand)}</span>,
      },
      {
        accessorKey: 'reserved',
        header: 'Đang giữ',
        meta: { align: 'right', width: '100px' },
        cell: ({ row }) => <span className="tabular-nums">{formatQty(row.original.reserved)}</span>,
      },
    )
    if (canManage) {
      base.push({
        id: 'actions',
        header: 'Thao tác',
        meta: { align: 'right', sticky: 'right', width: '100px' },
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-[#f5f6f8] hover:text-ink"
              aria-label={`Sửa ${row.original.sku}`}
              onClick={() => {
                setEditingId(row.original.id)
                setForm({
                  sku: row.original.sku,
                  name: row.original.name,
                  unitPrice: String(row.original.unitPrice),
                  cost: String(row.original.cost),
                })
                setOpen(true)
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              aria-label={`Xóa ${row.original.sku}`}
              onClick={() => { void removeProduct(row.original.id) }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      })
    }
    return base
  }, [showCost, canManage, removeProduct])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-slate-500">{rows.length} mặt hàng trong danh mục</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm SKU hoặc tên sản phẩm"
            className="max-w-xs rounded-full border-0 shadow-[0_6px_16px_rgba(15,23,42,0.04)]"
          />
          {canManage ? (
            <Button
              className="h-9 rounded-full bg-ink px-3 text-[12px] text-white hover:bg-black"
              onClick={() => {
                setEditingId(null)
                setForm(emptyForm)
                setOpen(true)
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm SP
            </Button>
          ) : null}
        </div>
      </div>
      <CompactDataTable data={rows} columns={columns} caption="Danh mục sản phẩm" pageResetKey={query} fill />

      <Dialog open={open} onOpenChange={(next) => { if (!saving) setOpen(next) }}>
        <DialogContent title={editingId ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} description="SKU dùng chung mọi chi nhánh. Tồn khởi tạo bằng 0 cho đến khi nhập kho.">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              setSaving(true)
              void saveProduct({
                id: editingId ?? undefined,
                sku: form.sku,
                name: form.name,
                unitPrice: Number(form.unitPrice),
                cost: Number(form.cost),
              }).then(() => setOpen(false)).finally(() => setSaving(false))
            }}
          >
            <label className="block text-[12px] font-medium text-slate-600">
              SKU
              <Input className="mt-1" required value={form.sku} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} />
            </label>
            <label className="block text-[12px] font-medium text-slate-600">
              Tên sản phẩm
              <Input className="mt-1" required value={form.name} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="block text-[12px] font-medium text-slate-600">
              Giá bán
              <Input className="mt-1" type="number" min={0} required value={form.unitPrice} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, unitPrice: event.target.value }))} />
            </label>
            <label className="block text-[12px] font-medium text-slate-600">
              Giá vốn
              <Input className="mt-1" type="number" min={0} required value={form.cost} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, cost: event.target.value }))} />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
