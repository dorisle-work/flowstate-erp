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

- UI: [http://127.0.0.1:8000/api/documentation](http://127.0.0.1:8000/api/documentation)
- Spec JSON: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

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

## Deploy

### 1. Frontend on Vercel (`flowstate.dorisle.tech`)

1. Import `dorisle-work/flowstate-erp`.
2. Root Directory: `frontend`
3. Framework: Vite
4. Build: `npm run build`
5. Output: `dist`
6. Domain: add `flowstate.dorisle.tech` and CNAME `flowstate` → `cname.vercel-dns.com`

**Demo-only (current):** leave Environment Variables empty so mock mode stays on. No Laravel host is required.

**Live API later:** add

| Name | Value |
| --- | --- |
| `VITE_USE_MOCK` | `false` |
| `VITE_API_URL` | `https://api.flowstate.dorisle.tech` |

Then redeploy.

### 2. Backend API (Laravel + MySQL + Redis)

Vercel cannot run PHP/MySQL/Redis. Host the API on Railway, Render, Fly.io, or a VPS.

Minimum production env:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.flowstate.dorisle.tech
FRONTEND_URL=https://flowstate.dorisle.tech
APP_KEY=base64:...
DB_CONNECTION=mysql
DB_HOST=...
DB_PORT=3306
DB_DATABASE=flowstate
DB_USERNAME=...
DB_PASSWORD=...
REDIS_HOST=...
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
CACHE_STORE=redis
IDEMPOTENCY_STORE=redis
```

Then:

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force --seed
php artisan config:cache
php artisan route:cache
```

Point a subdomain such as `api.flowstate.dorisle.tech` at that host. CORS already allows `flowstate.dorisle.tech` and `*.vercel.app`.

Suggested order: deploy API → seed → set Vercel env → redeploy frontend.

## Tests

```bash
/opt/homebrew/bin/php artisan test
```
