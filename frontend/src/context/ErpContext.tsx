import axios from 'axios'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadGrants, saveGrants } from '../data/access.ts'
import { createOrderRequest, fetchInventory, fetchOrders, loginRequest, transitionRequest } from '../lib/apiClient.ts'
import { readToken, userFromToken, writeToken } from '../lib/session.ts'
import type { InventoryRow, Notice, Order, OrderAction, User, UserRole } from '../types/index.ts'

interface Toast {
  id: number
  tone: 'ok' | 'err'
  message: string
}

interface ErpValue {
  user: User | null
  ready: boolean
  orders: Order[]
  inventory: InventoryRow[]
  loading: boolean
  branchScope: number | 'all'
  setBranchScope: (value: number | 'all') => void
  notices: Notice[]
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
}

const ErpContext = createContext<ErpValue | null>(null)

function messageOf(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined
    return data?.message ?? 'Không ghi nhận được thao tác.'
  }
  return 'Không ghi nhận được thao tác.'
}

export function ErpProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [inventory, setInventory] = useState<InventoryRow[]>([])
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
      const [nextOrders, nextInventory] = await Promise.all([fetchOrders(), fetchInventory()])
      setOrders(nextOrders)
      setInventory(nextInventory)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const existing = userFromToken(readToken())
    if (!existing) {
      setReady(true)
      return
    }
    setUser(existing)
    setBranchScopeState(existing.branchId ?? 'all')
    void refresh().finally(() => setReady(true))
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
    return [
      ...downloads.map((notice) => ({ ...notice, unread: !readNotices.includes(notice.id) })),
      ...pending,
    ]
  }, [orders, readNotices, downloads])

  const toggleGrant = useCallback((role: UserRole, slug: string) => {
    setGrants((current) => {
      const has = current[role].includes(slug)
      const nextRole = has ? current[role].filter((item) => item !== slug) : [...current[role], slug]
      const next = { ...current, [role]: nextRole }
      saveGrants(next)
      setUser((account) => (account && account.role === role ? { ...account, permissions: nextRole } : account))
      return next
    })
    void refresh()
  }, [refresh])

  const publishDownload = useCallback((notice: Notice) => {
    setDownloads((current) => [notice, ...current])
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password)
    writeToken(result.token)
    setUser(result.user)
    setBranchScopeState(result.user.branchId ?? 'all')
    setLoading(true)
    try {
      const [nextOrders, nextInventory] = await Promise.all([fetchOrders(), fetchInventory()])
      setOrders(nextOrders)
      setInventory(nextInventory)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    writeToken(null)
    setUser(null)
    setOrders([])
    setInventory([])
    setBranchScopeState('all')
  }, [])

  const createOrder = useCallback(async (input: { customerId: number; branchId: number; lines: Array<{ sku: string; quantity: number }> }) => {
    try {
      const created = await createOrderRequest(input)
      const [nextOrders, nextInventory] = await Promise.all([fetchOrders(), fetchInventory()])
      setOrders(nextOrders)
      setInventory(nextInventory)
      pushToast('ok', `${created.code} đã được tạo ở trạng thái nháp.`)
    } catch (error) {
      pushToast('err', messageOf(error))
      throw error
    }
  }, [pushToast])

  const transition = useCallback(async (id: number, action: OrderAction, note?: string) => {
    try {
      const updated = await transitionRequest(id, action, note)
      const [nextOrders, nextInventory] = await Promise.all([fetchOrders(), fetchInventory()])
      setOrders(nextOrders)
      setInventory(nextInventory)
      pushToast('ok', `${updated.code} đã được ghi nhận.`)
    } catch (error) {
      pushToast('err', messageOf(error))
      throw error
    }
  }, [pushToast])

  const value = useMemo<ErpValue>(() => ({
    user,
    ready,
    orders,
    inventory,
    loading,
    branchScope: user?.branchId ?? branchScope,
    setBranchScope,
    notices,
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
  }), [user, ready, orders, inventory, loading, branchScope, setBranchScope, notices, grants, toggleGrant, publishDownload, toasts, login, logout, transition, createOrder])

  return <ErpContext.Provider value={value}>{children}</ErpContext.Provider>
}

export function useErp(): ErpValue {
  const value = useContext(ErpContext)
  if (!value) throw new Error('useErp must be used inside ErpProvider')
  return value
}
