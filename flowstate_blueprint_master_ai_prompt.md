# TÀI LIỆU ĐẶC TẢ DỰ ÁN & MASTER PROMPT CHO AI
**Dự án:** FlowState ERP Engine (Micro-ERP with State Machine & Concurrency Control)  
**Tiêu chuẩn:** Middle+ / Clean Architecture (Laravel 11, MySQL 8.0, Redis)

---

# PHẦN 1: BẢN ĐẶC TẢ KỸ THUẬT & CẤU TRÚC (SPECIFICATION)

## 1. Cấu trúc thư mục chuẩn (Clean Architecture)
```text
flowstate-erp/
├── app/
│   ├── Actions/                         # Single Responsibility Actions
│   │   ├── Order/
│   │   │   ├── CreateOrderAction.php
│   │   │   ├── SubmitOrderAction.php
│   │   │   └── DispatchOrderAction.php  # DB Transaction + Pessimistic Lock + Ledger
│   │   └── Inventory/
│   │       ├── ReserveStockAction.php
│   │       └── DeductStockAction.php
│   ├── Contracts/                       # Interfaces for DI & Mocking
│   │   ├── OrderStateMachineInterface.php
│   │   ├── StockLedgerInterface.php
│   │   └── WebhookDispatcherInterface.php
│   ├── DTOs/                            # Data Transfer Objects (Strictly Typed)
│   │   ├── Order/
│   │   │   ├── CreateOrderDTO.php
│   │   │   └── TransitionStateDTO.php
│   │   └── Inventory/
│   │       └── StockMovementDTO.php
│   ├── Enums/                           # PHP 8.2+ Backed Enums
│   │   ├── OrderStatus.php              # draft, pending_approval, approved, rejected, dispatched, completed, cancelled
│   │   ├── InventoryTxType.php          # order_dispatch, stock_adjustment, purchase_receipt
│   │   └── PermissionEnum.php           # orders.create, orders.approve, orders.dispatch, orders.view_cost_price
│   ├── Events/
│   │   └── OrderStateChanged.php        # Triggers Audit Log & Webhook Job
│   ├── Exceptions/
│   │   ├── InsufficientStockException.php
│   │   ├── InvalidStateTransitionException.php
│   │   └── IdempotencyConflictException.php
│   ├── Http/
│   │   ├── Controllers/Api/V1/
│   │   │   ├── AuthController.php
│   │   │   ├── OrderController.php
│   │   │   ├── OrderWorkflowController.php # Dedicated RPC-style State Endpoints
│   │   │   └── InventoryController.php
│   │   ├── Middleware/
│   │   │   ├── EnforceIdempotency.php   # Redis distributed lock for duplicate requests
│   │   │   └── ScopeByBranch.php        # Multi-tenant branch scope injector
│   │   ├── Requests/V1/Order/
│   │   │   ├── StoreOrderRequest.php
│   │   │   └── TransitionStateRequest.php
│   │   └── Resources/V1/
│   │       ├── OrderResource.php        # Dynamic Field Masking (RBAC)
│   │       └── InventoryResource.php
│   ├── Jobs/
│   │   └── DispatchWebhookNotificationJob.php
│   ├── Listeners/
│   │   └── RecordApprovalAuditLog.php
│   ├── Models/
│   │   ├── Branch.php
│   │   ├── Inventory.php
│   │   ├── InventoryTransaction.php     # Immutable Stock Ledger
│   │   ├── Order.php
│   │   ├── OrderApprovalLog.php
│   │   └── OrderItem.php
│   ├── Policies/
│   │   └── OrderPolicy.php
│   ├── Scopes/
│   │   └── BranchScope.php              # Eloquent Global Scope
│   └── Services/
│       ├── Workflow/
│       │   └── OrderStateMachine.php    # Implements OrderStateMachineInterface
│       ├── Ledger/
│       │   └── StockLedgerService.php   # Implements StockLedgerInterface
│       └── Webhook/
│           └── TelegramWebhookDispatcher.php
├── database/
│   ├── migrations/                      # 6 Core Tables
│   └── seeders/
│       ├── RoleAndPermissionSeeder.php
│       ├── BranchSeeder.php
│       └── DatabaseSeeder.php
├── tests/
│   ├── Unit/
│   │   └── StateMachineTest.php
│   └── Feature/
│       ├── Api/V1/OrderWorkflowTest.php
│       ├── Concurrency/
│       │   └── StockLockingTest.php     # High-concurrency Race Condition Test
│       └── Middleware/
│           └── IdempotencyMiddlewareTest.php
├── docker-compose.yml
├── Dockerfile
└── Makefile
```

---

# PHẦN 2: MASTER PROMPT CHO AI (CURSOR / CLAUDE / COPILOT)

BẠN LÀ MỘT SENIOR SOFTWARE ARCHITECT & LARAVEL SPECIALIST. 
Nhiệm vụ của bạn là khởi tạo và thiết lập khung mã nguồn hoàn chỉnh cho dự án backend "FlowState ERP".

### 1. BỐI CẢNH & NGUYÊN TẮC THIẾT KẾ:
- Framework: Laravel 11.x, PHP 8.2+, MySQL 8.0, Redis 7.x.
- Kiến trúc: Clean Architecture / Domain Actions (Không viết Fat Controller, không nhồi nhét Business Logic vào Eloquent Model).
- Luồng dữ liệu chuẩn: Controller -> FormRequest -> DTO -> Action -> Service/Repository -> Event/Job.
- Tuân thủ nghiêm ngặt PSR-12, Strict Types (`declare(strict_types=1);`), và xử lý Exception rõ ràng.

### 2. CÁC QUY TẮC BẮT BUỘC TRONG HỆ THỐNG:
1. Finite State Machine (FSM):
   - Quản lý vòng đời OrderStatus: DRAFT -> PENDING_APPROVAL -> (APPROVED | REJECTED) -> DISPATCHED -> COMPLETED.
   - Tuyệt đối cấm update status tùy tiện. Mọi thay đổi phải qua `OrderStateMachineInterface`. Chuyển trạng thái sai quy trình phải ném `InvalidStateTransitionException`.
2. Sổ cái kho kép & Chống bán lố (ACID & Concurrency):
   - Cấm dùng `UPDATE inventories SET quantity = quantity - X` đơn thuần.
   - Thao tác xuất kho (`DispatchOrderAction`) phải nằm trong `DB::transaction()` và khóa dòng kho bằng `lockForUpdate()`.
   - Mỗi biến động kho bắt buộc phải tạo 1 bản ghi bất biến trong bảng `inventory_transactions` (Lưu rõ `quantity_delta` và `balance_after`).
3. Phân quyền ma trận & Cô lập dữ liệu chi nhánh (RBAC & Scoping):
   - Dùng `BranchScope` (Eloquent Global Scope) để tự động lọc dữ liệu chi nhánh của User đang đăng nhập (Ngoại trừ Super Admin).
   - Trong `OrderResource`, các trường nhạy cảm như `cost_price` và `margin_rate` chỉ được trả về nếu `$request->user()->can('orders.view_cost_price')`.
4. Idempotency Key:
   - Xây dựng Middleware `EnforceIdempotency` chặn duplicate requests trên header `X-Idempotency-Key` bằng Redis lock (`SET key 'processing' EX 60 NX`). Trả về 409 nếu trùng lặp.

### 3. KẾ HOẠCH TRIỂN KHAI CHI TIẾT (TỰ ĐỘNG THỰC HIỆN THEO THỨ TỰ):

BƯỚC 1: KHỞI TẠO ENUMS, CONTRACTS & EXCEPTIONS
- Viết các file:
  + `app/Enums/OrderStatus.php`
  + `app/Enums/InventoryTxType.php`
  + `app/Enums/PermissionEnum.php`
  + `app/Contracts/OrderStateMachineInterface.php`
  + `app/Contracts/StockLedgerInterface.php`
  + `app/Exceptions/InvalidStateTransitionException.php`
  + `app/Exceptions/InsufficientStockException.php`
  + `app/Exceptions/IdempotencyConflictException.php`

BƯỚC 2: CƠ SỞ DỮ LIỆU & ELOQUENT MODELS
- Tạo các file Migration chuẩn MySQL 8.0:
  1. `create_branches_table`: id, name, code, address, timestamps.
  2. `create_permissions_and_roles_tables`: roles, permissions, role_has_permissions, user_roles.
  3. `create_inventories_table`: id, branch_id, product_id, physical_quantity, reserved_quantity, safety_stock, UNIQUE(branch_id, product_id).
  4. `create_inventory_transactions_table`: id, reference_code, reference_type, branch_id, product_id, quantity_delta, balance_after, created_by, created_at.
  5. `create_orders_table`: id, code (unique), branch_id, customer_id, created_by, status (enum/string), subtotal, total_amount, cost_price, timestamps.
  6. `create_order_items_table`: id, order_id, product_id, unit_price, cost_price, quantity, total_price.
  7. `create_order_approval_logs_table`: id, order_id, from_status, to_status, action_by, note, payload_snapshot (json), created_at.
- Tạo Models kèm relationships: `Branch`, `Inventory`, `InventoryTransaction`, `Order`, `OrderItem`, `OrderApprovalLog`.
- Cài đặt `BranchScope` cho Model `Order` và `Inventory`.

BƯỚC 3: DTOs & STATE MACHINE ENGINE
- Viết `CreateOrderDTO`, `TransitionStateDTO`, `StockMovementDTO`.
- Viết `app/Services/Workflow/OrderStateMachine.php` thực thi `OrderStateMachineInterface`. Định nghĩa ma trận chuyển trạng thái hợp lệ và tự động dispatch `OrderStateChanged` event.

BƯỚC 4: CORE BUSINESS ACTIONS (CONCURRENCY & STOCK LEDGER)
- Viết `app/Services/Ledger/StockLedgerService.php` thực thi `StockLedgerInterface`.
- Viết `app/Actions/Order/DispatchOrderAction.php`: Thực hiện lock tồn kho với `lockForUpdate()`, kiểm tra số dư khả dụng, trừ tồn kho và ghi sổ cái `inventory_transactions`. Ném `InsufficientStockException` nếu thiếu hàng.

BƯỚC 5: MIDDLEWARE, POLICIES & API RESOURCES
- Viết `app/Http/Middleware/EnforceIdempotency.php`.
- Viết `app/Http/Resources/V1/OrderResource.php` có cơ chế field-masking cho `cost_price`.
- Viết `app/Policies/OrderPolicy.php`.
- Viết Controllers:
  + `app/Http/Controllers/Api/V1/OrderController.php` (CRUD)
  + `app/Http/Controllers/Api/V1/OrderWorkflowController.php` (submit, approve, reject, dispatch).

BƯỚC 6: SEEDERS & FEATURE TESTS
- Viết `DatabaseSeeder.php` tạo đầy đủ:
  + Roles & Permissions (Super Admin, Branch Manager, Sales Staff).
  + 2 Chi nhánh (Hà Nội, TP.HCM).
  + Users tương ứng với từng chi nhánh.
  + 20 Sản phẩm với tồn kho ban đầu và giao dịch mở sổ.
- Viết Feature Test quan trọng nhất:
  + `tests/Feature/Concurrency/StockLockingTest.php`: Giả lập kiểm tra khóa dòng và kiểm tra không thể trừ tồn kho vượt quá số lượng thực tế.
  + `tests/Feature/Api/V1/OrderWorkflowTest.php`: Test FSM từ draft -> approved -> dispatched.

Bắt đầu thực hiện ngay từ BƯỚC 1 với đầy đủ code chi tiết, có `declare(strict_types=1);` và type-hinting hoàn chỉnh.