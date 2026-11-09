import type { ColumnDef } from '@tanstack/react-table'
import { Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CompactDataTable } from '../components/orders/CompactDataTable.tsx'
import { Button } from '../components/ui/button.tsx'
import { useErp } from '../context/ErpContext.tsx'
import { BRANCHES } from '../data/catalog.ts'
import { LEDGER_LABEL, ledgerEntries } from '../lib/dashboard.ts'
import { formatQty, formatStamp } from '../lib/format.ts'
import { SAFETY_QTY } from '../lib/status.ts'
import { cn } from '../lib/utils.ts'
import type { InventoryRow } from '../types/index.ts'
import type { LedgerEntry } from '../types/erp.ts'

function cell(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function workbook(entries: LedgerEntry[]): Blob {
  const head = ['Thời điểm', 'Chi nhánh', 'Mã chứng từ', 'Loại', 'SKU', 'Sản phẩm', 'Biến động', 'Số dư', 'Nhân sự']
  const rows = entries.map((entry) => {
    const branch = BRANCHES.find((item) => item.id === entry.branchId)?.name ?? ''
    const values = [formatStamp(entry.at), branch, entry.referenceCode, LEDGER_LABEL[entry.kind], entry.sku, entry.productName, String(entry.delta), String(entry.balanceAfter), entry.actorName]
    return `<tr>${values.map((value) => `<td>${cell(value)}</td>`).join('')}</tr>`
  }).join('')
  const table = `<html><head><meta charset="utf-8"></head><body><table><thead><tr>${head.map((item) => `<th>${item}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></body></html>`
  return new Blob([table], { type: 'application/vnd.ms-excel;charset=utf-8' })
}

export function InventoryPage() {
  const { inventory, orders, loading, branchScope, user, publishDownload } = useErp()
  const [queued, setQueued] = useState(false)
  const rows = inventory.filter((row) => branchScope === 'all' || row.branchId === branchScope)
  const entries = useMemo(() => ledgerEntries(orders, inventory, branchScope), [orders, inventory, branchScope])
  const canExport = Boolean(user?.permissions.includes('reports.export'))

  const balanceColumns = useMemo<ColumnDef<InventoryRow>[]>(() => [
    {
      accessorKey: 'sku',
      header: 'SKU',
      meta: { sticky: 'left', width: '96px' },
      cell: ({ row }) => <span className="text-[13px] font-semibold text-ink">{row.original.sku}</span>,
    },
    { accessorKey: 'productName', header: 'Sản phẩm' },
    { accessorKey: 'branchName', header: 'Chi nhánh', meta: { align: 'center', width: '120px' } },
    {
      accessorKey: 'onHand',
      header: 'Tồn thực tế',
      meta: { align: 'right', width: '110px' },
      cell: ({ row }) => <span className="tabular-nums">{formatQty(row.original.onHand)}</span>,
    },
    {
      accessorKey: 'reserved',
      header: 'Đang giữ chỗ',
      meta: { align: 'right', width: '120px' },
      cell: ({ row }) => <span className="tabular-nums">{formatQty(row.original.reserved)}</span>,
    },
    {
      id: 'available',
      header: 'Khả dụng',
      meta: { align: 'right', width: '110px' },
      cell: ({ row }) => {
        const available = row.original.onHand - row.original.reserved
        return <span className={cn('tabular-nums', available < SAFETY_QTY ? 'font-semibold text-amber-700' : 'text-ink')}>{formatQty(available)}</span>
      },
    },
    {
      id: 'safety',
      header: 'Ngưỡng an toàn',
      meta: { align: 'right', sticky: 'right', width: '130px' },
      cell: () => <span className="tabular-nums text-slate-500">{formatQty(SAFETY_QTY)}</span>,
    },
  ], [])

  const ledgerColumns = useMemo<ColumnDef<LedgerEntry>[]>(() => [
    {
      accessorKey: 'at',
      header: 'Thời điểm',
      meta: { sticky: 'left', width: '150px' },
      cell: ({ row }) => <span className="tabular-nums text-[12px]">{formatStamp(row.original.at)}</span>,
    },
    {
      accessorKey: 'referenceCode',
      header: 'Chứng từ',
      cell: ({ row }) => <span className="text-[13px] font-semibold text-ink">{row.original.referenceCode}</span>,
    },
    {
      accessorKey: 'kind',
      header: 'Loại',
      cell: ({ row }) => <span className="text-[12px] text-slate-600">{LEDGER_LABEL[row.original.kind]}</span>,
    },
    { accessorKey: 'sku', header: 'SKU', meta: { width: '88px' } },
    { accessorKey: 'productName', header: 'Sản phẩm' },
    {
      accessorKey: 'delta',
      header: 'Biến động',
      meta: { align: 'right', width: '100px' },
      cell: ({ row }) => (
        <span className={cn('tabular-nums font-semibold', row.original.delta < 0 ? 'text-rose-600' : 'text-emerald-700')}>
          {row.original.delta > 0 ? `+${formatQty(row.original.delta)}` : formatQty(row.original.delta)}
        </span>
      ),
    },
    {
      accessorKey: 'balanceAfter',
      header: 'Số dư',
      meta: { align: 'right', width: '88px' },
      cell: ({ row }) => <span className="tabular-nums">{formatQty(row.original.balanceAfter)}</span>,
    },
    {
      accessorKey: 'actorName',
      header: 'Nhân sự',
      meta: { sticky: 'right', width: '140px' },
    },
  ], [])

  function queueExport() {
    if (queued || !canExport || entries.length === 0) return
    setQueued(true)
    window.setTimeout(() => {
      const href = URL.createObjectURL(workbook(entries))
      publishDownload({
        id: Date.now(),
        title: 'Sổ cái đã sẵn sàng',
        body: 'Bấm để tải file Excel',
        href,
        download: 'so-cai-kho.xls',
        unread: true,
      })
      setQueued(false)
    }, 1400)
  }

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">Sổ cái tồn kho</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-slate-500">Tồn theo chi nhánh và từng dòng biến động. Số tồn chỉ đổi khi có chứng từ, không sửa tay.</p>
        </div>
        {canExport ? (
          <Button className="h-10 rounded-full bg-ink px-4 text-[12px] text-white hover:bg-black" disabled={queued || entries.length === 0} onClick={queueExport}>
            {queued ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {queued ? 'Đang xếp hàng...' : 'Xuất Excel sổ cái'}
          </Button>
        ) : (
          <p className="text-[12px] text-slate-400">Tài khoản này không có quyền xuất báo cáo.</p>
        )}
      </div>

      <section className="space-y-2">
        <h2 className="text-[15px] font-semibold text-ink">Tồn theo chi nhánh</h2>
        <CompactDataTable data={rows} columns={balanceColumns} loading={loading && inventory.length === 0} caption="Tồn kho theo chi nhánh" />
      </section>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-ink">Sổ cái biến động</h2>
          <p className="text-[12px] text-slate-400">{entries.length} dòng</p>
        </div>
        <CompactDataTable data={entries} columns={ledgerColumns} loading={loading && orders.length === 0} caption="Sổ cái tồn kho" />
      </section>
    </div>
  )
}
