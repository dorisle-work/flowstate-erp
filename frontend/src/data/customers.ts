import type { Customer } from '../types/index.ts'

export const CUSTOMERS: Customer[] = [
  { id: 101, code: 'KH-001', name: 'Công ty TNHH Bắc Việt', phone: '024 3826 1101', branchId: 1 },
  { id: 102, code: 'KH-002', name: 'Nhà thuốc An Khang', phone: '024 3718 2204', branchId: 1 },
  { id: 103, code: 'KH-003', name: 'Xưởng gỗ Minh Phát', phone: '024 3856 4412', branchId: 1 },
  { id: 104, code: 'KH-004', name: 'Siêu thị Mini Hà Thành', phone: '024 3733 9088', branchId: 1 },
  { id: 105, code: 'KH-005', name: 'Công ty CP Mekong Foods', phone: '024 3944 2210', branchId: 1 },
  { id: 106, code: 'KH-006', name: 'Điện máy Phú Mỹ', phone: '024 3862 7741', branchId: 1 },
  { id: 107, code: 'KH-007', name: 'Cửa hàng gạo Ngọc Hà', phone: '024 3728 5519', branchId: 1 },
  { id: 108, code: 'KH-008', name: 'Quán cà phê Đinh Lễ', phone: '024 3825 6630', branchId: 1 },
  { id: 109, code: 'KH-009', name: 'Trường mầm non Hoa Sen', phone: '024 3755 1180', branchId: 1 },
  { id: 110, code: 'KH-010', name: 'Văn phòng phẩm Thành Công', phone: '024 3861 2294', branchId: 1 },
  { id: 201, code: 'KH-011', name: 'Nhà hàng Sông Hương', phone: '028 3822 4415', branchId: 2 },
  { id: 202, code: 'KH-012', name: 'Đại lý Bình Tân', phone: '028 3754 8821', branchId: 2 },
  { id: 203, code: 'KH-013', name: 'Tiệm bánh Hòa Hưng', phone: '028 3844 1106', branchId: 2 },
  { id: 204, code: 'KH-014', name: 'Kho mát Thủ Đức', phone: '028 3896 3302', branchId: 2 },
  { id: 205, code: 'KH-015', name: 'Siêu thị Quận 7', phone: '028 3771 5590', branchId: 2 },
  { id: 206, code: 'KH-016', name: 'Xưởng may Tân Bình', phone: '028 3811 7743', branchId: 2 },
  { id: 301, code: 'KH-017', name: 'Nhà hàng Mỹ Khê', phone: '0236 3833 2210', branchId: 3 },
  { id: 302, code: 'KH-018', name: 'Siêu thị Liên Chiểu', phone: '0236 3739 4481', branchId: 3 },
]

export function customerByName(name: string): Customer | undefined {
  return CUSTOMERS.find((item) => item.name === name)
}
