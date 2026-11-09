import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { authenticate, createDraftOrder, DemoRequestError, findOrder, listInventory, listOrders, releaseKey, rememberKey, transitionOrder } from '../data/demoStore.ts'
import { readToken, userFromToken } from './session.ts'
import type { InventoryRow, Order, OrderAction, User } from '../types/index.ts'

const MUTATIONS = new Set(['post', 'put', 'patch'])

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = readToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  const method = (config.method ?? 'get').toLowerCase()
  if (MUTATIONS.has(method) && !config.headers.get('X-Idempotency-Key')) {
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

function mockRoute(config: InternalAxiosRequestConfig): AxiosResponse {
  const method = (config.method ?? 'get').toLowerCase()
  const path = pathOf(config)
  const key = config.headers.get('X-Idempotency-Key')
  const idempotent = MUTATIONS.has(method) && typeof key === 'string' && path !== '/api/v1/auth/login'

  try {
    if (idempotent) rememberKey(key)
    return ok(config, handle(config, method, path))
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
    const body = (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) as {
      email?: string
      password?: string
    }
    const user = authenticate(body.email ?? '', body.password ?? '')
    if (!user) throw new DemoRequestError(422, 'invalid_credentials', 'Email hoặc mật khẩu không đúng.')
    return { token: `demo:${user.id}`, token_type: 'Bearer', user }
  }

  const user = userFromToken(readToken())
  if (!user) throw new DemoRequestError(401, 'unauthenticated', 'Phiên đăng nhập đã hết.')

  if (method === 'get' && path === '/api/v1/orders') return { data: listOrders(user) }
  if (method === 'post' && path === '/api/v1/orders') {
    const body = (typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data) as {
      customerId?: number
      branchId?: number
      lines?: Array<{ sku?: string; quantity?: number }>
    }
    return {
      data: createDraftOrder(user, {
        customerId: Number(body.customerId),
        branchId: Number(body.branchId),
        lines: (body.lines ?? []).map((line) => ({ sku: line.sku ?? '', quantity: Number(line.quantity) })),
      }),
    }
  }
  if (method === 'get' && path === '/api/v1/inventories') return { data: listInventory(user) }

  const detail = path.match(/^\/api\/v1\/orders\/(\d+)$/)
  if (method === 'get' && detail) {
    const order = findOrder(user, Number(detail[1]))
    if (!order) throw new DemoRequestError(404, 'not_found', 'Không tìm thấy đơn hàng.')
    return { data: order }
  }

  const action = path.match(/^\/api\/v1\/orders\/(\d+)\/(submit|approve|reject|dispatch|complete|cancel)$/)
  if (method === 'post' && action) {
    const body = (typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data) as {
      note?: string
    }
    return { data: transitionOrder(user, Number(action[1]), action[2] as OrderAction, body?.note) }
  }

  throw new DemoRequestError(404, 'not_found', 'Không có API này trong bản demo.')
}

if (import.meta.env.VITE_USE_MOCK !== 'false') {
  apiClient.defaults.adapter = async (config) => {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 380)
    })
    return mockRoute(config)
  }
}

export async function loginRequest(email: string, password: string): Promise<{ token: string; user: User }> {
  const { data } = await apiClient.post<{ token: string; user: User }>('/api/v1/auth/login', { email, password })
  return data
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

export async function createOrderRequest(input: { customerId: number; branchId: number; lines: Array<{ sku: string; quantity: number }> }): Promise<Order> {
  const { data } = await apiClient.post<{ data: Order }>('/api/v1/orders', input)
  return data.data
}

export async function transitionRequest(id: number, action: OrderAction, note?: string): Promise<Order> {
  const { data } = await apiClient.post<{ data: Order }>(`/api/v1/orders/${id}/${action}`, note ? { note } : {})
  return data.data
}
