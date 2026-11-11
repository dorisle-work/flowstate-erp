import axios from 'axios'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadGrants, saveGrants } from '../data/access.ts'
import { BRANCHES, PRODUCTS } from '../data/catalog.ts'
import { CUSTOMERS } from '../data/customers.ts'
import {
  adjustStockRequest,
  createOrderRequest,
  deleteCustomerRequest,
  deleteProductRequest,
  fetchAccounts,
  fetchBranches,
  fetchCustomers,
  fetchInventory,
  fetchNotifications,
  fetchOrders,
  fetchProducts,
  fetchRolesMatrix,
  fetchStockMovements,
  loginRequest,
  meRequest,
  patchRoleGrant,
  receiveStockRequest,
  saveCustomerRequest,
  saveProductRequest,
  transitionRequest,
  updateOrderRequest,
} from '../lib/apiClient.ts'
import { USE_MOCK } from '../lib/runtime.ts'
import { readToken, userFromToken, writeToken, writeUser } from '../lib/session.ts'
import type { LedgerEntry } from '../types/erp.ts'
import type { Branch, Customer, InventoryRow, Notice, Order, OrderAction, User, UserRole } from '../types/index.ts'

interface Toast {
  id: number
  tone: 'ok' | 'err'
  message: string
}

export interface CatalogProduct {
  id: number
  sku: string
  name: string
  unitPrice: number
  cost: number
}

interface ErpValue {
  user: User | null
  ready: boolean
  orders: Order[]
  inventory: InventoryRow[]
  customers: Customer[]
  products: CatalogProduct[]
  branches: Branch[]
  accounts: User[]
  movements: LedgerEntry[]
  loading: boolean
  branchScope: number | 'all'
  setBranchScope: (value: number | 'all') => void
  notices: Notice[]
  webhookConfigured: boolean
  markNotice: (id: number) => void
  markAllNotices: () => void
  grants: Record<UserRole, string[]>
  toggleGrant: (role: UserRole, slug: string) => void
  publishDownload: (notice: Notice) => void
  toasts: Toast[]
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  transition: (id: number, action: OrderAction, note?: string) => Promise<void>
  createOrder: (input: { customerId: number; branchId: number; lines: Array<{ sku: string; quantity: number }> }) => Promise<void>
  updateOrder: (id: number, input: { customerId: number; lines: Array<{ sku: string; quantity: number }> }) => Promise<void>
  saveCustomer: (input: { id?: number; code: string; name: string; phone: string; branchId: number }) => Promise<void>
  removeCustomer: (id: number) => Promise<void>
  saveProduct: (input: { id?: number; sku: string; name: string; unitPrice: number; cost: number }) => Promise<void>
  removeProduct: (id: number) => Promise<void>
  adjustStock: (input: { branchId: number; sku: string; quantityDelta: number; note?: string }) => Promise<void>
  receiveStock: (input: { branchId: number; sku: string; quantity: number; supplierRef?: string }) => Promise<void>
}

const ErpContext = createContext<ErpValue | null>(null)

function messageOf(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined
    return data?.message ?? 'Không ghi nhận được thao tác.'
  }
  return 'Không ghi nhận được thao tác.'
}

function fallbackProducts(): CatalogProduct[] {
  return PRODUCTS.map((item) => ({
    id: item.id,
    sku: item.sku,
    name: item.name,
    unitPrice: item.unitPrice,
    cost: item.cost,
  }))
}

export function ErpProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [inventory, setInventory] = useState<InventoryRow[]>([])
  const [customers, setCustomers] = useState<Customer[]>(CUSTOMERS)
  const [products, setProducts] = useState<CatalogProduct[]>(fallbackProducts)
  const [branches, setBranches] = useState<Branch[]>(BRANCHES)
  const [accounts, setAccounts] = useState<User[]>([])
  const [movements, setMovements] = useState<LedgerEntry[]>([])
  const [opsNotices, setOpsNotices] = useState<Notice[]>([])
  const [webhookConfigured, setWebhookConfigured] = useState(false)
  const [loading, setLoading] = useState(false)
  const [branchScope, setBranchScopeState] = useState<number | 'all'>('all')
  const [readNotices, setReadNotices] = useState<number[]>([])
  const [downloads, setDownloads] = useState<Notice[]>([])
  const [grants, setGrants] = useState(loadGrants)
  const [toasts, setToasts] = useState<Toast[]>([])

  const pushToast = useCallback((tone: Toast['tone'], message: string) => {
    const id = Date.now()
    setToasts((current) => [...current, { id, tone, message }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 3200)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [nextOrders, nextInventory, nextCustomers, nextProducts, nextBranches, nextAccounts, matrix, notifications, nextMovements] = await Promise.all([
        fetchOrders(),
        fetchInventory(),
        fetchCustomers(),
        fetchProducts(),
        fetchBranches(),
        fetchAccounts(),
        fetchRolesMatrix(),
        fetchNotifications(),
        fetchStockMovements(),
      ])
      setOrders(nextOrders)
      setInventory(nextInventory)
      setCustomers(nextCustomers)
      setProducts(nextProducts.map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        unitPrice: Number(item.unitPrice),
        cost: Number(item.cost ?? 0),
      })))
      setBranches(nextBranches)
      setAccounts(nextAccounts)
      setMovements(nextMovements)
      setGrants(matrix.grants)
      setOpsNotices(notifications.data)
      setWebhookConfigured(notifications.webhook.configured)
      if (USE_MOCK) saveGrants(matrix.grants)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const boot = async () => {
      const token = readToken()
      if (!token) {
        setReady(true)
        return
      }

      try {
        const existing = USE_MOCK ? userFromToken(token) : await meRequest()
        if (!existing) {
          writeToken(null)
          setReady(true)
          return
        }
        setUser(existing)
        writeUser(existing)
        setBranchScopeState(existing.branchId ?? 'all')
        await refresh()
      } catch {
        writeToken(null)
      } finally {
        setReady(true)
      }
    }

    void boot()
  }, [refresh])

  const setBranchScope = useCallback((value: number | 'all') => {
    setBranchScopeState((current) => {
      if (user?.branchId) return user.branchId
      return value === current ? current : value
    })
  }, [user])

  const notices = useMemo<Notice[]>(() => {
    const pending = orders
      .filter((order) => order.status === 'pending_approval')
      .slice(0, 4)
      .map((order) => ({
        id: order.id,
        title: `${order.code} chờ duyệt`,
        body: `${order.customerName} · ${order.branchName}`,
        orderId: order.id,
        unread: !readNotices.includes(order.id),
      }))
    const feed = opsNotices.map((notice) => ({
      ...notice,
      unread: !readNotices.includes(notice.id),
    }))
    return [
      ...downloads.map((notice) => ({ ...notice, unread: !readNotices.includes(notice.id) })),
      ...feed,
      ...pending.filter((item) => !feed.some((notice) => notice.orderId === item.orderId && notice.title.includes('Chờ duyệt'))),
    ].slice(0, 20)
  }, [orders, readNotices, downloads, opsNotices])

  const toggleGrant = useCallback((role: UserRole, slug: string) => {
    const enabled = !grants[role]?.includes(slug)
    void (async () => {
      try {
        const next = await patchRoleGrant(role, slug, enabled)
        setGrants(next)
        if (USE_MOCK) saveGrants(next)
        setUser((account) => (account && account.role === role ? { ...account, permissions: next[role] } : account))
        await refresh()
      } catch (error) {
        pushToast('err', messageOf(error))
      }
    })()
  }, [grants, pushToast, refresh])

  const publishDownload = useCallback((notice: Notice) => {
    setDownloads((current) => [notice, ...current])
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password)
    writeToken(result.token)
    writeUser(result.user)
    setUser(result.user)
    setBranchScopeState(result.user.branchId ?? 'all')
    await refresh()
  }, [refresh])

  const logout = useCallback(() => {
    writeToken(null)
    writeUser(null)
    setUser(null)
    setOrders([])
    setInventory([])
    setAccounts([])
    setOpsNotices([])
    setCustomers(CUSTOMERS)
    setProducts(fallbackProducts())
    setBranches(BRANCHES)
    setBranchScopeState('all')
  }, [])

  const runMutation = useCallback(async (work: () => Promise<void>, okMessage: string) => {
    try {
      await work()
      await refresh()
      pushToast('ok', okMessage)
    } catch (error) {
      pushToast('err', messageOf(error))
      throw error
    }
  }, [pushToast, refresh])

  const createOrder = useCallback(async (input: { customerId: number; branchId: number; lines: Array<{ sku: string; quantity: number }> }) => {
    const created = await createOrderRequest(input)
    await refresh()
    pushToast('ok', `${created.code} đã được tạo ở trạng thái nháp.`)
  }, [pushToast, refresh])

  const updateOrder = useCallback(async (id: number, input: { customerId: number; lines: Array<{ sku: string; quantity: number }> }) => {
    const updated = await updateOrderRequest(id, input)
    await refresh()
    pushToast('ok', `${updated.code} đã được cập nhật.`)
  }, [pushToast, refresh])

  const transition = useCallback(async (id: number, action: OrderAction, note?: string) => {
    const updated = await transitionRequest(id, action, note)
    await refresh()
    pushToast('ok', `${updated.code} đã được ghi nhận.`)
  }, [pushToast, refresh])

  const saveCustomer = useCallback(async (input: { id?: number; code: string; name: string; phone: string; branchId: number }) => {
    await runMutation(async () => { await saveCustomerRequest(input) }, input.id ? 'Đã cập nhật khách hàng.' : 'Đã thêm khách hàng.')
  }, [runMutation])

  const removeCustomer = useCallback(async (id: number) => {
    await runMutation(async () => { await deleteCustomerRequest(id) }, 'Đã xóa khách hàng.')
  }, [runMutation])

  const saveProduct = useCallback(async (input: { id?: number; sku: string; name: string; unitPrice: number; cost: number }) => {
    await runMutation(async () => { await saveProductRequest(input) }, input.id ? 'Đã cập nhật sản phẩm.' : 'Đã thêm sản phẩm.')
  }, [runMutation])

  const removeProduct = useCallback(async (id: number) => {
    await runMutation(async () => { await deleteProductRequest(id) }, 'Đã xóa sản phẩm.')
  }, [runMutation])

  const adjustStock = useCallback(async (input: { branchId: number; sku: string; quantityDelta: number; note?: string }) => {
    await runMutation(async () => { await adjustStockRequest(input) }, 'Đã ghi điều chỉnh kho.')
  }, [runMutation])

  const receiveStock = useCallback(async (input: { branchId: number; sku: string; quantity: number; supplierRef?: string }) => {
    await runMutation(async () => { await receiveStockRequest(input) }, 'Đã nhập kho NCC.')
  }, [runMutation])

  const value = useMemo<ErpValue>(() => ({
    user,
    ready,
    orders,
    inventory,
    customers,
    products,
    branches,
    accounts,
    movements,
    loading,
    branchScope: user?.branchId ?? branchScope,
    setBranchScope,
    notices,
    webhookConfigured,
    markNotice: (id) => setReadNotices((current) => (current.includes(id) ? current : [...current, id])),
    markAllNotices: () => setReadNotices((current) => [...new Set([...current, ...notices.map((notice) => notice.id)])]),
    grants,
    toggleGrant,
    publishDownload,
    toasts,
    login,
    logout,
    transition,
    createOrder,
    updateOrder,
    saveCustomer,
    removeCustomer,
    saveProduct,
    removeProduct,
    adjustStock,
    receiveStock,
  }), [user, ready, orders, inventory, customers, products, branches, accounts, movements, loading, branchScope, setBranchScope, notices, webhookConfigured, grants, toggleGrant, publishDownload, toasts, login, logout, transition, createOrder, updateOrder, saveCustomer, removeCustomer, saveProduct, removeProduct, adjustStock, receiveStock])

  return <ErpContext.Provider value={value}>{children}</ErpContext.Provider>
}

export function useErp(): ErpValue {
  const value = useContext(ErpContext)
  if (!value) throw new Error('useErp must be used inside ErpProvider')
  return value
}
