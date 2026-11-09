export type LedgerKind = 'issue' | 'receipt' | 'purchase' | 'adjust' | 'count'

export type RangeKey = 'today' | '7d' | 'month' | 'custom'

export interface LedgerEntry {
  id: string
  kind: LedgerKind
  sku: string
  productName: string
  delta: number
  balanceAfter: number
  at: string
  branchId: number
  referenceCode: string
  actorName: string
}

export interface FunnelStep {
  key: string
  label: string
  count: number
  share: number
  bar: string
}

export interface DashboardMetrics {
  pending: number
  stalePending: number
  reservedValue: number
  reservedUnits: number
  fulfillment: number | null
  fulfillmentDelta: number | null
  safetySkus: number
}
