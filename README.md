# flowstate-erp

A resilient micro-ERP engine featuring dynamic RBAC, finite state machine approval workflows, and an ACID-compliant stock ledger built with Laravel, MySQL, and Redis. The React console lives in `frontend/`.

## Stack

- PHP 8.2+ / Laravel 11
- MySQL 8.0
- Redis 7
- React + Vite + TypeScript (`frontend/`)

## Run with Docker

```bash
cp .env.example .env
php artisan key:generate
docker compose up -d --build
docker compose exec app php artisan migrate --seed
```

The API listens on `http://localhost:8000`. MySQL is published on host port `3307` so it does not collide with a local XAMPP server.

## Run locally

This machine uses Homebrew PHP. XAMPP PHP 7.4 cannot run the project.

MySQL 8.0 listens on `127.0.0.1:3307` (user `flowstate`, password `secret`) so MariaDB on 3306 stays free. Redis listens on `127.0.0.1:6379`. Session, cache, queue, and idempotency use Redis.

```bash
brew services start mysql@8.0
brew services start redis
/opt/homebrew/bin/php /opt/homebrew/bin/composer install
cp .env.example .env
/opt/homebrew/bin/php artisan key:generate
/opt/homebrew/bin/php artisan migrate --seed
/opt/homebrew/bin/php artisan serve
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

By default the UI uses seeded mock data (`VITE_USE_MOCK` is not `false`). To talk to the Laravel API:

```bash
# frontend/.env.local
VITE_USE_MOCK=false
VITE_API_URL=http://127.0.0.1:8000
```

Set `FRONTEND_URL` in the Laravel `.env` so CORS allows the Vite origin.

## Demo accounts

Password for every account is `password`.

| Email | Role | Branch |
| --- | --- | --- |
| superadmin@flowstate.test | Super Admin | all branches |
| manager.hn@flowstate.test | Branch Manager | Hà Nội |
| manager.hcm@flowstate.test | Branch Manager | TP.HCM |
| sales.hn@flowstate.test | Sales Staff | Hà Nội |
| sales.hcm@flowstate.test | Sales Staff | TP.HCM |
| kho.dn@flowstate.test | Thủ kho | Đà Nẵng |

## API docs (Swagger / OpenAPI)

Interactive docs (L5-Swagger):

- Local UI: [http://127.0.0.1:8000/api/documentation](http://127.0.0.1:8000/api/documentation)
- Spec JSON: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Production (Hostinger): `https://flowstate.dorisle.tech/api/documentation`

Regenerate after annotation changes:

```bash
php artisan l5-swagger:generate
```

Local `.env` can set `L5_SWAGGER_GENERATE_ALWAYS=true` and `L5_SWAGGER_CONST_HOST=http://127.0.0.1:8000`. In Swagger UI, call `POST /api/v1/auth/login`, then **Authorize** with the returned Bearer token. Send `X-Idempotency-Key` on mutating routes that use the idempotency middleware.

## Order API

Authenticate with `POST /api/v1/auth/login`, then send `Authorization: Bearer {token}`.

Mutating order routes require `X-Idempotency-Key` (8–128 characters). A repeated key while the first request is still stored returns `409`.

```text
GET  /api/v1/branches
GET  /api/v1/customers
GET  /api/v1/products
GET  /api/v1/accounts
GET  /api/v1/roles-matrix
PATCH /api/v1/roles-matrix
GET  /api/v1/inventories
POST /api/v1/orders
POST /api/v1/orders/{order}/submit
POST /api/v1/orders/{order}/approve
POST /api/v1/orders/{order}/reject
POST /api/v1/orders/{order}/dispatch
POST /api/v1/orders/{order}/complete
POST /api/v1/orders/{order}/cancel
```

Create-order body accepts camelCase from the UI:

```json
{
  "customerId": 101,
  "branchId": 1,
  "lines": [{ "sku": "FS-001", "quantity": 2 }]
}
```

Status changes go through the state machine only:

`draft → pending_approval → approved|rejected → dispatched → completed`

`cost_price` and `margin_rate` are returned only when the caller has `orders.view_cost_price`.

## Deploy (Hostinger — one domain)

One PHP/HTML site: **`flowstate.dorisle.tech`**

| Path | Serves |
| --- | --- |
| `/` | React SPA (`public/client`) |
| `/api/v1/...` | Laravel API |
| `/api/documentation` | Swagger UI |

Hostinger blocks nested hosts like `api.flowstate.dorisle.tech`, so same-origin `/api` avoids that.

Template env: [`.env.hostinger.example`](.env.hostinger.example) (`IDEMPOTENCY_STORE=database`, no Redis).

### A. DNS

1. Create **Trang web PHP/HTML** with domain `flowstate.dorisle.tech`.
2. Point DNS `flowstate` → Hostinger IP; remove the Vercel CNAME.

### B. Build frontend into Laravel `public/client`

```bash
cd frontend
npm ci
npm run build:hostinger
```

This uses [`frontend/.env.hostinger`](frontend/.env.hostinger) (`VITE_USE_MOCK=false`, empty `VITE_API_URL` → same origin).

### C. Upload vào `public_html` (không được đặt ngoài)

Layout bắt buộc khi document root chỉ là `public_html`:

```text
public_html/
  index.php          ← từ public/index.php
  .htaccess          ← từ public/.htaccess
  client/            ← từ public/client/ (npm run build:hostinger)
  favicon.ico
  robots.txt
  laravel/           ← phần còn lại của project (app, bootstrap, config, vendor, …)
    .env
    app/
    bootstrap/
    ...
    .htaccess        ← copy deploy/hostinger/laravel.htaccess (Deny from all)
```

1. hPanel → MySQL: tạo DB + user.
2. Upload **nội dung** `public/` thẳng vào `public_html/`.
3. Upload các thư mục/file Laravel còn lại vào `public_html/laravel/`  
   (`app`, `bootstrap`, `config`, `database`, `routes`, `storage`, `composer.json`, `composer.lock`, `artisan`, `vendor` nếu có…).  
   **Không** upload `frontend/node_modules`.
4. Trong `public_html/laravel/`: copy `.env.hostinger.example` → `.env`, điền DB.
5. Copy `deploy/hostinger/laravel.htaccess` → `public_html/laravel/.htaccess`.
6. PHP ≥ **8.2**. Terminal / SSH:

```bash
cd ~/domains/flowstate.dorisle.tech/public_html/laravel   # chỉnh path cho đúng
composer install --no-dev --optimize-autoloader
php artisan key:generate --force
php artisan migrate --force --seed
php artisan l5-swagger:generate
php artisan config:cache
php artisan route:cache
```

`public/index.php` tự nhận layout này (`./laravel` thay vì `../`).

### D. Smoke test

1. `https://flowstate.dorisle.tech` → login `admin@flowstate.test` / `password`
2. `https://flowstate.dorisle.tech/api/documentation`
3. CRUD / đơn / kho must hit live API (not mock)

## Tests

```bash
/opt/homebrew/bin/php artisan test
```
