import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Header,
  type SortingState,
} from '@tanstack/react-table'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils.ts'
import { Select } from '../ui/select.tsx'
import { Skeleton } from '../ui/skeleton.tsx'

interface ColumnMeta {
  align?: 'left' | 'center' | 'right'
  sticky?: 'left' | 'right'
  width?: string
}

interface CompactDataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  loading?: boolean
  caption: string
  onRowClick?: (row: T) => void
  pageResetKey?: string
  fill?: boolean
}

const PAGE_SIZES = [10, 25, 50, 100]

function metaOf(meta: unknown): ColumnMeta {
  return (meta ?? {}) as ColumnMeta
}

function alignClass(align: ColumnMeta['align']): string {
  if (align === 'right') return 'text-right'
  if (align === 'center') return 'text-center'
  return 'text-left'
}

function stickyClass(sticky: ColumnMeta['sticky'], header: boolean): string {
  if (sticky === 'left') return header ? 'lg:sticky lg:left-0 lg:z-30' : 'lg:sticky lg:left-0 lg:z-10'
  if (sticky === 'right') return header ? 'lg:sticky lg:right-0 lg:z-30' : 'lg:sticky lg:right-0 lg:z-10'
  return header ? 'sticky top-0 z-20' : ''
}

export function CompactDataTable<T>({ data, columns, loading = false, caption, onRowClick, pageResetKey, fill = false }: CompactDataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    setPageIndex(0)
  }, [pageResetKey])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination: { pageIndex, pageSize } },
    onSortingChange: (updater) => {
      setSorting((current) => (typeof updater === 'function' ? updater(current) : updater))
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const pageCount = Math.max(1, table.getPageCount())
  const safeIndex = Math.min(pageIndex, Math.max(0, pageCount - 1))

  useEffect(() => {
    if (pageIndex > pageCount - 1) setPageIndex(Math.max(0, pageCount - 1))
  }, [pageCount, pageIndex])

  const rows = table.getRowModel().rows

  return (
    <div className={cn('overflow-hidden rounded-[20px] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)]', fill && 'flex min-h-0 flex-1 flex-col')}>
      <div className={cn(fill ? 'min-h-0 flex-1 overflow-auto' : 'overflow-auto')}>
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-[13px]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const meta = metaOf(header.column.columnDef.meta)
                  const sorted = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      style={{ width: meta.width, minWidth: meta.width }}
                      className={cn(
                        'sticky top-0 z-20 h-11 whitespace-nowrap border-b border-slate-100 bg-white px-3 text-[12px] font-medium text-slate-400',
                        alignClass(meta.align),
                        stickyClass(meta.sticky, true),
                        header.column.getCanSort() && 'cursor-pointer select-none',
                      )}
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <span className={cn('inline-flex items-center gap-1', meta.align === 'right' && 'flex-row-reverse')}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        <SortMark header={header} />
                      </span>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }, (_, index) => (
                <tr key={index} className="h-10">
                  {columns.map((column, columnIndex) => {
                    const meta = metaOf(column.meta)
                    return (
                      <td key={columnIndex} className={cn('border-b border-slate-100 bg-white px-3', stickyClass(meta.sticky, false))}>
                        <Skeleton className={cn('h-3', meta.align === 'right' ? 'ml-auto w-14' : 'w-24')} />
                      </td>
                    )
                  })}
                </tr>
              ))
              : null}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-slate-500">
                  Không có dữ liệu khớp bộ lọc.
                </td>
              </tr>
            ) : null}
            {!loading
              ? rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn('group h-10 hover:bg-slate-50', onRowClick && 'cursor-pointer')}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = metaOf(cell.column.columnDef.meta)
                    return (
                      <td
                        key={cell.id}
                        style={{ width: meta.width, minWidth: meta.width }}
                        className={cn(
                          'border-b border-slate-100 px-3 text-slate-700 group-hover:bg-slate-50',
                          alignClass(meta.align),
                          stickyClass(meta.sticky, false),
                          meta.sticky ? 'bg-white group-hover:bg-slate-50' : '',
                          'h-10',
                        )}
                        onClick={meta.sticky === 'right' ? (event) => event.stopPropagation() : undefined}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    )
                  })}
                </tr>
              ))
              : null}
          </tbody>
        </table>
      </div>
      {fill || data.length > pageSize ? <div className="flex h-10 shrink-0 items-center justify-between border-t border-slate-200 px-3 text-[12px] text-slate-500">
        <span className="font-mono tabular-nums">
          {data.length === 0 ? '0' : `${safeIndex * pageSize + 1}–${Math.min(data.length, (safeIndex + 1) * pageSize)}`} / {data.length}
        </span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5">
            Mỗi trang
            <Select
              className="h-7 w-auto rounded pl-1.5 text-[12px]"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value))
                setPageIndex(0)
              }}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </Select>
          </label>
          <button type="button" className="h-7 rounded border border-slate-200 px-2 disabled:opacity-40" disabled={safeIndex === 0} onClick={() => setPageIndex(safeIndex - 1)}>
            Trước
          </button>
          <span className="font-mono tabular-nums">{safeIndex + 1}/{pageCount}</span>
          <button type="button" className="h-7 rounded border border-slate-200 px-2 disabled:opacity-40" disabled={safeIndex >= pageCount - 1} onClick={() => setPageIndex(safeIndex + 1)}>
            Sau
          </button>
        </div>
      </div> : null}
    </div>
  )
}

function SortMark<T>({ header }: { header: Header<T, unknown> }) {
  const sorted = header.column.getIsSorted()
  if (!sorted) return null
  return sorted === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
}
