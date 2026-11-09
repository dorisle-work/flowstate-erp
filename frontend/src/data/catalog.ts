import type { Branch, User } from '../types/index.ts'

export const BRANCHES: Branch[] = [
  { id: 1, code: 'HN', name: 'Hà Nội' },
  { id: 2, code: 'HCM', name: 'TP.HCM' },
  { id: 3, code: 'DN', name: 'Đà Nẵng' },
]

const COST = 'orders.view_cost_price'

export const USERS: Array<User & { password: string }> = [
  {
    id: 1,
    name: 'Super Admin',
    email: 'superadmin@flowstate.test',
    password: 'password',
    role: 'super-admin',
    roleLabel: 'Super Admin',
    branchId: null,
    permissions: [COST, 'orders.view', 'orders.update', 'orders.cancel'],
  },
  {
    id: 2,
    name: 'Quản lý Hà Nội',
    email: 'manager.hn@flowstate.test',
    password: 'password',
    role: 'branch-manager',
    roleLabel: 'Branch Manager',
    branchId: 1,
    permissions: [COST, 'orders.view', 'orders.update'],
  },
  {
    id: 3,
    name: 'Quản lý TP.HCM',
    email: 'manager.hcm@flowstate.test',
    password: 'password',
    role: 'branch-manager',
    roleLabel: 'Branch Manager',
    branchId: 2,
    permissions: [COST, 'orders.view', 'orders.update'],
  },
  {
    id: 4,
    name: 'Kinh doanh Hà Nội',
    email: 'sales.hn@flowstate.test',
    password: 'password',
    role: 'sales-staff',
    roleLabel: 'Sales Staff',
    branchId: 1,
    permissions: ['orders.view', 'orders.update'],
  },
  {
    id: 5,
    name: 'Kinh doanh TP.HCM',
    email: 'sales.hcm@flowstate.test',
    password: 'password',
    role: 'sales-staff',
    roleLabel: 'Sales Staff',
    branchId: 2,
    permissions: ['orders.view', 'orders.update'],
  },
  {
    id: 6,
    name: 'Thủ kho Đà Nẵng',
    email: 'kho.dn@flowstate.test',
    password: 'password',
    role: 'warehouse',
    roleLabel: 'Thủ kho',
    branchId: 3,
    permissions: ['orders.view', 'orders.dispatch', 'inventory.view', 'inventory.manual_adjust'],
  },
]

export interface ProductSeed {
  id: number
  sku: string
  name: string
  unitPrice: number
  cost: number
}

export const PRODUCTS: ProductSeed[] = [
  { id: 1, sku: 'FS-001', name: 'Gạo ST25 túi 5kg', unitPrice: 185000, cost: 142000 },
  { id: 2, sku: 'FS-002', name: 'Cà phê hạt Robusta 1kg', unitPrice: 96000, cost: 71000 },
  { id: 3, sku: 'FS-008', name: 'Nước mắm nhĩ 500ml', unitPrice: 42000, cost: 28000 },
  { id: 4, sku: 'FS-014', name: 'Thùng carton 5 lớp', unitPrice: 12500, cost: 8000 },
  { id: 5, sku: 'FS-017', name: 'Màng co PE 50cm', unitPrice: 68000, cost: 51000 },
  { id: 6, sku: 'FS-020', name: 'Khay nhựa 600×400', unitPrice: 74000, cost: 56000 },
]

export function branchById(id: number): Branch {
  const branch = BRANCHES.find((item) => item.id === id)
  if (!branch) throw new Error(`Unknown branch ${id}`)
  return branch
}

export function userById(id: number): User {
  const user = USERS.find((item) => item.id === id)
  if (!user) throw new Error(`Unknown user ${id}`)
  return user
}
