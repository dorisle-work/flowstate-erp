import type { Order, OrderAction, OrderItem, OrderStatus, User } from '../types/index.ts'

export const STATUS_LABEL: Record<OrderStatus, string> = {
  draft: 'Nháp',
  pending_approval: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  dispatched: 'Xuất kho',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
}

export const FLOW_STEPS: OrderStatus[] = [
  'draft',
  'pending_approval',
  'approved',
  'dispatched',
  'completed',
]

export const ACTION_LABEL: Record<OrderAction, string> = {
  submit: 'Gửi duyệt',
  approve: 'Phê duyệt',
  reject: 'Từ chối',
  dispatch: 'Xuất kho',
  complete: 'Xác nhận hoàn tất',
  cancel: 'Hủy đơn',
}

export const ACTION_PENDING: Record<OrderAction, string> = {
  submit: 'Đang gửi duyệt...',
  approve: 'Đang phê duyệt...',
  reject: 'Đang ghi nhận...',
  dispatch: 'Đang xuất kho...',
  complete: 'Đang ghi nhận...',
  cancel: 'Đang ghi nhận...',
}

const HOLDS = new Set<OrderStatus>(['pending_approval', 'approved'])

export function holdsReservation(status: OrderStatus): boolean {
  return HOLDS.has(status)
}

export const SAFETY_QTY = 20

export function actionsFor(user: User, order: Order): OrderAction[] {
  if (user.role !== 'super-admin' && user.branchId !== order.branchId) return []
  const can = (slug: string) => user.permissions.includes(slug)
  const actions: OrderAction[] = []
  if (order.status === 'draft') {
    if (can('orders.create') || can('orders.update')) actions.push('submit')
    if (can('orders.cancel')) actions.push('cancel')
  } else if (order.status === 'pending_approval') {
    if (can('orders.approve')) actions.push('approve', 'reject')
    if (can('orders.cancel')) actions.push('cancel')
  } else if (order.status === 'approved') {
    if (can('orders.dispatch')) actions.push('dispatch')
    if (can('orders.cancel')) actions.push('cancel')
  } else if (order.status === 'dispatched' && can('orders.dispatch')) {
    actions.push('complete')
  }
  return actions
}

export function stockShortages(order: Order): string[] {
  return order.items.filter((item) => item.quantity > item.availableQuantity).map((item) => item.sku)
}

export type StockTone = 'ok' | 'low' | 'short'

export function stockTone(item: OrderItem): StockTone {
  if (item.quantity > item.availableQuantity) return 'short'
  if (item.availableQuantity < SAFETY_QTY || item.availableQuantity - item.quantity < SAFETY_QTY) return 'low'
  return 'ok'
}

export function canViewCost(user: User | null): boolean {
  return Boolean(user?.permissions.includes('orders.view_cost_price'))
}
