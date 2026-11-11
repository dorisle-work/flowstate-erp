import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { loadGrants, ROLE_GRANTS, saveGrants, withGrants, type PermissionDef, PERMISSIONS } from '../data/access.ts'
import { BRANCHES, USERS } from '../data/catalog.ts'
import {
  adjustStock,
  authenticate,
  createDraftOrder,
  deleteCustomer,
  deleteProduct,
  DemoRequestError,
  findOrder,
  listCustomers,
  listInventory,
  listMovements,
  listNotices,
  listOrders,
  listProducts,
  receivePurchase,
  releaseKey,
  rememberKey,
  transitionOrder,
  updateDraftOrder,
  upsertCustomer,
  upsertProduct,
} from '../data/demoStore.ts'
import type { LedgerEntry } from '../types/erp.ts'
import type { Branch, Customer, InventoryRow, Notice, Order, OrderAction, User, UserRole } from '../types/index.ts'
import { USE_MOCK } from './runtime.ts'
import { readToken, userFromToken, writeUser } from './session.ts'

const MUTATIONS = new Set(['post', 'put', 'patch', 'delete'])

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = readToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  const method = (config.method ?? 'get').toLowerCase()
  if (MUTATIONS.has(method) && method !== 'delete' && !config.headers.get('X-Idempotency-Key') && !String(config.url ?? '').includes('auth/')) {
    config.headers.set('X-Idempotency-Key', crypto.randomUUID())
  }
  return config
})

function ok<T>(config: InternalAxiosRequestConfig, data: T, status = 200): AxiosResponse<T> {
  return { data, status, statusText: 'OK', headers: {}, config }
}

function fail(config: InternalAxiosRequestConfig, error: DemoRequestError): AxiosError {
  return new AxiosError(error.message, String(error.status), config, null, {
    data: { message: error.message, code: error.code },
    status: error.status,
    statusText: error.code,
    headers: {},
    config,
  })
}

function pathOf(config: InternalAxiosRequestConfig): string {
  const raw = `${config.baseURL ?? ''}${config.url ?? ''}`
  return raw.replace(/^https?:\/\/[^/]+/, '').split('?')[0] ?? ''
}

function parseBody<T>(config: InternalAxiosRequestConfig): T {
  return (typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data ?? {}) as T
}

function mockRoute(config: InternalAxiosRequestConfig): AxiosResponse {
  const method = (config.method ?? 'get').toLowerCase()
  const path = pathOf(config)
  const key = config.headers.get('X-Idempotency-Key')
  const idempotent = MUTATIONS.has(method) && method !== 'delete' && typeof key === 'string' && path !== '/api/v1/auth/login'

  try {
    if (idempotent) rememberKey(key)
    return ok(config, handle(config, method, path), method === 'post' && path.endsWith('/orders') ? 201 : 200)
  } catch (error) {
    if (idempotent && !(error instanceof DemoRequestError && error.code === 'idempotency_conflict')) {
      releaseKey(key)
    }
    if (error instanceof DemoRequestError) throw fail(config, error)
    throw error
  }
}

function handle(config: InternalAxiosRequestConfig, method: string, path: string): unknown {
  if (method === 'post' && path === '/api/v1/auth/login') {
    const body = parseBody<{ email?: string; password?: string }>(config)
    const user = authenticate(body.email ?? '', body.password ?? '')
    if (!user) throw new DemoRequestError(422, 'invalid_credentials', 'Email hoặc mật khẩu không đúng.')
    return { token: `demo:${user.id}`, token_type: 'Bearer', user }
  }

  const user = userFromToken(readToken())
  if (!user) throw new DemoRequestError(401, 'unauthenticated', 'Phiên đăng nhập đã hết.')

  if (method === 'get' && path === '/api/v1/auth/me') return user
  if (method === 'get' && path === '/api/v1/branches') return { data: BRANCHES }
  if (method === 'get' && path === '/api/v1/customers') return { data: listCustomers(user) }
  if (method === 'post' && path === '/api/v1/customers') {
    const body = parseBody<{ code?: string; name?: string; phone?: string; branchId?: number }>(config)
    return { data: upsertCustomer(user, {
      code: body.code ?? '',
      name: body.name ?? '',
      phone: body.phone ?? '',
      branchId: Number(body.branchId),
    }) }
  }
  const customerMatch = path.match(/^\/api\/v1\/customers\/(\d+)$/)
  if (customerMatch && (method === 'put' || method === 'patch')) {
    const body = parseBody<{ code?: string; name?: string; phone?: string; branchId?: number }>(config)
    return { data: upsertCustomer(user, {
      id: Number(customerMatch[1]),
      code: body.code ?? '',
      name: body.name ?? '',
      phone: body.phone ?? '',
      branchId: Number(body.branchId),
    }) }
  }
  if (customerMatch && method === 'delete') {
    deleteCustomer(user, Number(customerMatch[1]))
    return null
  }

  if (method === 'get' && path === '/api/v1/products') {
    return {
      data: listProducts().map((product) => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        unit: 'pcs',
        unitPrice: String(product.unitPrice),
        cost: String(product.cost),
      })),
    }
  }
  if (method === 'post' && path === '/api/v1/products') {
    const body = parseBody<{ sku?: string; name?: string; unitPrice?: number; cost?: number; costPrice?: number }>(config)
    const product = upsertProduct(user, {
      sku: body.sku ?? '',
      name: body.name ?? '',
      unitPrice: Number(body.unitPrice),
      cost: Number(body.cost ?? body.costPrice),
    })
    return { data: { ...product, unitPrice: String(product.unitPrice), cost: String(product.cost) } }
  }
  const productMatch = path.match(/^\/api\/v1\/products\/(\d+)$/)
  if (productMatch && (method === 'put' || method === 'patch')) {
    const body = parseBody<{ sku?: string; name?: string; unitPrice?: number; cost?: number; costPrice?: number }>(config)
    const product = upsertProduct(user, {
      id: Number(productMatch[1]),
      sku: body.sku ?? '',
      name: body.name ?? '',
      unitPrice: Number(body.unitPrice),
      cost: Number(body.cost ?? body.costPrice),
    })
    return { data: { ...product, unitPrice: String(product.unitPrice), cost: String(product.cost) } }
  }
  if (productMatch && method === 'delete') {
    deleteProduct(user, Number(productMatch[1]))
    return null
  }

  if (method === 'get' && path === '/api/v1/accounts') {
    return { data: USERS.map(({ password: _password, ...account }) => withGrants(account)) }
  }
  if (method === 'get' && path === '/api/v1/roles-matrix') {
    return { permissions: PERMISSIONS, grants: loadGrants() }
  }
  if (method === 'patch' && path === '/api/v1/roles-matrix') {
    const body = parseBody<{ role?: UserRole; slug?: string; enabled?: boolean }>(config)
    const grants = loadGrants()
    const role = body.role
    const slug = body.slug
    if (!role || !slug || !(role in grants)) {
      throw new DemoRequestError(422, 'invalid_payload', 'Vai trò hoặc quyền không hợp lệ.')
    }
    const enabled = Boolean(body.enabled)
    const has = grants[role].includes(slug)
    if (enabled && !has) grants[role] = [...grants[role], slug]
    if (!enabled && has) grants[role] = grants[role].filter((item) => item !== slug)
    saveGrants(grants)
    return { permissions: PERMISSIONS, grants }
  }

  if (method === 'get' && path === '/api/v1/notifications') {
    return { data: listNotices(), webhook: { configured: false } }
  }
  if (method === 'get' && path === '/api/v1/stock-movements') {
    return { data: listMovements() }
  }

  if (method === 'get' && path === '/api/v1/orders') return { data: listOrders(user) }
  if (method === 'post' && path === '/api/v1/orders') {
    const body = parseBody<{
      customerId?: number
      branchId?: number
      lines?: Array<{ sku?: string; quantity?: number }>
    }>(config)
    return {
      data: createDraftOrder(user, {
        customerId: Number(body.customerId),
        branchId: Number(body.branchId),
        lines: (body.lines ?? []).map((line) => ({ sku: line.sku ?? '', quantity: Number(line.quantity) })),
      }),
    }
  }
  if (method === 'get' && path === '/api/v1/inventories') return { data: listInventory(user) }
  if (method === 'post' && path === '/api/v1/inventories/adjust') {
    const body = parseBody<{ branchId?: number; sku?: string; quantityDelta?: number; note?: string }>(config)
    return {
      data: adjustStock(user, {
        branchId: Number(body.branchId),
        sku: body.sku ?? '',
        quantityDelta: Number(body.quantityDelta),
        note: body.note,
      }),
      message: 'Stock adjustment recorded.',
    }
  }
  if (method === 'post' && path === '/api/v1/inventories/receive') {
    const body = parseBody<{ branchId?: number; sku?: string; quantity?: number; supplierRef?: string }>(config)
    return {
      data: receivePurchase(user, {
        branchId: Number(body.branchId),
        sku: body.sku ?? '',
        quantity: Number(body.quantity),
        supplierRef: body.supplierRef,
      }),
      message: 'Purchase receipt recorded.',
    }
  }

  const detail = path.match(/^\/api\/v1\/orders\/(\d+)$/)
  if (method === 'get' && detail) {
    const order = findOrder(user, Number(detail[1]))
    if (!order) throw new DemoRequestError(404, 'not_found', 'Không tìm thấy đơn hàng.')
    return { data: order }
  }
  if (detail && (method === 'put' || method === 'patch')) {
    const body = parseBody<{ customerId?: number; lines?: Array<{ sku?: string; quantity?: number }> }>(config)
    return {
      data: updateDraftOrder(user, Number(detail[1]), {
        customerId: Number(body.customerId),
        lines: (body.lines ?? []).map((line) => ({ sku: line.sku ?? '', quantity: Number(line.quantity) })),
      }),
    }
  }

  const action = path.match(/^\/api\/v1\/orders\/(\d+)\/(submit|approve|reject|dispatch|complete|cancel)$/)
  if (method === 'post' && action) {
    const body = parseBody<{ note?: string }>(config)
    return { data: transitionOrder(user, Number(action[1]), action[2] as OrderAction, body?.note) }
  }

  throw new DemoRequestError(404, 'not_found', 'Không có API này trong bản demo.')
}

if (USE_MOCK) {
  apiClient.defaults.adapter = async (config) => {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 380)
    })
    return mockRoute(config)
  }
}

function asUser(raw: Record<string, unknown>): User {
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ''),
    email: String(raw.email ?? ''),
    role: (raw.role as UserRole) ?? 'sales-staff',
    roleLabel: (raw.roleLabel as User['roleLabel']) ?? 'Sales Staff',
    branchId: raw.branchId == null && raw.branch_id == null ? null : Number(raw.branchId ?? raw.branch_id),
    permissions: Array.isArray(raw.permissions) ? raw.permissions.map(String) : [...ROLE_GRANTS['sales-staff']],
  }
}

export async function loginRequest(email: string, password: string): Promise<{ token: string; user: User }> {
  const { data } = await apiClient.post<{ token: string; user: Record<string, unknown> }>('/api/v1/auth/login', { email, password })
  const user = USE_MOCK ? withGrants(asUser(data.user)) : asUser(data.user)
  writeUser(user)
  return { token: data.token, user }
}

export async function meRequest(): Promise<User> {
  const { data } = await apiClient.get<Record<string, unknown>>('/api/v1/auth/me')
  const user = USE_MOCK ? withGrants(asUser(data)) : asUser(data)
  writeUser(user)
  return user
}

export async function fetchOrders(): Promise<Order[]> {
  const { data } = await apiClient.get<{ data: Order[] }>('/api/v1/orders')
  return data.data
}

export async function fetchOrder(id: number): Promise<Order> {
  const { data } = await apiClient.get<{ data: Order }>(`/api/v1/orders/${id}`)
  return data.data
}

export async function fetchInventory(): Promise<InventoryRow[]> {
  const { data } = await apiClient.get<{ data: InventoryRow[] }>('/api/v1/inventories')
  return data.data
}

export async function fetchCustomers(): Promise<Customer[]> {
  const { data } = await apiClient.get<{ data: Customer[] }>('/api/v1/customers')
  return data.data
}

export async function fetchProducts(): Promise<Array<{ id: number; sku: string; name: string; unitPrice: string; cost?: string }>> {
  const { data } = await apiClient.get<{ data: Array<{ id: number; sku: string; name: string; unitPrice: string; cost?: string }> }>('/api/v1/products')
  return data.data
}

export async function fetchBranches(): Promise<Branch[]> {
  const { data } = await apiClient.get<{ data: Branch[] }>('/api/v1/branches')
  return data.data
}

export async function fetchAccounts(): Promise<User[]> {
  const { data } = await apiClient.get<{ data: User[] }>('/api/v1/accounts')
  return data.data
}

export async function fetchRolesMatrix(): Promise<{ permissions: PermissionDef[]; grants: Record<UserRole, string[]> }> {
  const { data } = await apiClient.get<{ permissions: PermissionDef[]; grants: Record<UserRole, string[]> }>('/api/v1/roles-matrix')
  return data
}

export async function fetchNotifications(): Promise<{ data: Notice[]; webhook: { configured: boolean } }> {
  const { data } = await apiClient.get<{ data: Notice[]; webhook: { configured: boolean } }>('/api/v1/notifications')
  return data
}

export async function fetchStockMovements(): Promise<LedgerEntry[]> {
  try {
    const { data } = await apiClient.get<{ data: LedgerEntry[] }>('/api/v1/stock-movements')
    return data.data
  } catch {
    return []
  }
}

export async function patchRoleGrant(role: UserRole, slug: string, enabled: boolean): Promise<Record<UserRole, string[]>> {
  const { data } = await apiClient.patch<{ grants: Record<UserRole, string[]> }>('/api/v1/roles-matrix', { role, slug, enabled })
  return data.grants
}

export async function createOrderRequest(input: { customerId: number; branchId: number; lines: Array<{ sku: string; quantity: number }> }): Promise<Order> {
  const { data } = await apiClient.post<{ data: Order }>('/api/v1/orders', input)
  return data.data
}

export async function updateOrderRequest(id: number, input: { customerId: number; lines: Array<{ sku: string; quantity: number }> }): Promise<Order> {
  const { data } = await apiClient.patch<{ data: Order }>(`/api/v1/orders/${id}`, input)
  return data.data
}

export async function saveCustomerRequest(input: { id?: number; code: string; name: string; phone: string; branchId: number }): Promise<Customer> {
  if (input.id) {
    const { data } = await apiClient.patch<{ data: Customer }>(`/api/v1/customers/${input.id}`, input)
    return data.data
  }
  const { data } = await apiClient.post<{ data: Customer }>('/api/v1/customers', input)
  return data.data
}

export async function deleteCustomerRequest(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/customers/${id}`)
}

export async function saveProductRequest(input: { id?: number; sku: string; name: string; unitPrice: number; cost: number }): Promise<void> {
  if (input.id) {
    await apiClient.patch(`/api/v1/products/${input.id}`, input)
    return
  }
  await apiClient.post('/api/v1/products', input)
}

export async function deleteProductRequest(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/products/${id}`)
}

export async function adjustStockRequest(input: { branchId: number; sku: string; quantityDelta: number; note?: string }): Promise<InventoryRow> {
  const { data } = await apiClient.post<{ data: InventoryRow }>('/api/v1/inventories/adjust', input)
  return data.data
}

export async function receiveStockRequest(input: { branchId: number; sku: string; quantity: number; supplierRef?: string }): Promise<InventoryRow> {
  const { data } = await apiClient.post<{ data: InventoryRow }>('/api/v1/inventories/receive', input)
  return data.data
}

export async function transitionRequest(id: number, action: OrderAction, note?: string): Promise<Order> {
  const { data } = await apiClient.post<{ data: Order }>(`/api/v1/orders/${id}/${action}`, note ? { note } : {})
  return data.data
}
