import { withGrants } from './access.ts'
import { createSeed, type DemoState } from './seed.ts'
import { PRODUCTS, USERS, branchById, userById } from './catalog.ts'
import { CUSTOMERS } from './customers.ts'
import { holdsReservation } from '../lib/status.ts'
import type { InventoryRow, Order, OrderAction, OrderItem, OrderStatus, User } from '../types/index.ts'

const KEY = 'flowstate.demo.v2'

function load(): DemoState {
  const raw = sessionStorage.getItem(KEY)
  if (raw) {
    return JSON.parse(raw) as DemoState
  }
  const seeded = createSeed()
  sessionStorage.setItem(KEY, JSON.stringify(seeded))
  return seeded
}

function save(state: DemoState): void {
  sessionStorage.setItem(KEY, JSON.stringify(state))
}

function stockOf(state: DemoState, branchId: number, sku: string): InventoryRow {
  const row = state.inventory.find((item) => item.branchId === branchId && item.sku === sku)
  if (!row) throw new Error(`Không có tồn kho ${sku}`)
  return row
}

function withAvailability(order: Order, state: DemoState): Order {
  const items = order.items.map((item) => {
    const stock = stockOf(state, order.branchId, item.sku)
    const ownHold = holdsReservation(order.status) ? item.quantity : 0
    return { ...item, availableQuantity: stock.onHand - stock.reserved + ownHold }
  })
  return { ...order, items }
}

export function presentOrder(order: Order, user: User): Order {
  const visible = withAvailability(order, load())
  if (user.permissions.includes('orders.view_cost_price')) return visible
  const items: OrderItem[] = visible.items.map((item) => {
    const { costPrice: _cost, ...rest } = item
    return rest
  })
  const { costPrice: _cost, marginRate: _margin, ...rest } = visible
  return { ...rest, items }
}

export function authenticate(email: string, password: string): User | null {
  const user = USERS.find((item) => item.email === email && item.password === password)
  if (!user) return null
  const { password: _password, ...safe } = user
  return withGrants(safe)
}

export function listOrders(user: User): Order[] {
  const state = load()
  return state.orders
    .filter((order) => user.branchId === null || order.branchId === user.branchId)
    .map((order) => presentOrder(order, user))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function findOrder(user: User, id: number): Order | null {
  return listOrders(user).find((order) => order.id === id) ?? null
}

export function listInventory(user: User): InventoryRow[] {
  return load().inventory.filter((row) => user.branchId === null || row.branchId === user.branchId)
}

export function createDraftOrder(
  user: User,
  input: { customerId: number; branchId: number; lines: Array<{ sku: string; quantity: number }> },
): Order {
  if (user.branchId !== null && user.branchId !== input.branchId) {
    throw new DemoRequestError(403, 'forbidden', 'Không tạo đơn ngoài chi nhánh của bạn.')
  }
  const customer = CUSTOMERS.find((item) => item.id === input.customerId)
  if (!customer) throw new DemoRequestError(422, 'invalid', 'Chọn khách hàng trong danh sách.')
  if (customer.branchId !== input.branchId) {
    throw new DemoRequestError(422, 'invalid', 'Khách hàng không thuộc chi nhánh lập đơn.')
  }
  if (input.lines.length === 0) throw new DemoRequestError(422, 'invalid', 'Thêm ít nhất một sản phẩm.')
  const seen = new Set<string>()
  const branch = branchById(input.branchId)
  const state = load()
  const resolved = input.lines.map((line) => {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new DemoRequestError(422, 'invalid', 'Số lượng phải là số nguyên lớn hơn 0.')
    }
    if (seen.has(line.sku)) throw new DemoRequestError(422, 'invalid', `SKU ${line.sku} bị chọn hai lần.`)
    seen.add(line.sku)
    const product = PRODUCTS.find((item) => item.sku === line.sku)
    if (!product) throw new DemoRequestError(422, 'invalid', 'Không có SKU này.')
    const stock = stockOf(state, branch.id, product.sku)
    const available = stock.onHand - stock.reserved
    if (line.quantity > available) {
      throw new DemoRequestError(422, 'insufficient_stock', `Chi nhánh chỉ còn ${Math.max(0, available)} ${product.sku} khả dụng.`)
    }
    return { product, quantity: line.quantity }
  })
  const id = state.orders.reduce((max, order) => Math.max(max, order.id), 0) + 1
  const now = new Date().toISOString()
  const stamp = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(now))
    .replaceAll('-', '')
  const items = resolved.map((line, index) => {
    const total = line.product.unitPrice * line.quantity
    const cost = line.product.cost * line.quantity
    return {
      id: Date.now() + index,
      productId: line.product.id,
      sku: line.product.sku,
      name: line.product.name,
      unitPrice: line.product.unitPrice.toFixed(2),
      quantity: line.quantity,
      totalPrice: total.toFixed(2),
      costPrice: cost.toFixed(2),
      availableQuantity: 0,
    }
  })
  const subtotal = items.reduce((sum, item) => sum + Number(item.totalPrice), 0)
  const cost = items.reduce((sum, item) => sum + Number(item.costPrice), 0)
  const order: Order = {
    id,
    code: `ORD-${stamp}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
    branchId: branch.id,
    branchName: branch.name,
    branchCode: branch.code,
    customerId: customer.id,
    customerName: customer.name,
    createdBy: user.id,
    status: 'draft',
    subtotal: subtotal.toFixed(2),
    totalAmount: subtotal.toFixed(2),
    costPrice: cost.toFixed(2),
    marginRate: subtotal === 0 ? '0' : ((subtotal - cost) / subtotal).toFixed(4),
    items,
    auditLogs: [{
      id: Date.now(),
      orderId: id,
      fromStatus: null,
      toStatus: 'draft',
      actionBy: user.id,
      actorName: user.name,
      actorRole: user.roleLabel,
      note: 'Tạo đơn nháp.',
      createdAt: now,
    }],
    createdAt: now,
    updatedAt: now,
  }
  state.orders.unshift(order)
  save(state)
  return presentOrder(order, userById(user.id))
}

const NEXT: Record<OrderAction, OrderStatus> = {
  submit: 'pending_approval',
  approve: 'approved',
  reject: 'rejected',
  dispatch: 'dispatched',
  complete: 'completed',
  cancel: 'cancelled',
}

const ALLOWED: Record<OrderStatus, OrderAction[]> = {
  draft: ['submit', 'cancel'],
  pending_approval: ['approve', 'reject', 'cancel'],
  approved: ['dispatch', 'cancel'],
  dispatched: ['complete'],
  rejected: [],
  completed: [],
  cancelled: [],
}

export class DemoRequestError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function rememberKey(key: string): void {
  const state = load()
  if (state.idempotency.includes(key)) {
    throw new DemoRequestError(409, 'idempotency_conflict', 'Yêu cầu này đã được ghi nhận.')
  }
  state.idempotency.push(key)
  save(state)
}

export function releaseKey(key: string): void {
  const state = load()
  state.idempotency = state.idempotency.filter((item) => item !== key)
  save(state)
}

export function transitionOrder(user: User, id: number, action: OrderAction, note?: string): Order {
  const state = load()
  const order = state.orders.find((item) => item.id === id)
  if (!order) throw new DemoRequestError(404, 'not_found', 'Không tìm thấy đơn hàng.')
  if (user.branchId !== null && user.branchId !== order.branchId) {
    throw new DemoRequestError(404, 'not_found', 'Không tìm thấy đơn hàng.')
  }
  if (!ALLOWED[order.status].includes(action)) {
    throw new DemoRequestError(422, 'invalid_state_transition', 'Không thể chuyển trạng thái này.')
  }
  if ((action === 'reject' || action === 'cancel') && (note?.trim().length ?? 0) < 10) {
    throw new DemoRequestError(422, 'note_required', 'Lý do xử lý cần ít nhất 10 ký tự.')
  }

  if (action === 'submit' || action === 'dispatch') {
    for (const item of order.items) {
      const stock = stockOf(state, order.branchId, item.sku)
      const ownHold = holdsReservation(order.status) ? item.quantity : 0
      const available = stock.onHand - stock.reserved + ownHold
      if (item.quantity > available) {
        throw new DemoRequestError(
          409,
          'insufficient_stock',
          `Tồn kho chi nhánh không đủ để xuất (Thiếu ${item.sku}).`,
        )
      }
    }
  }

  const previous = order.status
  if (holdsReservation(previous) && (action === 'reject' || action === 'cancel' || action === 'dispatch')) {
    for (const item of order.items) {
      stockOf(state, order.branchId, item.sku).reserved -= item.quantity
    }
  }
  if (action === 'submit') {
    for (const item of order.items) {
      stockOf(state, order.branchId, item.sku).reserved += item.quantity
    }
  }
  if (action === 'dispatch') {
    for (const item of order.items) {
      stockOf(state, order.branchId, item.sku).onHand -= item.quantity
    }
  }

  const now = new Date().toISOString()
  order.status = NEXT[action]
  order.updatedAt = now
  order.auditLogs.push({
    id: Date.now(),
    orderId: order.id,
    fromStatus: previous,
    toStatus: order.status,
    actionBy: user.id,
    actorName: user.name,
    actorRole: user.roleLabel,
    note: note?.trim() || null,
    createdAt: now,
  })
  save(state)
  return presentOrder(order, userById(user.id))
}
