# Supply Changer — Master Engineering Specification & AI Agent Prompt
**Version:** 1.0
**Purpose:** This document is designed to be pasted directly into an AI coding agent (Cursor, Claude Code, Codex CLI, Windsurf, GitHub Copilot Workspace, etc.) as project context. It removes ambiguity so the agent can implement the system phase-by-phase without re-asking the same architectural questions.

---

## 0. How to Use This Prompt

1. Paste **Section 1 (Role & Mission)** as the system prompt / project rules file (e.g. `.cursorrules`, `AGENTS.md`, or the first message in a new agent session).
2. Keep the rest of this document available to the agent as persistent context (e.g. commit it to the repo as `docs/SPEC.md`) and reference it explicitly when asking for work: *"Implement Phase 3 from SPEC.md"*.
3. Always ask the agent to implement **one phase at a time** (Section 20). Do not ask for the whole app in one shot — output quality degrades and review becomes impossible.
4. After each phase, ask the agent to self-check against the relevant **Definition of Done** before moving on.

---

## 1. Role & Mission (Copy-Paste System Prompt)

```
You are a senior full-stack engineer building "Supply Changer", a production-minded
mobile inventory management app for a small team (10-15 users).

Rules you must always follow:
- Keep ALL business logic in the NestJS backend. The mobile app is a thin client.
- The database is the single source of truth for stock. Never trust client-sent stock values.
- Every stock mutation must be atomic and safe under concurrent requests.
- Every important action must produce an AuditLog row. Audit logs are immutable from the client.
- Notifications are always triggered by backend events, never directly by the mobile app.
- Prefer simple, readable solutions over clever or over-engineered ones.
- Only modify files relevant to the requested task. Do not refactor unrelated code.
- If a requirement is ambiguous, state your assumption explicitly in a comment or
  response, then proceed with the most reasonable interpretation.
- If something you're asked to do is risky (data loss, security, breaking change),
  say so briefly before doing it.
- Work in the phase order defined in SPEC.md unless told otherwise.
```

---

## 2. Project Overview

**Supply Changer** is a mobile inventory tracking app. Admins manage products, suppliers and users. Stock changes are recorded as immutable movements, trigger real-time push notifications via Firebase Cloud Messaging, and are fully audited. Target scale: 10–15 concurrent users, single organization, single currency/locale for v1.

---

## 3. Assumptions & Key Decisions (read before coding)

These resolve ambiguities in the original business brief. State agreement/changes before Phase 3.

| # | Topic | Decision | Reason |
|---|---|---|---|
| A1 | Deletes | Soft delete only (`isActive = false`) for User, Product, Supplier. No hard deletes via API. | Preserves audit/FK integrity. |
| A2 | "Transfer" stock | Modeled as a **linked pair** of movements: `TRANSFER_OUT` on source product + `TRANSFER_IN` on destination product, same `relatedMovementId`, single DB transaction. | Original spec didn't define multi-location; this is the simplest 2-product interpretation. |
| A3 | "Assigned" worker stock | New lightweight join table `ProductAssignment(productId, userId)`. Admin/Manager can assign products to workers via UI. Workers only see/get notified about assigned products; Admin/Manager see and are notified about everything. | Original data model had no assignment concept but referenced it functionally. |
| A4 | Device tokens | Multiple tokens per user (`DeviceToken` table), not a single field — a user may have a phone + tablet. | More realistic, avoids token overwrite bugs. |
| A5 | Refresh tokens | Stored hashed in DB (`RefreshToken` table) so they can be revoked on logout/compromise, not just stateless JWT. | Needed for real logout/revocation. |
| A6 | Pagination | All list endpoints default to `page=1&limit=20`, max `limit=100`. | Prevents unbounded queries. |
| A7 | Concurrency safety | Stock increase/decrease use a **conditional `updateMany`** (guard clause in the `WHERE`), not read-then-write, to avoid race conditions. See Section 10. | Two simultaneous decreases must never push stock below zero. |
| A8 | Real-time channel | WebSocket (Socket.IO via `@nestjs/websockets`) is used for **in-app live updates** while the app is open; FCM is used for **background/closed-app push**. Both are fed by the same backend event, never duplicated logic. | Matches "WebSocket... only where useful". |

---

## 4. Tech Stack (locked)

**Frontend:** React Native + Expo (SDK current stable), TypeScript, Expo Router, Zustand, TanStack Query v5, NativeWind, `expo-secure-store` (token storage), `expo-notifications` + Firebase (`@react-native-firebase/messaging` or Expo's FCM integration).

**Backend:** NestJS (TypeScript), Prisma ORM, PostgreSQL, `@nestjs/jwt` + `passport-jwt`, `firebase-admin`, `@nestjs/websockets` + `socket.io`, `class-validator` / `class-transformer`, `@nestjs/throttler`, `bcrypt`, `helmet`.

**Infra:** Expo EAS Build, PostgreSQL (managed, e.g. Supabase/RDS), Firebase Cloud Messaging, optional Redis/BullMQ deferred to v2 (only add if push-send volume becomes a bottleneck).

---

## 5. Non-Negotiable Architecture Principles

- No business logic in React Native screens — only display + call hooks/services.
- No duplicated validation logic between frontend and backend; backend is authoritative, frontend validation is UX-only (instant feedback).
- All stock-changing endpoints run inside a single Prisma `$transaction`.
- All write endpoints require an authenticated user; role checked via guard, never via client-sent role field.
- Every entity mutation (create/update/delete) → exactly one `AuditLog` row, same transaction.
- Every stock movement and every supplier/critical change → exactly one notification pipeline call (DB row + push attempt), regardless of push success/failure.
- Secrets only via environment variables. Never log secrets or tokens.

---

## 6. Repository Structure

### Backend (`/backend`)
```
backend/
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ src/
│  ├─ main.ts
│  ├─ app.module.ts
│  ├─ config/
│  │  ├─ config.module.ts
│  │  └─ configuration.ts
│  ├─ common/
│  │  ├─ decorators/        (current-user.decorator.ts, roles.decorator.ts)
│  │  ├─ guards/             (jwt-auth.guard.ts, roles.guard.ts)
│  │  ├─ filters/            (http-exception.filter.ts)
│  │  ├─ interceptors/       (logging.interceptor.ts)
│  │  ├─ pipes/
│  │  └─ types/
│  ├─ database/
│  │  ├─ database.module.ts
│  │  └─ prisma.service.ts
│  └─ modules/
│     ├─ auth/               (auth.module.ts, .controller.ts, .service.ts, strategies/, dto/)
│     ├─ users/
│     ├─ products/
│     ├─ suppliers/
│     ├─ stock/              (stock.service.ts holds atomic mutation logic)
│     ├─ notifications/      (notifications.service.ts, fcm.service.ts, notifications.gateway.ts)
│     └─ audit-logs/
├─ test/
├─ .env.example
└─ package.json
```

### Frontend (`/mobile`)
```
mobile/
├─ app/
│  ├─ (auth)/login.tsx
│  ├─ (tabs)/
│  │  ├─ dashboard.tsx
│  │  ├─ products/(index.tsx, [id].tsx, new.tsx)
│  │  ├─ suppliers/(index.tsx, [id].tsx)
│  │  ├─ stock/(index.tsx, movement-form.tsx)
│  │  ├─ notifications/index.tsx
│  │  └─ profile.tsx
│  ├─ (admin)/users/(index.tsx, [id].tsx)
│  └─ _layout.tsx
├─ components/        (Button, Card, EmptyState, ErrorState, Skeleton, etc.)
├─ features/
│  ├─ auth/  ├─ products/  ├─ suppliers/  ├─ stock/  ├─ notifications/
│  (each feature: api.ts, hooks.ts, types.ts, components/)
├─ hooks/              (useAuth, usePushToken, useSocket)
├─ services/
│  ├─ api/client.ts     (axios/fetch instance + interceptor for token refresh)
│  └─ push/registerForPushNotifications.ts
├─ store/               (auth.store.ts — Zustand)
├─ theme/
├─ types/
└─ utils/
```

---

## 7. Database Schema (Prisma — reference implementation)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  MANAGER
  WORKER
}

enum MovementType {
  INCREASE
  DECREASE
  TRANSFER_IN
  TRANSFER_OUT
}

enum NotificationType {
  STOCK_LOW
  STOCK_CRITICAL
  STOCK_INCREASED
  STOCK_DECREASED
  SUPPLIER_CREATED
  SUPPLIER_UPDATED
  SUPPLIER_CHANGED
  PRODUCT_CREATED
  PRODUCT_UPDATED
  PRODUCT_DELETED
  USER_CREATED
  USER_UPDATED
  ROLE_CHANGED
  GENERAL
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  ROLE_CHANGE
  LOGIN
  LOGOUT
}

model User {
  id           String   @id @default(uuid())
  fullName     String
  email        String   @unique
  passwordHash String
  role         Role     @default(WORKER)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  deviceTokens       DeviceToken[]
  stockMovements     StockMovement[]
  notifications      Notification[]
  auditLogs          AuditLog[]
  refreshTokens      RefreshToken[]
  productAssignments ProductAssignment[]

  @@map("users")
}

model DeviceToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  platform  String?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("device_tokens")
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  tokenHash String   @unique
  revoked   Boolean  @default(false)
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}

model Supplier {
  id        String   @id @default(uuid())
  name      String
  phone     String?
  email     String?
  address   String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  products Product[]

  @@map("suppliers")
}

model Product {
  id           String   @id @default(uuid())
  name         String
  sku          String   @unique
  stock        Int      @default(0)
  minimumStock Int      @default(0)
  supplierId   String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  supplier       Supplier?           @relation(fields: [supplierId], references: [id])
  stockMovements StockMovement[]
  assignments    ProductAssignment[]

  @@index([supplierId])
  @@map("products")
}

model ProductAssignment {
  id        String   @id @default(uuid())
  productId String
  userId    String
  createdAt DateTime @default(now())

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([productId, userId])
  @@map("product_assignments")
}

model StockMovement {
  id                String       @id @default(uuid())
  productId         String
  userId            String
  type              MovementType
  quantity          Int
  oldStock          Int
  newStock          Int
  description       String?
  relatedMovementId String?      @unique
  createdAt         DateTime     @default(now())

  product Product @relation(fields: [productId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@index([productId])
  @@map("stock_movements")
}

model Notification {
  id        String           @id @default(uuid())
  userId    String
  title     String
  message   String
  type      NotificationType
  isRead    Boolean          @default(false)
  metadata  Json?
  createdAt DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@map("notifications")
}

model AuditLog {
  id         String      @id @default(uuid())
  userId     String?
  action     AuditAction
  entityType String
  entityId   String
  oldData    Json?
  newData    Json?
  createdAt  DateTime    @default(now())

  user User? @relation(fields: [userId], references: [id])

  @@index([entityType, entityId])
  @@map("audit_logs")
}
```

---

## 8. API Contract

All endpoints prefixed `/api/v1`. Auth: `Authorization: Bearer <accessToken>` unless noted. Roles: **A**=Admin, **M**=Manager, **W**=Worker.

### Auth
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/auth/login` | none | `{ email, password }` → `{ accessToken, refreshToken, user }` |
| POST | `/auth/refresh` | refresh token | `{ refreshToken }` → new token pair (rotates old token) |
| POST | `/auth/logout` | any | revokes refresh token |
| POST | `/auth/device-token` | any | `{ token, platform }` registers FCM token |

### Users (A only, except self-profile)
| Method | Path | Role |
|---|---|---|
| GET | `/users` | A |
| GET | `/users/me` | any |
| POST | `/users` | A |
| PATCH | `/users/:id` | A |
| PATCH | `/users/:id/role` | A |
| DELETE | `/users/:id` | A (soft delete) |
| POST | `/users/:id/assignments` | A, M |

### Products
| Method | Path | Role |
|---|---|---|
| GET | `/products` | A, M, W (W sees only assigned) |
| GET | `/products/:id` | A, M, W (assigned) |
| POST | `/products` | A, M |
| PATCH | `/products/:id` | A, M |
| DELETE | `/products/:id` | A |

### Suppliers
| Method | Path | Role |
|---|---|---|
| GET | `/suppliers` | A, M |
| GET | `/suppliers/:id` | A, M |
| POST | `/suppliers` | A, M |
| PATCH | `/suppliers/:id` | A, M |
| DELETE | `/suppliers/:id` | A |

### Stock
| Method | Path | Role | Body |
|---|---|---|---|
| POST | `/stock/increase` | A, M, W (assigned) | `{ productId, quantity, description? }` |
| POST | `/stock/decrease` | A, M, W (assigned) | `{ productId, quantity, description? }` |
| POST | `/stock/transfer` | A, M | `{ fromProductId, toProductId, quantity, description? }` |
| GET | `/stock/movements` | A, M, W (assigned) | query: `productId?, type?, from?, to?, page, limit` |

### Notifications
| Method | Path | Role |
|---|---|---|
| GET | `/notifications` | any (own only) |
| GET | `/notifications/unread-count` | any |
| PATCH | `/notifications/:id/read` | any (own only) |
| PATCH | `/notifications/read-all` | any |

### Audit Logs
| Method | Path | Role |
|---|---|---|
| GET | `/audit-logs` | A | query: `entityType?, userId?, from?, to?, page, limit` |

**List response envelope (all list endpoints):**
```json
{ "data": [ /* items */ ], "meta": { "page": 1, "limit": 20, "total": 134 } }
```

**Error envelope:**
```json
{ "statusCode": 400, "error": "BAD_REQUEST", "message": "Quantity must be a positive integer", "path": "/api/v1/stock/decrease" }
```

---

## 9. Critical Business Logic — Atomic Stock Mutation

This is the highest-risk part of the system. Implement exactly this pattern, do not use read-then-write.

```typescript
// stock.service.ts
async decreaseStock(productId: string, quantity: number, userId: string, description?: string) {
  if (quantity <= 0) throw new BadRequestException('Quantity must be positive');

  return this.prisma.$transaction(async (tx) => {
    // Conditional update guards against negative stock under concurrency.
    const result = await tx.product.updateMany({
      where: { id: productId, isActive: true, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } },
    });

    if (result.count === 0) {
      throw new ConflictException('Insufficient stock or product not found');
    }

    const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });
    const oldStock = product.stock + quantity;

    const movement = await tx.stockMovement.create({
      data: {
        productId, userId, type: 'DECREASE', quantity,
        oldStock, newStock: product.stock, description,
      },
    });

    await tx.auditLog.create({
      data: {
        userId, action: 'UPDATE', entityType: 'Product', entityId: productId,
        oldData: { stock: oldStock }, newData: { stock: product.stock },
      },
    });

    return { product, movement };
  }).then(async (resultData) => {
    // Outside the DB transaction: fire notification pipeline (never blocks/rolls back the write)
    await this.notificationsService.handleStockChange(resultData.product, resultData.movement);
    return resultData;
  });
}
```

`increaseStock` mirrors this with `increment` and no `gte` guard. `transferStock` wraps both a guarded decrement on the source and an increment on the destination inside **one** transaction, then creates two `StockMovement` rows (`TRANSFER_OUT`, `TRANSFER_IN`) linked by `relatedMovementId`.

**Critical threshold rule:** after any successful decrease, if `product.stock <= product.minimumStock`, the notification type becomes `STOCK_CRITICAL` (otherwise `STOCK_DECREASED`); this check lives in `notificationsService.handleStockChange`, not duplicated in the controller.

---

## 10. Notification System Spec

**Recipients resolution (per Decision A3):**
- Always notify all active users with role `ADMIN` or `MANAGER`.
- Additionally notify `WORKER` users with a `ProductAssignment` row for the affected product.

**Pipeline (must run for every relevant event, in this order):**
1. Resolve recipient user IDs.
2. For each recipient: create a `Notification` DB row (always succeeds — this is the durable record).
3. Collect all `DeviceToken`s for those recipients; send via `firebase-admin` `sendEachForMulticast`.
4. On a per-token `messaging/registration-token-not-registered` or `invalid-argument` error, delete that `DeviceToken` row.
5. Emit the same event over the WebSocket gateway to any currently-connected sockets for those recipients (`notification:new`).
6. **Push failures must never throw past this method** — log and continue. The DB row from step 2 is the source of truth; the user will still see it in-app.

**WebSocket events:**
| Direction | Event | Payload |
|---|---|---|
| Client → Server | `auth` (on connect) | `{ accessToken }` — server joins socket to room `user:<id>` |
| Server → Client | `notification:new` | full `Notification` object |
| Server → Client | `stock:updated` | `{ productId, newStock }` (for live list refresh) |

---

## 11. Audit Logging Spec

- Written inside the **same transaction** as the mutation it describes — never as an async afterthought, so a failed audit write rolls back the mutation too (consistency over availability for audit data).
- No backend endpoint or service may update or delete an `AuditLog` row after creation. Do not generate an `update`/`delete` method for this module.
- `oldData`/`newData` store only the changed fields (a shallow diff), not the full entity, to keep rows small and diffs readable.

---

## 12. Auth & RBAC Spec

- **Access token:** JWT, 15 min expiry, payload `{ sub: userId, role, email }`, signed with `JWT_ACCESS_SECRET`.
- **Refresh token:** opaque random string, 30 day expiry, **hashed with bcrypt before storing** in `RefreshToken.tokenHash`. On `/auth/refresh`, verify hash, **revoke the old row and issue a new one** (rotation — prevents replay).
- **Guards:** `JwtAuthGuard` (global, validates access token) + `RolesGuard` (`@Roles('ADMIN','MANAGER')` decorator on handlers). Role is read from the **verified JWT payload**, never from the request body.
- **Password hashing:** bcrypt, 10–12 salt rounds (configurable via `BCRYPT_SALT_ROUNDS`).
- Mobile stores tokens in `expo-secure-store`, never in plain `AsyncStorage`.

---

## 13. Frontend Spec

**Navigation map:** `(auth)/login` → on success → `(tabs)` group with bottom tabs: Dashboard, Products, Stock, Notifications, Profile. Suppliers nested under Products (or its own tab for A/M). `(admin)/users` only rendered/reachable if `role === 'ADMIN'`.

**State conventions:**
- **Zustand** (`store/auth.store.ts`): only auth session state (user, tokens-in-memory, isAuthenticated). Nothing server-fetched belongs here.
- **TanStack Query**: everything from the API. Query key convention: `['products', filters]`, `['stock-movements', productId, filters]`, `['notifications']`, `['notifications', 'unread-count']`. On any stock mutation, invalidate `['products']`, `['stock-movements']`, and `['notifications', 'unread-count']`.
- **Socket events** update the query cache directly via `queryClient.setQueryData`/`invalidateQueries` rather than maintaining parallel socket state.

**Required UI states for every list screen:** loading (skeleton), empty (`EmptyState` component with contextual message), error (`ErrorState` with retry button), and pull-to-refresh.

---

## 14. Validation & Error Format

- Every DTO uses `class-validator` decorators (`@IsUUID`, `@IsInt`, `@Min(1)`, `@IsEmail`, etc.).
- Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- Global `HttpExceptionFilter` maps all errors to the envelope in Section 8. Never leak stack traces or Prisma error internals to the client in production.

---

## 15. Security Checklist

- [ ] `helmet()` enabled globally.
- [ ] CORS restricted to known mobile/app origins via `CORS_ORIGIN` env var.
- [ ] `@nestjs/throttler` on `/auth/login` (e.g. 5 req/min/IP) and all write endpoints.
- [ ] All env vars validated at boot (e.g. via `Joi` or `class-validator` config schema) — fail fast if missing.
- [ ] No secrets in logs; redact `passwordHash`, tokens in any logging interceptor.
- [ ] Firebase service account key loaded only from env, never committed.
- [ ] SQL only via Prisma (no raw string concatenation).

---

## 16. Environment Variables

```
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d
BCRYPT_SALT_ROUNDS=12
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
PORT=3000
CORS_ORIGIN=
```

---

## 17. Coding Conventions

- Backend files: kebab-case (`stock.service.ts`), Nest CLI module structure. Frontend components: PascalCase. Hooks: `useX` camelCase.
- One module = one responsibility. A controller never contains business logic — only validates the request shape and calls a service method.
- Prefer explicit return types on all public service methods.
- No `any`. Use Prisma-generated types / DTOs everywhere.

---

## 18. Out of Scope for v1 (explicitly deferred)

Barcode scanning, multi-warehouse/location tracking, analytics/reporting dashboard, Redis/BullMQ background jobs, multi-language i18n, offline-first sync. Build modularly so these slot in later without restructuring (per original "Future Readiness" requirement) — but do not build them now.

---

## 19. Implementation Roadmap (work one phase at a time)

- [ ] **Phase 0** — Repo scaffold: NestJS app + Expo app, Prisma init, env files, lint/format config.
- [ ] **Phase 1** — Prisma schema (Section 7) + first migration + seed script (1 admin user).
- [ ] **Phase 2** — Auth module: login, refresh rotation, logout, JWT + Roles guards.
- [ ] **Phase 3** — Users module (CRUD, role change, soft delete, assignments).
- [ ] **Phase 4** — Suppliers module (CRUD + audit log + change notification).
- [ ] **Phase 5** — Products module (CRUD + audit log).
- [ ] **Phase 6** — Stock module: increase/decrease/transfer with atomic logic (Section 9) + movement listing.
- [ ] **Phase 7** — Notifications module: DB notifications, FCM integration, WebSocket gateway, recipient resolution (Section 10).
- [ ] **Phase 8** — Audit logs module: read endpoint + filters (write side already done per-module).
- [ ] **Phase 9** — Mobile: auth flow + secure token storage + API client with auto-refresh.
- [ ] **Phase 10** — Mobile: Products, Suppliers, Stock screens (list/detail/forms) wired to TanStack Query.
- [ ] **Phase 11** — Mobile: Notifications screen + push registration + socket listener + badge/unread count.
- [ ] **Phase 12** — Mobile: Admin screens (Users, role management).
- [ ] **Phase 13** — Security hardening pass (Section 15 checklist) + basic e2e tests for stock concurrency and RBAC.

---

## 20. Definition of Done (applies to every phase)

- No TypeScript errors, no unused exports.
- New endpoints documented in this file's API contract if they deviate from it.
- Every mutating endpoint has a guard test or manual check for: wrong role rejected, missing auth rejected, invalid payload rejected.
- Stock endpoints specifically: verified that two rapid concurrent decrease calls cannot push stock below zero (manual test or e2e test).
- No business logic leaked into controllers or into the mobile app.

---

## 21. Final Directive to the AI Agent

Work phase by phase. Before writing code for a phase, restate in one short paragraph what you understood the phase requires and any assumption you're making beyond this document. Then implement only that phase's files. Stop and summarize what you built, what to test manually, and what the next phase depends on.