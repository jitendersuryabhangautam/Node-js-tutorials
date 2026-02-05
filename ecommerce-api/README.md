# Ecommerce API (Node.js)

This project is a full ecommerce backend built with **Fastify + Prisma + PostgreSQL + Redis**.
It includes authentication, products, cart, orders, payments, returns, and admin analytics.

## Quick Start

### 1) Prerequisites
- Node.js 20+
- Docker Desktop (for PostgreSQL + Redis)

### 2) Install dependencies
```powershell
cd .\ecommerce-api
npm install
```

### 3) Create `.env`
```powershell
copy .env.example .env
```

Default values in `.env.example` assume:
- Postgres on `localhost:5433`
- Database name `ecommerce_db_node`

Update `.env` if needed:
```
DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=Jitender@123
DB_NAME=ecommerce_db_node
DATABASE_URL=postgresql://postgres:Jitender@123@localhost:5433/ecommerce_db_node
JWT_SECRET=replace_me
```

### 4) Start Postgres + Redis
```powershell
docker compose up -d
```

### 5) (Optional) Seed data (SQL)
This resets and inserts sample data into **ecommerce_db_node**:
```powershell
Get-Content .\prisma\seed.sql | docker exec -i ecommerce-db-node psql -U postgres -d ecommerce_db_node
```

### 6) Run server
```powershell
npm run dev
```

Server runs on:
- `http://localhost:8080`
- Docs: `http://localhost:8080/docs`

---

## Project Structure

```
ecommerce-api/
  src/
    routes/          # API endpoints (auth, products, cart, orders, admin, etc.)
    db/              # Prisma + Redis clients
    middlewares/     # auth & admin guards
    utils/           # helpers (password, tokens, transforms, pagination)
  prisma/
    schema.prisma    # database models
    seed.sql         # SQL seed (optional)
  openapi.yaml       # manual OpenAPI with examples
  docker-compose.yml # Postgres + Redis
```

---

## Runtime Flow (High Level)

1. **Request comes in** → Fastify route handler runs.
2. **Auth middleware** (`authRequired`) verifies JWT for protected routes.
3. **Prisma** queries the database.
4. **Response** uses standard shape: `{ success, data }` or `{ success:false, message }`.

---

## Key API Flows

### Auth
- `POST /api/v1/auth/register` → create user
- `POST /api/v1/auth/login` → JWT access token
- `POST /api/v1/auth/refresh` → new access token

### Products (Public)
- `GET /api/v1/products` → list with pagination + filters
- `GET /api/v1/products/:id` → details

### Cart (Auth required)
- `GET /api/v1/cart` → get cart
- `POST /api/v1/cart/items` → add item
- `PUT /api/v1/cart/items/:itemId` → update quantity
- `DELETE /api/v1/cart/items/:itemId` → remove item
- `DELETE /api/v1/cart` → clear cart
- `GET /api/v1/cart/validate` → stock validation

### Orders (Auth required)
- `POST /api/v1/orders` → create order from cart
  - If `payment_method` is `cc` or `dc`, a payment row is auto-created with `status=completed`
- `GET /api/v1/orders` → list
- `GET /api/v1/orders/:id` → detail
- `PUT /api/v1/orders/:id/cancel` → cancel
- `GET /api/v1/orders/:id/payment` → payment info

### Payments (Auth required)
- `POST /api/v1/payments` → create payment (body or query `order_id`)
- `POST /api/v1/payments/:id/verify` → verify payment

### Returns (Auth required)
- `POST /api/v1/returns` → request return
- `GET /api/v1/returns` → list
- `GET /api/v1/returns/:id` → detail

### Admin (Auth + role=admin)
- `GET /api/v1/admin/products` → list with `range_days`
- `POST /api/v1/admin/products` → create
- `PUT /api/v1/admin/products/:id` → update
- `DELETE /api/v1/admin/products/:id` → delete

- `GET /api/v1/admin/orders` → list with `status` + `range_days`
- `GET /api/v1/admin/orders/:id` → detail
- `PUT /api/v1/admin/orders/:id/status` → update status
- `GET /api/v1/admin/orders/recent` → recent orders

- `GET /api/v1/admin/returns` → list with `status` + `range_days`
- `POST /api/v1/admin/returns/:returnId/process` → approve/reject/complete

- `GET /api/v1/admin/users` → list with `range_days`
- `PUT /api/v1/admin/users/:id/role` → change role

- `GET /api/v1/admin/analytics` → summary metrics
- `GET /api/v1/admin/products/top` → top products by quantity/revenue

---

## Swagger / OpenAPI

The manual OpenAPI file with examples is:
```
openapi.yaml
```

It is automatically loaded by `/docs`.

---

## Common Issues

### Prisma migration drift
If Prisma says drift and wants to reset:
- Use a **new DB** for Node (`ecommerce_db_node`)
- Or accept reset (data loss)

### `Payment not found`
Payments are created when:
- You call `/api/v1/payments`, **or**
- Create an order with `payment_method` = `cc` or `dc`

---

## Notes on Environment

- `.env` is **not committed**
- `.env.example` is the template
- `node_modules` is ignored

---

## Next Steps (Optional)

- Add rate limiting
- Add request validation schemas to Fastify for auto Swagger
- Add tests with Vitest
- Add CI workflow

