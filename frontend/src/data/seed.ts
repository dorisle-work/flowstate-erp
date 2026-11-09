import { customerByName } from './customers.ts'
import { BRANCHES, branchById, PRODUCTS, type ProductSeed, userById } from './catalog.ts'
import type { AuditLog, InventoryRow, Order, OrderItem, OrderStatus } from '../types/index.ts'

interface LineSpec {
  sku: string
  quantity: number
}

interface LogSpec {
  to: OrderStatus
  from: OrderStatus | null
  actorId: number
  at: string
  note?: string
}

interface OrderSpec {
  code: string
  branchId: number
  customerName: string
  status: OrderStatus
  createdBy: number
  createdAt: string
  lines: LineSpec[]
  logs: LogSpec[]
}

function money(value: number): string {
  return value.toFixed(2)
}

function product(sku: string): ProductSeed {
  const found = PRODUCTS.find((item) => item.sku === sku)
  if (!found) throw new Error(sku)
  return found
}

let itemSeq = 1
let logSeq = 1

function makeItems(lines: LineSpec[]): OrderItem[] {
  return lines.map((line) => {
    const item = product(line.sku)
    return {
      id: itemSeq++,
      productId: item.id,
      sku: item.sku,
      name: item.name,
      unitPrice: money(item.unitPrice),
      quantity: line.quantity,
      totalPrice: money(item.unitPrice * line.quantity),
      costPrice: money(item.cost * line.quantity),
      availableQuantity: 0,
    }
  })
}

function makeLogs(orderId: number, logs: LogSpec[]): AuditLog[] {
  return logs.map((log) => {
    const actor = userById(log.actorId)
    return {
      id: logSeq++,
      orderId,
      fromStatus: log.from,
      toStatus: log.to,
      actionBy: actor.id,
      actorName: actor.name,
      actorRole: actor.roleLabel,
      note: log.note ?? null,
      createdAt: log.at,
    }
  })
}

const SPECS: OrderSpec[] = [
  {
    code: 'ORD-20261109-7K2M1A',
    branchId: 1,
    customerName: 'Công ty TNHH Bắc Việt',
    status: 'draft',
    createdBy: 4,
    createdAt: '2026-11-09T02:15:00Z',
    lines: [{ sku: 'FS-001', quantity: 20 }],
    logs: [{ to: 'draft', from: null, actorId: 4, at: '2026-11-09T02:15:00Z', note: 'Tạo đơn nháp.' }],
  },
  {
    code: 'ORD-20261109-Q4N8C2',
    branchId: 1,
    customerName: 'Nhà thuốc An Khang',
    status: 'pending_approval',
    createdBy: 4,
    createdAt: '2026-11-09T01:05:00Z',
    lines: [
      { sku: 'FS-002', quantity: 30 },
      { sku: 'FS-008', quantity: 48 },
    ],
    logs: [
      { to: 'draft', from: null, actorId: 4, at: '2026-11-09T00:40:00Z' },
      { to: 'pending_approval', from: 'draft', actorId: 4, at: '2026-11-09T01:05:00Z', note: 'Khách lấy hàng trong ngày.' },
    ],
  },
  {
    code: 'ORD-20261108-H1P6D9',
    branchId: 1,
    customerName: 'Xưởng gỗ Minh Phát',
    status: 'approved',
    createdBy: 4,
    createdAt: '2026-11-08T03:20:00Z',
    lines: [{ sku: 'FS-001', quantity: 10 }, { sku: 'FS-020', quantity: 6 }],
    logs: [
      { to: 'draft', from: null, actorId: 4, at: '2026-11-08T02:10:00Z' },
      { to: 'pending_approval', from: 'draft', actorId: 4, at: '2026-11-08T02:40:00Z' },
      { to: 'approved', from: 'pending_approval', actorId: 2, at: '2026-11-08T03:20:00Z', note: 'Công nợ trong hạn mức.' },
    ],
  },
  {
    code: 'ORD-20261108-B3L0E5',
    branchId: 1,
    customerName: 'Siêu thị Mini Hà Thành',
    status: 'approved',
    createdBy: 4,
    createdAt: '2026-11-08T07:45:00Z',
    lines: [{ sku: 'FS-014', quantity: 40 }],
    logs: [
      { to: 'draft', from: null, actorId: 4, at: '2026-11-08T06:10:00Z' },
      { to: 'pending_approval', from: 'draft', actorId: 4, at: '2026-11-08T06:30:00Z' },
      { to: 'approved', from: 'pending_approval', actorId: 2, at: '2026-11-08T07:45:00Z', note: 'Duyệt trước, kho kiểm lại carton.' },
    ],
  },
  {
    code: 'ORD-20261107-M8R2F1',
    branchId: 1,
    customerName: 'Công ty CP Mekong Foods',
    status: 'dispatched',
    createdBy: 4,
    createdAt: '2026-11-07T04:00:00Z',
    lines: [{ sku: 'FS-017', quantity: 6 }],
    logs: [
      { to: 'draft', from: null, actorId: 4, at: '2026-11-07T01:00:00Z' },
      { to: 'pending_approval', from: 'draft', actorId: 4, at: '2026-11-07T01:20:00Z' },
      { to: 'approved', from: 'pending_approval', actorId: 2, at: '2026-11-07T02:10:00Z' },
      { to: 'dispatched', from: 'approved', actorId: 2, at: '2026-11-07T04:00:00Z', note: 'Xe nội bộ, phiếu xuất PX-118.' },
    ],
  },
  {
    code: 'ORD-20261106-C5T9A4',
    branchId: 1,
    customerName: 'Điện máy Phú Mỹ',
    status: 'completed',
    createdBy: 4,
    createdAt: '2026-11-06T09:30:00Z',
    lines: [{ sku: 'FS-020', quantity: 8 }, { sku: 'FS-008', quantity: 24 }],
    logs: [
      { to: 'draft', from: null, actorId: 4, at: '2026-11-06T02:00:00Z' },
      { to: 'pending_approval', from: 'draft', actorId: 4, at: '2026-11-06T02:15:00Z' },
      { to: 'approved', from: 'pending_approval', actorId: 2, at: '2026-11-06T03:00:00Z' },
      { to: 'dispatched', from: 'approved', actorId: 2, at: '2026-11-06T06:40:00Z' },
      { to: 'completed', from: 'dispatched', actorId: 2, at: '2026-11-06T09:30:00Z', note: 'Khách đã ký nhận.' },
    ],
  },
  {
    code: 'ORD-20261106-Z2W7B8',
    branchId: 1,
    customerName: 'Cửa hàng gạo Ngọc Hà',
    status: 'rejected',
    createdBy: 4,
    createdAt: '2026-11-06T04:12:00Z',
    lines: [{ sku: 'FS-001', quantity: 80 }],
    logs: [
      { to: 'draft', from: null, actorId: 4, at: '2026-11-06T03:00:00Z' },
      { to: 'pending_approval', from: 'draft', actorId: 4, at: '2026-11-06T03:20:00Z' },
      {
        to: 'rejected',
        from: 'pending_approval',
        actorId: 2,
        at: '2026-11-06T04:12:00Z',
        note: 'Khách hủy công nợ quá hạn 45 ngày, không đủ điều kiện duyệt.',
      },
    ],
  },
  {
    code: 'ORD-20261105-K9D1S3',
    branchId: 1,
    customerName: 'Quán cà phê Đinh Lễ',
    status: 'cancelled',
    createdBy: 4,
    createdAt: '2026-11-05T08:00:00Z',
    lines: [{ sku: 'FS-002', quantity: 12 }],
    logs: [
      { to: 'draft', from: null, actorId: 4, at: '2026-11-05T07:10:00Z' },
      { to: 'cancelled', from: 'draft', actorId: 4, at: '2026-11-05T08:00:00Z', note: 'Khách đổi nhà cung cấp trước khi gửi duyệt.' },
    ],
  },
  {
    code: 'ORD-20261109-P2Y6H0',
    branchId: 2,
    customerName: 'Nhà hàng Sông Hương',
    status: 'pending_approval',
    createdBy: 5,
    createdAt: '2026-11-09T03:40:00Z',
    lines: [{ sku: 'FS-008', quantity: 36 }, { sku: 'FS-002', quantity: 10 }],
    logs: [
      { to: 'draft', from: null, actorId: 5, at: '2026-11-09T03:10:00Z' },
      { to: 'pending_approval', from: 'draft', actorId: 5, at: '2026-11-09T03:40:00Z', note: 'Giao trước 16:00.' },
    ],
  },
  {
    code: 'ORD-20261108-L4C8N7',
    branchId: 2,
    customerName: 'Đại lý Bình Tân',
    status: 'approved',
    createdBy: 5,
    createdAt: '2026-11-08T06:05:00Z',
    lines: [{ sku: 'FS-017', quantity: 4 }, { sku: 'FS-014', quantity: 20 }],
    logs: [
      { to: 'draft', from: null, actorId: 5, at: '2026-11-08T04:00:00Z' },
      { to: 'pending_approval', from: 'draft', actorId: 5, at: '2026-11-08T04:20:00Z' },
      { to: 'approved', from: 'pending_approval', actorId: 3, at: '2026-11-08T06:05:00Z', note: 'Đủ tồn kho quận Bình Tân.' },
    ],
  },
  {
    code: 'ORD-20261107-V1E5Q2',
    branchId: 2,
    customerName: 'Tiệm bánh Hòa Hưng',
    status: 'draft',
    createdBy: 5,
    createdAt: '2026-11-07T08:25:00Z',
    lines: [{ sku: 'FS-020', quantity: 3 }],
    logs: [{ to: 'draft', from: null, actorId: 5, at: '2026-11-07T08:25:00Z' }],
  },
  {
    code: 'ORD-20261104-R6A3M9',
    branchId: 2,
    customerName: 'Kho mát Thủ Đức',
    status: 'dispatched',
    createdBy: 5,
    createdAt: '2026-11-04T05:50:00Z',
    lines: [{ sku: 'FS-001', quantity: 15 }],
    logs: [
      { to: 'draft', from: null, actorId: 5, at: '2026-11-04T01:00:00Z' },
      { to: 'pending_approval', from: 'draft', actorId: 5, at: '2026-11-04T01:30:00Z' },
      { to: 'approved', from: 'pending_approval', actorId: 3, at: '2026-11-04T02:40:00Z' },
      { to: 'dispatched', from: 'approved', actorId: 3, at: '2026-11-04T05:50:00Z', note: 'Đã lên xe tải lạnh.' },
    ],
  },
  {
    code: 'ORD-20261103-T8B2K4',
    branchId: 2,
    customerName: 'Siêu thị Quận 7',
    status: 'completed',
    createdBy: 5,
    createdAt: '2026-11-03T10:00:00Z',
    lines: [{ sku: 'FS-002', quantity: 18 }],
    logs: [
      { to: 'draft', from: null, actorId: 5, at: '2026-11-03T01:00:00Z' },
      { to: 'pending_approval', from: 'draft', actorId: 5, at: '2026-11-03T01:15:00Z' },
      { to: 'approved', from: 'pending_approval', actorId: 3, at: '2026-11-03T02:00:00Z' },
      { to: 'dispatched', from: 'approved', actorId: 3, at: '2026-11-03T06:10:00Z' },
      { to: 'completed', from: 'dispatched', actorId: 3, at: '2026-11-03T10:00:00Z', note: 'Đối soát xong.' },
    ],
  },
  {
    code: 'ORD-20261109-N5F7D1',
    branchId: 1,
    customerName: 'Trường mầm non Hoa Sen',
    status: 'pending_approval',
    createdBy: 4,
    createdAt: '2026-11-09T04:05:00Z',
    lines: [{ sku: 'FS-008', quantity: 20 }, { sku: 'FS-001', quantity: 4 }],
    logs: [
      { to: 'draft', from: null, actorId: 4, at: '2026-11-09T03:40:00Z' },
      { to: 'pending_approval', from: 'draft', actorId: 4, at: '2026-11-09T04:05:00Z' },
    ],
  },
  {
    code: 'ORD-20261102-G3H9P6',
    branchId: 1,
    customerName: 'Văn phòng phẩm Thành Công',
    status: 'draft',
    createdBy: 4,
    createdAt: '2026-11-02T02:30:00Z',
    lines: [{ sku: 'FS-020', quantity: 2 }],
    logs: [{ to: 'draft', from: null, actorId: 4, at: '2026-11-02T02:30:00Z' }],
  },
  {
    code: 'ORD-20261101-W4J8C0',
    branchId: 2,
    customerName: 'Xưởng may Tân Bình',
    status: 'approved',
    createdBy: 5,
    createdAt: '2026-11-01T07:15:00Z',
    lines: [{ sku: 'FS-017', quantity: 9 }],
    logs: [
      { to: 'draft', from: null, actorId: 5, at: '2026-11-01T03:00:00Z' },
      { to: 'pending_approval', from: 'draft', actorId: 5, at: '2026-11-01T03:20:00Z' },
      { to: 'approved', from: 'pending_approval', actorId: 3, at: '2026-11-01T07:15:00Z', note: 'Giữ màng co đến thứ Sáu.' },
    ],
  },
  {
    code: 'ORD-20261109-D8N2K4',
    branchId: 3,
    customerName: 'Nhà hàng Mỹ Khê',
    status: 'pending_approval',
    createdBy: 6,
    createdAt: '2026-11-09T01:20:00Z',
    lines: [{ sku: 'FS-001', quantity: 8 }],
    logs: [
      { to: 'draft', from: null, actorId: 6, at: '2026-11-09T01:00:00Z' },
      { to: 'pending_approval', from: 'draft', actorId: 6, at: '2026-11-09T01:20:00Z' },
    ],
  },
  {
    code: 'ORD-20261108-D3Q9P1',
    branchId: 3,
    customerName: 'Siêu thị Liên Chiểu',
    status: 'approved',
    createdBy: 6,
    createdAt: '2026-11-08T04:00:00Z',
    lines: [{ sku: 'FS-014', quantity: 20 }],
    logs: [
      { to: 'draft', from: null, actorId: 6, at: '2026-11-08T02:00:00Z' },
      { to: 'pending_approval', from: 'draft', actorId: 6, at: '2026-11-08T02:30:00Z' },
      { to: 'approved', from: 'pending_approval', actorId: 1, at: '2026-11-08T04:00:00Z', note: 'Duyệt giúp chi nhánh Đà Nẵng.' },
    ],
  },
]

export interface DemoState {
  orders: Order[]
  inventory: InventoryRow[]
  idempotency: string[]
}

export function createSeed(): DemoState {
  itemSeq = 1
  logSeq = 1

  const orders: Order[] = SPECS.map((spec, index) => {
    const branch = branchById(spec.branchId)
    const items = makeItems(spec.lines)
    const subtotal = items.reduce((sum, item) => sum + Number(item.totalPrice), 0)
    const cost = items.reduce((sum, item) => sum + Number(item.costPrice ?? 0), 0)
    const id = index + 1
    return {
      id,
      code: spec.code,
      branchId: branch.id,
      branchName: branch.name,
      branchCode: branch.code,
      customerId: customerByName(spec.customerName)?.id ?? null,
      customerName: spec.customerName,
      createdBy: spec.createdBy,
      status: spec.status,
      subtotal: money(subtotal),
      totalAmount: money(subtotal),
      costPrice: money(cost),
      marginRate: subtotal === 0 ? '0' : ((subtotal - cost) / subtotal).toFixed(4),
      items,
      auditLogs: makeLogs(id, spec.logs),
      createdAt: spec.createdAt,
      updatedAt: spec.logs[spec.logs.length - 1]?.at ?? spec.createdAt,
    }
  })

  const inventory: InventoryRow[] = []
  let stockId = 1
  for (const branch of BRANCHES) {
    for (const item of PRODUCTS) {
      const onHand = item.sku === 'FS-014' && branch.id === 1 ? 12 : 120
      const reserved = orders
        .filter((order) => order.branchId === branch.id && (order.status === 'pending_approval' || order.status === 'approved'))
        .flatMap((order) => order.items)
        .filter((line) => line.sku === item.sku)
        .reduce((sum, line) => sum + line.quantity, 0)
      inventory.push({
        id: stockId++,
        branchId: branch.id,
        branchName: branch.name,
        sku: item.sku,
        productName: item.name,
        onHand,
        reserved,
      })
    }
  }

  return { orders, inventory, idempotency: [] }
}
