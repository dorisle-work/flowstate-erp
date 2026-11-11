import { withGrants } from './access.ts'
import { createSeed, type CatalogProductState, type DemoState } from './seed.ts'
import { USERS, branchById, userById } from './catalog.ts'
import { holdsReservation } from '../lib/status.ts'
import type { Customer, InventoryRow, Notice, Order, OrderAction, OrderItem, OrderStatus, User } from '../types/index.ts'
import type { LedgerEntry } from '../types/erp.ts'

const KEY = 'flowstate.demo.v3'

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

export function listCustomers(user: User): Customer[] {
  return load().customers.filter((item) => user.branchId === null || item.branchId === user.branchId)
}

export function listProducts(): CatalogProductState[] {
  return load().products
}

export function listNotices(): Notice[] {
  return load().notices
}

export function listMovements(): LedgerEntry[] {
  return load().movements ?? []
}

function resolveLines(
  state: DemoState,
  branchId: number,
  lines: Array<{ sku: string; quantity: number }>,
): Array<{ product: CatalogProductState; quantity: number }> {
  if (lines.length === 0) throw new DemoRequestError(422, 'invalid', 'Thêm ít nhất một sản phẩm.')
  const seen = new Set<string>()
  return lines.map((line) => {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new DemoRequestError(422, 'invalid', 'Số lượng phải là số nguyên lớn hơn 0.')
    }
    if (seen.has(line.sku)) throw new DemoRequestError(422, 'invalid', `SKU ${line.sku} bị chọn hai lần.`)
    seen.add(line.sku)
    const product = state.products.find((item) => item.sku === line.sku)
    if (!product) throw new DemoRequestError(422, 'invalid', 'Không có SKU này.')
    const stock = stockOf(state, branchId, product.sku)
    const available = stock.onHand - stock.reserved
    if (line.quantity > available) {
      throw new DemoRequestError(422, 'insufficient_stock', `Chi nhánh chỉ còn ${Math.max(0, available)} ${product.sku} khả dụng.`)
    }
    return { product, quantity: line.quantity }
  })
}

function buildItems(resolved: Array<{ product: CatalogProductState; quantity: number }>): OrderItem[] {
  return resolved.map((line, index) => {
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
}

export function createDraftOrder(
  user: User,
  input: { customerId: number; branchId: number; lines: Array<{ sku: string; quantity: number }> },
): Order {
  if (user.branchId !== null && user.branchId !== input.branchId) {
    throw new DemoRequestError(403, 'forbidden', 'Không tạo đơn ngoài chi nhánh của bạn.')
  }
  const state = load()
  const customer = state.customers.find((item) => item.id === input.customerId)
  if (!customer) throw new DemoRequestError(422, 'invalid', 'Chọn khách hàng trong danh sách.')
  if (customer.branchId !== input.branchId) {
    throw new DemoRequestError(422, 'invalid', 'Khách hàng không thuộc chi nhánh lập đơn.')
  }
  const branch = branchById(input.branchId)
  const resolved = resolveLines(state, branch.id, input.lines)
  const id = state.orders.reduce((max, order) => Math.max(max, order.id), 0) + 1
  const now = new Date().toISOString()
  const stamp = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(now))
    .replaceAll('-', '')
  const items = buildItems(resolved)
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

export function updateDraftOrder(
  user: User,
  id: number,
  input: { customerId: number; lines: Array<{ sku: string; quantity: number }> },
): Order {
  const state = load()
  const order = state.orders.find((item) => item.id === id)
  if (!order) throw new DemoRequestError(404, 'not_found', 'Không tìm thấy đơn hàng.')
  if (user.branchId !== null && user.branchId !== order.branchId) {
    throw new DemoRequestError(404, 'not_found', 'Không tìm thấy đơn hàng.')
  }
  if (order.status !== 'draft') throw new DemoRequestError(422, 'invalid_state_transition', 'Chỉ sửa được đơn nháp.')
  const customer = state.customers.find((item) => item.id === input.customerId)
  if (!customer) throw new DemoRequestError(422, 'invalid', 'Chọn khách hàng trong danh sách.')
  if (customer.branchId !== order.branchId) {
    throw new DemoRequestError(422, 'invalid', 'Khách hàng không thuộc chi nhánh lập đơn.')
  }
  const resolved = resolveLines(state, order.branchId, input.lines)
  const items = buildItems(resolved)
  const subtotal = items.reduce((sum, item) => sum + Number(item.totalPrice), 0)
  const cost = items.reduce((sum, item) => sum + Number(item.costPrice), 0)
  order.customerId = customer.id
  order.customerName = customer.name
  order.items = items
  order.subtotal = subtotal.toFixed(2)
  order.totalAmount = subtotal.toFixed(2)
  order.costPrice = cost.toFixed(2)
  order.marginRate = subtotal === 0 ? '0' : ((subtotal - cost) / subtotal).toFixed(4)
  order.updatedAt = new Date().toISOString()
  save(state)
  return presentOrder(order, userById(user.id))
}

export function upsertCustomer(
  user: User,
  input: { id?: number; code: string; name: string; phone: string; branchId: number },
): Customer {
  if (!user.permissions.includes('orders.create')) {
    throw new DemoRequestError(403, 'forbidden', 'Không có quyền cập nhật khách hàng.')
  }
  if (user.branchId !== null && user.branchId !== input.branchId) {
    throw new DemoRequestError(403, 'forbidden', 'Không tạo khách ngoài chi nhánh của bạn.')
  }
  const state = load()
  const code = input.code.trim().toUpperCase()
  const duplicate = state.customers.find((item) => item.code === code && item.id !== input.id)
  if (duplicate) throw new DemoRequestError(422, 'invalid', 'Mã khách đã tồn tại.')
  if (input.id) {
    const current = state.customers.find((item) => item.id === input.id)
    if (!current) throw new DemoRequestError(404, 'not_found', 'Không tìm thấy khách hàng.')
    current.code = code
    current.name = input.name.trim()
    current.phone = input.phone.trim()
    current.branchId = input.branchId
    save(state)
    return current
  }
  const id = state.customers.reduce((max, item) => Math.max(max, item.id), 0) + 1
  const created: Customer = {
    id,
    code,
    name: input.name.trim(),
    phone: input.phone.trim(),
    branchId: input.branchId,
  }
  state.customers.push(created)
  save(state)
  return created
}

export function deleteCustomer(user: User, id: number): void {
  if (!user.permissions.includes('settings.manage')) {
    throw new DemoRequestError(403, 'forbidden', 'Không có quyền xóa khách hàng.')
  }
  const state = load()
  if (state.orders.some((order) => order.customerId === id)) {
    throw new DemoRequestError(422, 'invalid', 'Khách đã có đơn, không xóa được.')
  }
  state.customers = state.customers.filter((item) => item.id !== id)
  save(state)
}

export function upsertProduct(
  user: User,
  input: { id?: number; sku: string; name: string; unitPrice: number; cost: number },
): CatalogProductState {
  if (!user.permissions.includes('settings.manage')) {
    throw new DemoRequestError(403, 'forbidden', 'Không có quyền cập nhật sản phẩm.')
  }
  const state = load()
  const sku = input.sku.trim().toUpperCase()
  if (state.products.some((item) => item.sku === sku && item.id !== input.id)) {
    throw new DemoRequestError(422, 'invalid', 'SKU đã tồn tại.')
  }
  if (input.id) {
    const current = state.products.find((item) => item.id === input.id)
    if (!current) throw new DemoRequestError(404, 'not_found', 'Không tìm thấy sản phẩm.')
    const previousSku = current.sku
    current.sku = sku
    current.name = input.name.trim()
    current.unitPrice = input.unitPrice
    current.cost = input.cost
    for (const row of state.inventory) {
      if (row.sku === previousSku) {
        row.sku = sku
        row.productName = current.name
      }
    }
    save(state)
    return current
  }
  const id = state.products.reduce((max, item) => Math.max(max, item.id), 0) + 1
  const created: CatalogProductState = {
    id,
    sku,
    name: input.name.trim(),
    unitPrice: input.unitPrice,
    cost: input.cost,
  }
  state.products.push(created)
  let stockId = state.inventory.reduce((max, item) => Math.max(max, item.id), 0) + 1
  for (const branch of [1, 2, 3].map((branchId) => branchById(branchId))) {
    state.inventory.push({
      id: stockId++,
      branchId: branch.id,
      branchName: branch.name,
      sku: created.sku,
      productName: created.name,
      onHand: 0,
      reserved: 0,
    })
  }
  save(state)
  return created
}

export function deleteProduct(user: User, id: number): void {
  if (!user.permissions.includes('settings.manage')) {
    throw new DemoRequestError(403, 'forbidden', 'Không có quyền xóa sản phẩm.')
  }
  const state = load()
  const product = state.products.find((item) => item.id === id)
  if (!product) throw new DemoRequestError(404, 'not_found', 'Không tìm thấy sản phẩm.')
  if (state.orders.some((order) => order.items.some((item) => item.sku === product.sku))) {
    throw new DemoRequestError(422, 'invalid', 'Sản phẩm đã nằm trên đơn, không xóa được.')
  }
  state.products = state.products.filter((item) => item.id !== id)
  state.inventory = state.inventory.filter((item) => item.sku !== product.sku)
  save(state)
}

export function adjustStock(
  user: User,
  input: { branchId: number; sku: string; quantityDelta: number; note?: string },
): InventoryRow {
  if (!user.permissions.includes('inventory.manual_adjust')) {
    throw new DemoRequestError(403, 'forbidden', 'Không có quyền điều chỉnh kho.')
  }
  if (user.branchId !== null && user.branchId !== input.branchId) {
    throw new DemoRequestError(403, 'forbidden', 'Không chỉnh kho ngoài chi nhánh của bạn.')
  }
  if (!Number.isInteger(input.quantityDelta) || input.quantityDelta === 0) {
    throw new DemoRequestError(422, 'invalid', 'Số điều chỉnh phải khác 0.')
  }
  const state = load()
  const row = stockOf(state, input.branchId, input.sku)
  const next = row.onHand + input.quantityDelta
  if (next < 0) throw new DemoRequestError(422, 'invalid', 'Tồn thực tế không được âm.')
  if (next < row.reserved) throw new DemoRequestError(422, 'invalid', 'Tồn thực tế không được thấp hơn số đang giữ.')
  row.onHand = next
  const now = new Date().toISOString()
  state.movements = state.movements ?? []
  state.movements.unshift({
    id: `adj-${Date.now()}`,
    kind: 'adjust',
    sku: row.sku,
    productName: row.productName,
    delta: input.quantityDelta,
    balanceAfter: row.onHand,
    at: now,
    branchId: row.branchId,
    referenceCode: `ADJ-${now.slice(0, 10).replaceAll('-', '')}`,
    actorName: user.name,
  })
  pushNotice(state, {
    title: `Điều chỉnh ${input.sku}`,
    body: `${input.quantityDelta > 0 ? '+' : ''}${input.quantityDelta} · ${row.branchName}${input.note ? ` · ${input.note}` : ''}`,
  })
  save(state)
  return row
}

export function receivePurchase(
  user: User,
  input: { branchId: number; sku: string; quantity: number; supplierRef?: string },
): InventoryRow {
  if (!user.permissions.includes('inventory.manual_adjust')) {
    throw new DemoRequestError(403, 'forbidden', 'Không có quyền nhập kho.')
  }
  if (user.branchId !== null && user.branchId !== input.branchId) {
    throw new DemoRequestError(403, 'forbidden', 'Không nhập kho ngoài chi nhánh của bạn.')
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new DemoRequestError(422, 'invalid', 'Số lượng nhập phải ≥ 1.')
  }
  const state = load()
  const row = stockOf(state, input.branchId, input.sku)
  row.onHand += input.quantity
  const now = new Date().toISOString()
  state.movements = state.movements ?? []
  state.movements.unshift({
    id: `pn-${Date.now()}`,
    kind: 'purchase',
    sku: row.sku,
    productName: row.productName,
    delta: input.quantity,
    balanceAfter: row.onHand,
    at: now,
    branchId: row.branchId,
    referenceCode: input.supplierRef?.trim() || `PN-${now.slice(0, 10).replaceAll('-', '')}`,
    actorName: user.name,
  })
  pushNotice(state, {
    title: `Nhập kho NCC ${input.sku}`,
    body: `+${input.quantity} · ${row.branchName}${input.supplierRef ? ` · ${input.supplierRef}` : ''}`,
  })
  save(state)
  return row
}

function pushNotice(state: DemoState, input: { title: string; body: string; href?: string; orderId?: number }): void {
  state.notices.unshift({
    id: Date.now() + state.notices.length,
    title: input.title,
    body: input.body,
    href: input.href,
    orderId: input.orderId,
    unread: true,
  })
  state.notices = state.notices.slice(0, 40)
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

const STATUS_LABEL: Record<OrderStatus, string> = {
  draft: 'Nháp',
  pending_approval: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  dispatched: 'Xuất kho',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
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
  pushNotice(state, {
    title: `${order.code} · ${STATUS_LABEL[order.status]}`,
    body: `Từ ${STATUS_LABEL[previous]} sang ${STATUS_LABEL[order.status]}${note ? ` · ${note}` : ''} · Telegram: chưa cấu hình`,
    href: `/orders/${order.code}`,
    orderId: order.id,
  })
  save(state)
  return presentOrder(order, userById(user.id))
}
