import type { User, UserRole } from '../types/index.ts'

export interface PermissionDef {
  slug: string
  name: string
  detail: string
  group: 'orders' | 'inventory' | 'reports' | 'settings'
  special?: boolean
}

export const PERMISSION_GROUPS: Array<{ id: PermissionDef['group']; label: string }> = [
  { id: 'orders', label: 'Đơn hàng' },
  { id: 'inventory', label: 'Kho bãi' },
  { id: 'reports', label: 'Báo cáo' },
  { id: 'settings', label: 'Cấu hình' },
]

export const PERMISSIONS: PermissionDef[] = [
  { slug: 'orders.create', name: 'Tạo đơn', detail: 'Tạo và gửi đơn nháp', group: 'orders' },
  { slug: 'orders.view', name: 'Xem đơn', detail: 'Xem đơn trong phạm vi chi nhánh', group: 'orders' },
  { slug: 'orders.update', name: 'Sửa đơn nháp', detail: 'Cập nhật đơn khi còn ở trạng thái nháp', group: 'orders' },
  { slug: 'orders.approve', name: 'Duyệt đơn', detail: 'Phê duyệt hoặc từ chối đơn chờ duyệt', group: 'orders' },
  { slug: 'orders.dispatch', name: 'Xuất kho', detail: 'Xuất đơn đã duyệt và xác nhận hoàn tất', group: 'orders' },
  { slug: 'orders.cancel', name: 'Hủy đơn', detail: 'Hủy đơn trước khi xuất kho', group: 'orders' },
  { slug: 'orders.view_cost_price', name: 'Xem giá vốn', detail: 'Xem giá vốn và biên lợi nhuận', group: 'orders', special: true },
  { slug: 'orders.approve_high_discount', name: 'Duyệt chiết khấu cao', detail: 'Phê duyệt đơn vượt ngưỡng chiết khấu', group: 'orders', special: true },
  { slug: 'inventory.view', name: 'Xem tồn kho', detail: 'Xem tồn thực tế và hàng đang giữ', group: 'inventory' },
  { slug: 'inventory.manual_adjust', name: 'Điều chỉnh kho', detail: 'Ghi điều chỉnh tay vào sổ cái', group: 'inventory', special: true },
  { slug: 'reports.export', name: 'Xuất báo cáo', detail: 'Đưa sổ cái vào hàng đợi xuất Excel', group: 'reports' },
  { slug: 'settings.manage', name: 'Cấu hình hệ thống', detail: 'Sửa ma trận quyền và danh mục vai trò', group: 'settings' },
]

const ALL = PERMISSIONS.map((item) => item.slug)

export const ROLE_GRANTS: Record<UserRole, string[]> = {
  'super-admin': ALL,
  'branch-manager': ALL,
  'sales-staff': ['orders.create', 'orders.view', 'orders.update', 'orders.cancel', 'inventory.view'],
  warehouse: ['orders.view', 'orders.dispatch', 'inventory.view', 'inventory.manual_adjust'],
}

const GRANTS_KEY = 'flowstate.grants.v1'

function blankGrants(): Record<UserRole, string[]> {
  return {
    'super-admin': [...ROLE_GRANTS['super-admin']],
    'branch-manager': [...ROLE_GRANTS['branch-manager']],
    'sales-staff': [...ROLE_GRANTS['sales-staff']],
    warehouse: [...ROLE_GRANTS.warehouse],
  }
}

export function loadGrants(): Record<UserRole, string[]> {
  const defaults = blankGrants()
  if (typeof sessionStorage === 'undefined') return defaults
  const raw = sessionStorage.getItem(GRANTS_KEY)
  if (!raw) return defaults
  try {
    const parsed = JSON.parse(raw) as Partial<Record<UserRole, string[]>>
    const known = new Set(PERMISSIONS.map((item) => item.slug))
    for (const role of Object.keys(defaults) as UserRole[]) {
      const saved = parsed[role]
      if (!Array.isArray(saved)) continue
      defaults[role] = saved.filter((slug) => known.has(slug))
    }
    return defaults
  } catch {
    return defaults
  }
}

export function saveGrants(grants: Record<UserRole, string[]>): void {
  sessionStorage.setItem(GRANTS_KEY, JSON.stringify(grants))
}

export function roleHas(role: UserRole, slug: string, grants: Record<UserRole, string[]> = loadGrants()): boolean {
  return grants[role].includes(slug)
}

export function withGrants(user: User): User {
  return { ...user, permissions: [...loadGrants()[user.role]] }
}
