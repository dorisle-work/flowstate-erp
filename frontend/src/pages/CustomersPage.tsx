import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { CompactDataTable } from '../components/orders/CompactDataTable.tsx'
import { Input } from '../components/ui/input.tsx'
import { useErp } from '../context/ErpContext.tsx'
import { BRANCHES } from '../data/catalog.ts'
import { CUSTOMERS } from '../data/customers.ts'
import { formatMoney, formatQty } from '../lib/format.ts'

interface CustomerRow {
  id: number
  code: string
  name: string
  phone: string
  branchName: string
  orders: number
  revenue: number
}

export function CustomersPage() {
  const { orders, branchScope } = useErp()
  const [query, setQuery] = useState('')
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CUSTOMERS
      .filter((customer) => branchScope === 'all' || customer.branchId === branchScope)
      .filter((customer) => !q || customer.name.toLowerCase().includes(q) || customer.code.toLowerCase().includes(q) || customer.phone.includes(q))
      .map((customer): CustomerRow => {
        const related = orders.filter((order) => order.customerId === customer.id || order.customerName === customer.name)
        return {
          id: customer.id,
          code: customer.code,
          name: customer.name,
          phone: customer.phone,
          branchName: BRANCHES.find((branch) => branch.id === customer.branchId)?.name ?? '',
          orders: related.length,
          revenue: related.reduce((sum, order) => sum + Number(order.totalAmount), 0),
        }
      })
  }, [orders, branchScope, query])

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
      meta: { align: 'right', sticky: 'right', width: '140px' },
      cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.revenue)}</span>,
    },
  ], [])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-slate-500">{rows.length} khách hàng trong phạm vi đang xem</p>
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã, tên hoặc số điện thoại" aria-label="Tìm khách hàng" className="w-full sm:w-72" />
      </div>
      <CompactDataTable data={rows} columns={columns} caption="Danh sách khách hàng" fill />
    </div>
  )
}
