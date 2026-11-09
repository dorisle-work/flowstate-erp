import { Fragment } from 'react'
import { PERMISSION_GROUPS, PERMISSIONS } from '../data/access.ts'
import { useErp } from '../context/ErpContext.tsx'
import type { UserRole } from '../types/index.ts'

const ROLES: Array<{ id: UserRole; label: string; scope: string }> = [
  { id: 'super-admin', label: 'Super Admin', scope: 'Mọi chi nhánh' },
  { id: 'branch-manager', label: 'Quản lý chi nhánh', scope: 'Một chi nhánh' },
  { id: 'sales-staff', label: 'Nhân viên bán hàng', scope: 'Một chi nhánh' },
  { id: 'warehouse', label: 'Thủ kho', scope: 'Một chi nhánh' },
]

export function PermissionsPage() {
  const { user, grants, toggleGrant } = useErp()
  const canEdit = Boolean(user?.permissions.includes('settings.manage'))

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
      <div className="shrink-0">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Ma trận phân quyền</h1>
        <p className="mt-1 max-w-3xl text-[13px] text-slate-500">
          Quyền gắn theo vai trò, không theo cờ quản trị. Tích một ô là áp dụng ngay cho mọi tài khoản mang vai trò đó.
          {canEdit ? '' : ' Chỉ Super Admin được sửa ma trận.'}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-[20px] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left">
          <caption className="sr-only">Ma trận phân quyền theo vai trò</caption>
          <thead>
            <tr className="text-[12px] font-medium text-slate-400">
              <th className="sticky top-0 z-10 h-14 border-b border-slate-100 bg-white px-4 font-medium">Quyền</th>
              {ROLES.map((role) => (
                <th key={role.id} className="sticky top-0 z-10 h-14 border-b border-slate-100 bg-white px-3 text-center font-medium">
                  <span className="block text-[13px] font-semibold text-ink">{role.label}</span>
                  <span className="font-normal">{role.scope}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((group) => (
              <Fragment key={group.id}>
                <tr className="bg-[#f5f6f8]">
                  <td colSpan={ROLES.length + 1} className="h-9 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{group.label}</td>
                </tr>
                {PERMISSIONS.filter((item) => item.group === group.id).map((permission) => (
                  <tr key={permission.slug} className="border-b border-slate-100 last:border-b-0">
                    <td className="h-12 px-4">
                      <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
                        {permission.name}
                        {permission.special ? <span className="rounded-full bg-[#fff4d6] px-2 py-0.5 text-[10px] font-semibold text-[#8a6410]">Đặc quyền</span> : null}
                      </p>
                      <p className="text-[12px] text-slate-400">{permission.detail}</p>
                    </td>
                    {ROLES.map((role) => {
                      const allowed = grants[role.id].includes(permission.slug)
                      return (
                        <td key={role.id} className="px-3 text-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[#1c1f26] disabled:opacity-50"
                            checked={allowed}
                            disabled={!canEdit}
                            aria-label={`${role.label} ${permission.name}`}
                            onChange={() => toggleGrant(role.id, permission.slug)}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
