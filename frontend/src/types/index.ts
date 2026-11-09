export type OrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'dispatched'
  | 'completed'
  | 'cancelled'

export type UserRole = 'super-admin' | 'branch-manager' | 'sales-staff' | 'warehouse'

export type OrderAction = 'submit' | 'approve' | 'reject' | 'dispatch' | 'complete' | 'cancel'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  roleLabel: 'Super Admin' | 'Branch Manager' | 'Sales Staff' | 'Thủ kho'
  branchId: number | null
  permissions: string[]
}

export interface Branch {
  id: number
  code: string
  name: string
}

export interface Customer {
  id: number
  code: string
  name: string
  phone: string
  branchId: number
}

export interface OrderItem {
  id: number
  productId: number
  sku: string
  name: string
  unitPrice: string
  quantity: number
  totalPrice: string
  costPrice?: string
  availableQuantity: number
}

export interface AuditLog {
  id: number
  orderId: number
  fromStatus: OrderStatus | null
  toStatus: OrderStatus
  actionBy: number
  actorName: string
  actorRole: string
  note: string | null
  createdAt: string
}

export interface Order {
  id: number
  code: string
  branchId: number
  branchName: string
  branchCode: string
  customerId: number | null
  customerName: string
  createdBy: number
  status: OrderStatus
  subtotal: string
  totalAmount: string
  costPrice?: string
  marginRate?: string
  items: OrderItem[]
  auditLogs: AuditLog[]
  createdAt: string
  updatedAt: string
}

export interface InventoryRow {
  id: number
  branchId: number
  branchName: string
  sku: string
  productName: string
  onHand: number
  reserved: number
}

export interface Notice {
  id: number
  title: string
  body: string
  orderId?: number
  href?: string
  download?: string
  unread: boolean
}
