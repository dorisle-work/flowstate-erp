import { SAFETY_QTY } from './status.ts'
import { dayKey } from './format.ts'
import type { InventoryRow, Order, OrderStatus } from '../types/index.ts'
import type { DashboardMetrics, FunnelStep, LedgerEntry, LedgerKind, RangeKey } from '../types/erp.ts'

export const LEDGER_LABEL: Record<LedgerKind, string> = {
  issue: 'Xuất đơn hàng',
  receipt: 'Nhập kho',
  purchase: 'Nhập kho NCC',
  adjust: 'Điều chỉnh',
  count: 'Kiểm kê cân bằng',
}

const FUNNEL: Array<{ status: OrderStatus; label: string; bar: string }> = [
  { status: 'draft', label: 'Nháp', bar: 'bg-[#d9dde3]' },
  { status: 'pending_approval', label: 'Chờ duyệt', bar: 'bg-[#f6c445]' },
  { status: 'approved', label: 'Đã duyệt', bar: 'bg-[#5b8cff]' },
  { status: 'dispatched', label: 'Xuất kho', bar: 'bg-[#3ddc97]' },
  { status: 'completed', label: 'Hoàn tất', bar: 'bg-[#f07167]' },
]

const DECIDED = new Set<OrderStatus>(['approved', 'dispatched', 'completed', 'rejected', 'cancelled'])
const SHIPPED = new Set<OrderStatus>(['dispatched', 'completed'])

export function rangeBounds(key: Exclude<RangeKey, 'custom'>, now = new Date()): { from: string; to: string } {
  const today = dayKey(now.toISOString())
  if (key === 'today') return { from: today, to: today }
  if (key === '7d') {
    const start = new Date(now)
    start.setDate(start.getDate() - 6)
    return { from: dayKey(start.toISOString()), to: today }
  }
  return { from: `${today.slice(0, 8)}01`, to: today }
}

export function inRange(iso: string, from: string, to: string): boolean {
  const day = dayKey(iso)
  return day >= from && day <= to
}

export function scopedOrders(orders: Order[], branchId: number | 'all', from: string, to: string): Order[] {
  return orders.filter((order) => {
    if (branchId !== 'all' && order.branchId !== branchId) return false
    return inRange(order.createdAt, from, to)
  })
}

function pendingAt(order: Order): string {
  const log = [...order.auditLogs].reverse().find((entry) => entry.toStatus === 'pending_approval')
  return log?.createdAt ?? order.updatedAt
}

function rate(orders: Order[]): number | null {
  const base = orders.filter((order) => DECIDED.has(order.status))
  if (base.length === 0) return null
  return base.filter((order) => SHIPPED.has(order.status)).length / base.length
}

function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00+07:00`)
  date.setUTCDate(date.getUTCDate() + days)
  return dayKey(date.toISOString())
}

export function dashboardMetrics(
  orders: Order[],
  inventory: InventoryRow[],
  branchId: number | 'all',
  from: string,
  to: string,
  now = new Date(),
): DashboardMetrics {
  const visible = scopedOrders(orders, branchId, from, to)
  const branchOrders = orders.filter((order) => branchId === 'all' || order.branchId === branchId)
  const pendingOrders = visible.filter((order) => order.status === 'pending_approval')
  const held = visible.filter((order) => order.status === 'pending_approval' || order.status === 'approved')
  const staleCutoff = now.getTime() - 4 * 60 * 60 * 1000
  const today = dayKey(now.toISOString())
  const yesterday = shiftDay(today, -1)
  const todayRate = rate(branchOrders.filter((order) => dayKey(order.updatedAt) === today))
  const yesterdayRate = rate(branchOrders.filter((order) => dayKey(order.updatedAt) === yesterday))
  const stock = inventory.filter((row) => branchId === 'all' || row.branchId === branchId)
  const safety = new Set(stock.filter((row) => row.onHand - row.reserved < SAFETY_QTY).map((row) => row.sku))

  return {
    pending: pendingOrders.length,
    stalePending: pendingOrders.filter((order) => new Date(pendingAt(order)).getTime() <= staleCutoff).length,
    reservedValue: held.reduce((sum, order) => sum + Number(order.totalAmount), 0),
    reservedUnits: held.reduce((sum, order) => sum + order.items.reduce((line, item) => line + item.quantity, 0), 0),
    fulfillment: rate(visible),
    fulfillmentDelta: todayRate === null || yesterdayRate === null ? null : todayRate - yesterdayRate,
    safetySkus: safety.size,
  }
}

export function funnelSteps(orders: Order[]): FunnelStep[] {
  const counts = FUNNEL.map((step) => orders.filter((order) => order.status === step.status).length)
  const total = counts.reduce((sum, count) => sum + count, 0)
  return FUNNEL.map((step, index) => ({
    key: step.status,
    label: step.label,
    count: counts[index] ?? 0,
    share: total === 0 ? 0 : (counts[index] ?? 0) / total,
    bar: step.bar,
  }))
}

export function ledgerEntries(
  orders: Order[],
  inventory: InventoryRow[],
  branchId: number | 'all',
  extras: LedgerEntry[] = [],
): LedgerEntry[] {
  const rows = inventory.filter((row) => branchId === 'all' || row.branchId === branchId)
  const entries: LedgerEntry[] = []

  for (const row of rows) {
    const issues = orders
      .filter((order) => order.branchId === row.branchId && (order.status === 'dispatched' || order.status === 'completed'))
      .flatMap((order) => {
        const log = order.auditLogs.find((item) => item.toStatus === 'dispatched')
        const at = log?.createdAt ?? order.updatedAt
        return order.items
          .filter((item) => item.sku === row.sku)
          .map((item) => ({
            qty: item.quantity,
            at,
            id: `${order.id}-${item.id}`,
            referenceCode: order.code,
            actorName: log?.actorName ?? 'Kho',
          }))
      })
      .sort((a, b) => a.at.localeCompare(b.at))

    if (issues.length === 0) continue
    const issued = issues.reduce((sum, item) => sum + item.qty, 0)
    let balance = row.onHand + issued
    entries.push({
      id: `purchase-${row.id}`,
      kind: 'purchase',
      sku: row.sku,
      productName: row.productName,
      delta: balance,
      balanceAfter: balance,
      at: '2026-10-31T17:00:00Z',
      branchId: row.branchId,
      referenceCode: `PN-20261031-${row.sku}`,
      actorName: 'Hệ thống',
    })
    for (const issue of issues) {
      balance -= issue.qty
      entries.push({
        id: `issue-${issue.id}`,
        kind: 'issue',
        sku: row.sku,
        productName: row.productName,
        delta: -issue.qty,
        balanceAfter: balance,
        at: issue.at,
        branchId: row.branchId,
        referenceCode: issue.referenceCode,
        actorName: issue.actorName,
      })
    }
  }

  const scopedExtras = extras.filter((entry) => branchId === 'all' || entry.branchId === branchId)
  return [...scopedExtras, ...entries].sort((a, b) => b.at.localeCompare(a.at))
}

export function stockLedger(
  orders: Order[],
  inventory: InventoryRow[],
  branchId: number | 'all',
  from: string,
  to: string,
  extras: LedgerEntry[] = [],
): LedgerEntry[] {
  return ledgerEntries(orders, inventory, branchId, extras)
    .filter((entry) => inRange(entry.at, from, to))
    .slice(0, 8)
}
