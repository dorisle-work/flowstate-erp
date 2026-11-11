import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CompactDataTable } from '../components/orders/CompactDataTable.tsx'
import { Button } from '../components/ui/button.tsx'
import { Dialog, DialogContent } from '../components/ui/dialog.tsx'
import { Input } from '../components/ui/input.tsx'
import { Select } from '../components/ui/select.tsx'
import { useErp } from '../context/ErpContext.tsx'
import { formatMoney, formatQty } from '../lib/format.ts'
import type { Customer } from '../types/index.ts'

interface CustomerRow {
  id: number
  code: string
  name: string
  phone: string
  branchId: number
  branchName: string
  orders: number
  revenue: number
}

const emptyForm = { code: '', name: '', phone: '', branchId: '' }

export function CustomersPage() {
  const { orders, branchScope, customers, branches, user, saveCustomer, removeCustomer } = useErp()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const canWrite = Boolean(user?.permissions.includes('orders.create'))
  const canDelete = Boolean(user?.permissions.includes('settings.manage'))

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return customers
      .filter((customer) => branchScope === 'all' || customer.branchId === branchScope)
      .filter((customer) => !q || customer.name.toLowerCase().includes(q) || customer.code.toLowerCase().includes(q) || customer.phone.includes(q))
      .map((customer): CustomerRow => {
        const related = orders.filter((order) => order.customerId === customer.id || order.customerName === customer.name)
        return {
          id: customer.id,
          code: customer.code,
          name: customer.name,
          phone: customer.phone,
          branchId: customer.branchId,
          branchName: branches.find((branch) => branch.id === customer.branchId)?.name ?? '',
          orders: related.length,
          revenue: related.reduce((sum, order) => sum + Number(order.totalAmount), 0),
        }
      })
  }, [orders, branchScope, query, customers, branches])

  const columns = useMemo<ColumnDef<CustomerRow>[]>(() => [
    {
      accessorKey: 'code',
      header: 'Mã',
      meta: { sticky: 'left', width: '96px' },
      cell: ({ row }) => <span className="text-[13px] font-semibold text-ink">{row.original.code}</span>,
    },
    { accessorKey: 'name', header: 'Khách hàng' },
    { accessorKey: 'phone', header: 'Điện thoại', meta: { width: '150px' } },
    { accessorKey: 'branchName', header: 'Chi nhánh', meta: { align: 'center', width: '120px' } },
    {
      accessorKey: 'orders',
      header: 'Số đơn',
      meta: { align: 'right', width: '88px' },
      cell: ({ row }) => <span className="tabular-nums">{formatQty(row.original.orders)}</span>,
    },
    {
      accessorKey: 'revenue',
      header: 'Doanh số',
      meta: { align: 'right', width: '140px' },
      cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.revenue)}</span>,
    },
    {
      id: 'actions',
      header: 'Thao tác',
      meta: { align: 'right', sticky: 'right', width: '100px' },
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          {canWrite ? (
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-[#f5f6f8] hover:text-ink"
              aria-label={`Sửa ${row.original.code}`}
              onClick={() => {
                setEditing({
                  id: row.original.id,
                  code: row.original.code,
                  name: row.original.name,
                  phone: row.original.phone,
                  branchId: row.original.branchId,
                })
                setForm({
                  code: row.original.code,
                  name: row.original.name,
                  phone: row.original.phone,
                  branchId: String(row.original.branchId),
                })
                setOpen(true)
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              aria-label={`Xóa ${row.original.code}`}
              onClick={() => { void removeCustomer(row.original.id) }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ),
    },
  ], [canWrite, canDelete, removeCustomer])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-slate-500">{rows.length} khách hàng trong phạm vi đang xem</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã, tên hoặc số điện thoại" aria-label="Tìm khách hàng" className="w-full sm:w-72" />
          {canWrite ? (
            <Button
              className="h-9 rounded-full bg-ink px-3 text-[12px] text-white hover:bg-black"
              onClick={() => {
                setEditing(null)
                setForm({
                  ...emptyForm,
                  branchId: String(user?.branchId ?? (branchScope === 'all' ? branches[0]?.id : branchScope) ?? ''),
                })
                setOpen(true)
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm khách
            </Button>
          ) : null}
        </div>
      </div>
      <CompactDataTable data={rows} columns={columns} caption="Danh sách khách hàng" fill />

      <Dialog open={open} onOpenChange={(next) => { if (!saving) setOpen(next) }}>
        <DialogContent title={editing ? 'Sửa khách hàng' : 'Thêm khách hàng'} description="Khách gắn theo chi nhánh để lên đơn đúng phạm vi.">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              setSaving(true)
              void saveCustomer({
                id: editing?.id,
                code: form.code,
                name: form.name,
                phone: form.phone,
                branchId: Number(form.branchId),
              }).then(() => setOpen(false)).finally(() => setSaving(false))
            }}
          >
            <label className="block text-[12px] font-medium text-slate-600">
              Mã
              <Input className="mt-1" required value={form.code} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} />
            </label>
            <label className="block text-[12px] font-medium text-slate-600">
              Tên khách
              <Input className="mt-1" required value={form.name} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="block text-[12px] font-medium text-slate-600">
              Điện thoại
              <Input className="mt-1" value={form.phone} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            </label>
            <label className="block text-[12px] font-medium text-slate-600">
              Chi nhánh
              <Select
                className="mt-1 w-full"
                required
                value={form.branchId}
                disabled={saving || user?.branchId != null}
                onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))}
              >
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </Select>
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
