import type { ColumnDef } from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useErp } from '../../context/ErpContext.tsx'
import { dayKey, formatDate, formatMargin, formatMoney } from '../../lib/format.ts'
import { canViewCost } from '../../lib/status.ts'
import type { Order } from '../../types/index.ts'
import { CompactDataTable } from './CompactDataTable.tsx'
import { OrderFilters, type StatusTab } from './OrderFilters.tsx'
import { StatusBadge } from './StatusBadge.tsx'

export function OrdersListPage() {
  const navigate = useNavigate()
  const { orders, loading, user, branchScope, setBranchScope } = useErp()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusTab>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const onSearch = useCallback((value: string) => setSearch(value), [])
  const showCost = canViewCost(user)

  const searched = useMemo(() => {
    const query = search.trim().toLowerCase()
    return orders.filter((order) => {
      if (branchScope !== 'all' && order.branchId !== branchScope) return false
      const day = dayKey(order.createdAt)
      if (from && day < from) return false
      if (to && day > to) return false
      if (minAmount && Number(order.totalAmount) < Number(minAmount)) return false
      if (maxAmount && Number(order.totalAmount) > Number(maxAmount)) return false
      if (!query) return true
      return order.code.toLowerCase().includes(query) || order.customerName.toLowerCase().includes(query)
    })
  }, [orders, search, branchScope, from, to, minAmount, maxAmount])

  const counts: Record<StatusTab, number> = {
    all: searched.length,
    pending_approval: searched.filter((order) => order.status === 'pending_approval').length,
    approved: searched.filter((order) => order.status === 'approved').length,
    cancelled: searched.filter((order) => order.status === 'cancelled').length,
  }

  const visible = status === 'all' ? searched : searched.filter((order) => order.status === status)

  const columns = useMemo<ColumnDef<Order>[]>(() => {
    const base: ColumnDef<Order>[] = [
      {
        accessorKey: 'code',
        header: 'Mã đơn',
        meta: { sticky: 'left', width: '210px' },
        cell: ({ row }) => <span className="whitespace-nowrap text-[13px] font-semibold text-ink">{row.original.code}</span>,
      },
      {
        accessorKey: 'createdAt',
        header: 'Ngày tạo',
        meta: { align: 'center', width: '168px' },
        cell: ({ row }) => <span className="whitespace-nowrap font-mono text-[12px]">{formatDate(row.original.createdAt)}</span>,
      },
      {
        accessorKey: 'customerName',
        header: 'Khách hàng',
        cell: ({ row }) => <span className="block max-w-[220px] truncate">{row.original.customerName}</span>,
      },
      {
        accessorKey: 'branchName',
        header: 'Chi nhánh',
        meta: { align: 'center', width: '96px' },
      },
      {
        accessorKey: 'totalAmount',
        header: 'Thành tiền',
        meta: { align: 'right', width: '132px' },
        sortingFn: (a, b) => Number(a.original.totalAmount) - Number(b.original.totalAmount),
        cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.totalAmount)}</span>,
      },
    ]
    if (showCost) {
      base.push(
        {
          id: 'cost',
          header: 'Giá vốn',
          meta: { align: 'right', width: '120px' },
          cell: ({ row }) => <span className="tabular-nums">{row.original.costPrice ? formatMoney(row.original.costPrice) : '—'}</span>,
        },
        {
          id: 'margin',
          header: 'Biên LN',
          meta: { align: 'right', width: '88px' },
          cell: ({ row }) => (
            <span className="tabular-nums">{row.original.marginRate ? formatMargin(row.original.marginRate) : '—'}</span>
          ),
        },
      )
    }
    base.push(
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        meta: { align: 'center', width: '120px' },
        enableSorting: false,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: 'Thao tác',
        meta: { sticky: 'right', align: 'center', width: '72px' },
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            className="font-medium text-ink hover:underline"
            onClick={() => navigate(`/orders/${row.original.code}`)}
          >
            Xem
          </button>
        ),
      },
    )
    return base
  }, [navigate, showCost])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Đơn hàng</h1>
        <p className="font-mono text-[12px] tracking-tight text-slate-500">{visible.length} đơn</p>
      </div>
      <OrderFilters
        search={search}
        onSearch={onSearch}
        status={status}
        onStatus={setStatus}
        counts={counts}
        from={from}
        to={to}
        onFrom={setFrom}
        onTo={setTo}
        minAmount={minAmount}
        maxAmount={maxAmount}
        onMinAmount={setMinAmount}
        onMaxAmount={setMaxAmount}
        branchScope={branchScope}
        onBranch={setBranchScope}
        branchLocked={user?.branchId !== null && user?.branchId !== undefined}
      />
      <CompactDataTable
        data={visible}
        columns={columns}
        loading={loading && orders.length === 0}
        caption="Danh sách đơn hàng"
        pageResetKey={`${search}|${status}|${from}|${to}|${minAmount}|${maxAmount}|${branchScope}`}
        fill
        onRowClick={(order) => navigate(`/orders/${order.code}`)}
      />
    </div>
  )
}
