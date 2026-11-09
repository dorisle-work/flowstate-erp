# flowstate-erp

A resilient micro-ERP engine featuring dynamic RBAC, finite state machine approval workflows, and ACID-compliant stock ledger built with Laravel, MySQL, and Redis.

## Stack

- PHP 8.2+ / Laravel 11
- MySQL 8.0
- Redis 7

## Run with Docker

```bash
cp .env.example .env
php artisan key:generate
docker compose up -d --build
docker compose exec app php artisan db:seed
```

The API listens on `http://localhost:8000`. MySQL is published on host port `3307` so it does not collide with a local XAMPP server.

## Run locally

Máy này dùng PHP Homebrew. PHP của XAMPP là 7.4 và không chạy được project.

MySQL 8.0 lắng nghe `127.0.0.1:3307` (user `flowstate`, password `secret`) để nhường cổng 3306 cho MariaDB của XAMPP. Redis lắng nghe `127.0.0.1:6379`. Session, cache, queue và idempotency dùng Redis.

```bash
brew services start mysql@8.0
brew services start redis
/opt/homebrew/bin/php /opt/homebrew/bin/composer install
cp .env.example .env
/opt/homebrew/bin/php artisan key:generate
/opt/homebrew/bin/php artisan migrate --seed
/opt/homebrew/bin/php artisan serve
```

## Demo accounts

Password for every account is `password`.

| Email | Role | Branch |
| --- | --- | --- |
| superadmin@flowstate.test | Super Admin | all branches |
| manager.hn@flowstate.test | Branch Manager | Hà Nội |
| manager.hcm@flowstate.test | Branch Manager | TP.HCM |
| sales.hn@flowstate.test | Sales Staff | Hà Nội |
| sales.hcm@flowstate.test | Sales Staff | TP.HCM |

## Order API

Authenticate with `POST /api/v1/auth/login`, then send `Authorization: Bearer {token}`.

Mutating order routes require `X-Idempotency-Key` (8–128 characters). A repeated key while the first request is still stored returns `409`.

```text
POST /api/v1/orders
POST /api/v1/orders/{order}/submit
POST /api/v1/orders/{order}/approve
POST /api/v1/orders/{order}/reject
POST /api/v1/orders/{order}/dispatch
POST /api/v1/orders/{order}/complete
POST /api/v1/orders/{order}/cancel
```

Status changes go through the state machine only:

`draft → pending_approval → approved|rejected → dispatched → completed`

`cost_price` and `margin_rate` are returned only when the caller has `orders.view_cost_price`.

## Frontend

Giao diện nằm trong `frontend/` (React, Vite, Tailwind). Bản demo dùng dữ liệu mẫu, không cần API.

```bash
cd frontend
npm install
npm run dev
```

Mở `http://127.0.0.1:5173`. Mật khẩu mọi tài khoản demo là `password`.

## Tests

```bash
php artisan test
```
