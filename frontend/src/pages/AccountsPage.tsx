import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { CompactDataTable } from '../components/orders/CompactDataTable.tsx'
import { BRANCHES, USERS } from '../data/catalog.ts'
import { useErp } from '../context/ErpContext.tsx'
import { cn } from '../lib/utils.ts'
import type { UserRole } from '../types/index.ts'

interface AccountRow {
  id: number
  name: string
  email: string
  role: UserRole
  roleLabel: string
  branchName: string
  grants: number
}

const ROLES: Array<{ id: UserRole | 'all'; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'super-admin', label: 'Super Admin' },
  { id: 'branch-manager', label: 'Quản lý' },
  { id: 'sales-staff', label: 'Kinh doanh' },
  { id: 'warehouse', label: 'Thủ kho' },
]

export function AccountsPage() {
  const { grants } = useErp()
  const [role, setRole] = useState<UserRole | 'all'>('all')
  const rows = useMemo<AccountRow[]>(() => USERS
    .filter((account) => role === 'all' || account.role === role)
    .map((account) => ({
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      roleLabel: account.roleLabel,
      branchName: BRANCHES.find((branch) => branch.id === account.branchId)?.name ?? 'Toàn hệ thống',
      grants: grants[account.role].length,
    })), [role, grants])

  const columns = useMemo<ColumnDef<AccountRow>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Tài khoản',
      meta: { sticky: 'left', width: '180px' },
      cell: ({ row }) => <span className="font-semibold text-ink">{row.original.name}</span>,
    },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'roleLabel',
      header: 'Vai trò',
      meta: { align: 'center', width: '150px' },
      cell: ({ row }) => (
        <span className={cn(
          'inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold',
          row.original.role === 'super-admin' && 'bg-[#eef0f3] text-ink',
          row.original.role === 'branch-manager' && 'bg-[#e7f0ff] text-[#315fb8]',
          row.original.role === 'sales-staff' && 'bg-[#e7f8ef] text-[#1d8a56]',
          row.original.role === 'warehouse' && 'bg-[#fff4d6] text-[#8a6410]',
        )}
        >
          {row.original.roleLabel}
        </span>
      ),
    },
    { accessorKey: 'branchName', header: 'Chi nhánh', meta: { align: 'center', width: '140px' } },
    {
      accessorKey: 'grants',
      header: 'Quyền',
      meta: { align: 'right', sticky: 'right', width: '90px' },
      cell: ({ row }) => <span className="tabular-nums">{row.original.grants}</span>,
    },
  ], [])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-slate-500">{rows.length} tài khoản demo, mật khẩu chung là password</p>
        <div className="flex flex-wrap gap-1">
          {ROLES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                'h-8 rounded-full px-3 text-[12px] font-medium',
                role === item.id ? 'bg-ink text-white' : 'bg-white text-slate-500 shadow-[0_6px_16px_rgba(15,23,42,0.04)]',
              )}
              onClick={() => setRole(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <CompactDataTable data={rows} columns={columns} caption="Danh sách tài khoản" pageResetKey={role} fill />
    </div>
  )
}
