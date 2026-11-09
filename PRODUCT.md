# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: React 18 + Vite + TypeScript + React Router. The brief allowed Next.js 14 or Vue 3 and said to start scaffolding. Vite keeps the ERP UI beside the Laravel API without a second SSR server, and matches the shadcn/ui + TanStack Table stack.

## Users

Branch sales staff create and submit orders. Branch managers approve, reject, and dispatch for their branch. Super Admin sees every branch and cost/margin. They work at a desk, often with a keyboard, scanning many orders in one sitting.

## Product Purpose

FlowState ERP is a micro-ERP for inventory operations, multi-branch RBAC, and finite-state approval of sales orders. Success is a staff member moving an order from draft to completed without double-submits or illegal transitions, while managers can see margin only when permitted.

## Positioning

Order status changes only through a finite state machine. Stock leaves the branch through an immutable ledger, and every mutation carries a client-generated idempotency key.

## Operating Context

Local demo runs against seeded mock data. The Laravel API lives at `/api/v1` (Sanctum bearer token, `X-Idempotency-Key` on POST/PUT/PATCH). Demo password for every account is `password`.

## Capabilities and Constraints

- Roles: Super Admin, Branch Manager, Sales Staff.
- Status path: draft → pending_approval → approved → dispatched → completed. Reject and cancel are terminal.
- Sales staff submit and cancel drafts. Managers approve, reject, and dispatch. Super Admin can run every legal transition.
- Reject and cancel require an audit note of at least 10 characters.
- Margin and cost stay hidden without `orders.view_cost_price`.
- Branch-scoped users cannot switch branch. Super Admin can.
- UI copy is Vietnamese. Order codes, SKUs, money, and quantities use Be Vietnam Pro with tabular figures.

## Brand Commitments

Name: FlowState ERP. The working palette is ink `#043D5D` and tide `#17AFAF` on a `#F4FBFB` canvas. Status chips stay slate, amber, blue, emerald, and rose. Type is Be Vietnam Pro, including codes and amounts.

## Evidence on Hand

Backend domain and demo accounts live in this repository (`database/seeders`, `routes/api.php`). The frontend ships its own mock seed so the screens run without that API. No customer logos or production order exports are in the repo; mock orders are labeled by the demo login.

## Product Principles

- Show the next legal action, not every button.
- A click locks the control until the request settles.
- Numbers, codes, and dates are scannable before names.
- Empty and loading states keep the same table geometry.
- Keyboard paths (`/`, Ctrl+K, Esc) are part of the task, not extras.

## Accessibility & Inclusion

Keyboard-first operation for search, command palette, and dialogs. Focus must stay visible. Status is never color alone; each chip has a text label.
