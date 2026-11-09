import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { CompactDataTable } from '../components/orders/CompactDataTable.tsx'
import { Input } from '../components/ui/input.tsx'
import { useErp } from '../context/ErpContext.tsx'
import { PRODUCTS } from '../data/catalog.ts'
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

export function ProductsPage() {
  const { user, inventory, branchScope } = useErp()
  const [query, setQuery] = useState('')
  const showCost = canViewCost(user)
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return PRODUCTS
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
  }, [inventory, branchScope, query])

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
        meta: { align: 'right', sticky: 'right', width: '100px' },
        cell: ({ row }) => <span className="tabular-nums">{formatQty(row.original.reserved)}</span>,
      },
    )
    return base
  }, [showCost])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-slate-500">{rows.length} mặt hàng trong danh mục</p>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm SKU hoặc tên sản phẩm"
          className="max-w-xs rounded-full border-0 shadow-[0_6px_16px_rgba(15,23,42,0.04)]"
        />
      </div>
      <CompactDataTable data={rows} columns={columns} caption="Danh mục sản phẩm" pageResetKey={query} fill />
    </div>
  )
}
