# Kids Clothing Inventory Management System

A production-ready MERN application for managing inventory in a kids clothing business, where every
**Age Group + Design + Product Type + Color** combination is tracked as its own unique inventory item with its
own SKU, barcode, QR code, and stock history.

## 1. Overview

- Two roles: **Super Admin** (full control) and **Admin** (operational: scan, sell, view).
- Every inventory item is uniquely identified by Age Group + Design + Product Type + Color.
- Each item gets an auto-generated Product ID, SKU, Code128 barcode, and QR code.
- Admins scan a product with their phone camera and sell directly from the scan result.
- All stock changes (stock-in, sale, return, damage/loss, adjustment) are atomic MongoDB transactions
  and are recorded as an immutable inventory transaction history.
- Full audit log of sensitive actions, investor tracking, and reporting/dashboard with charts.

## 2. Features

- JWT authentication (HTTP-only cookie) with bcrypt password hashing and RBAC middleware.
- Age Group / Design / Product Type / Color management (Super Admin only), with image upload for designs.
- Inventory product creation with auto SKU/barcode/QR generation.
- Stock-in, stock adjustment, damage/loss recording — all as transactional operations with full history.
- Mobile-first camera-based barcode/QR scanner (Scan & Sell) with insufficient-stock validation and
  duplicate-submission protection (idempotency key).
- Sales history, returns processing, printable barcode/QR label generator.
- Investor management with a separate investment transaction ledger (never mixed with inventory stock).
- Dashboard with KPI cards and charts (Recharts): daily sales, sales by age group/design/type, top designs.
- Reports: sales, inventory, design, age group, product type — with CSV export and print support.
- Full audit log of all sensitive actions (login, create/update, stock changes, sales).

## 3. Technology Stack

**Backend:** Node.js, Express, MongoDB + Mongoose, JWT, bcryptjs, Helmet, CORS, express-rate-limit,
express-mongo-sanitize, Multer, `qrcode` + `bwip-js` (barcode/QR image generation), Zod validation.

**Frontend:** React 18, Vite, React Router, Axios, TanStack Query, Tailwind CSS, React Hook Form,
Recharts, `html5-qrcode` (camera scanning), Lucide React icons, react-hot-toast.

## 4. Folder Structure

```
backend/
  src/
    config/        # env + MongoDB connection
    controllers/    # route handlers / business logic
    middleware/     # auth, RBAC, validation, rate limiting, uploads, error handling
    models/         # Mongoose schemas
    routes/         # Express routers
    services/       # barcode/QR generation, audit logging
    utils/          # ApiError, ApiResponse, asyncHandler, token helpers
    validators/      # Zod schemas
    app.js
    server.js
  seed/seed.js       # seeds catalog data + default Super Admin
  uploads/designs/    # uploaded design images (served at /uploads)

frontend/
  src/
    components/     # Sidebar, Topbar, DataTable, Modal, BarcodeScanner, etc.
    pages/           # route-level pages
    layouts/         # DashboardLayout
    context/         # AuthContext
    services/        # Axios API clients per domain
    routes/          # ProtectedRoute (RBAC)
```

## 5. MongoDB Setup — Replica Set Required

Stock operations (sales, stock-in, adjustments, returns, investor transactions) use **MongoDB
multi-document transactions** (`session.withTransaction`) so stock can never become inconsistent under
concurrent sales. **MongoDB transactions require a replica set** (a single-node replica set is enough
for local development).

- **Docker (recommended):** `docker-compose.yml` already starts Mongo as a single-node replica set and
  initializes it automatically via the `mongo-init` service. No manual setup needed.
- **MongoDB Atlas:** Atlas clusters are already replica sets — just use your Atlas connection string.
- **Local `mongod` without Docker:** start it with `mongod --replSet rs0`, then run
  `mongosh --eval "rs.initiate()"` once.

## 6. Environment Variables

Copy the example files and fill in real values before running anything:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**backend/.env**

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/kids_clothing_inventory?replicaSet=rs0
JWT_SECRET=change_this_to_a_long_random_secret
JWT_EXPIRES_IN=7d
JWT_COOKIE_NAME=kci_token
CLIENT_URL=http://localhost:5173
BRAND_NAME=doodledry
SEED_SUPER_ADMIN_NAME=Super Admin
SEED_SUPER_ADMIN_EMAIL=superadmin@example.com
SEED_SUPER_ADMIN_PHONE=9999999999
SEED_SUPER_ADMIN_PASSWORD=ChangeMe123!
```

**frontend/.env**

```env
VITE_API_URL=http://localhost:5000/api
VITE_BRAND_NAME=doodledry
```

Never commit real `.env` files — only the `.env.example` templates are tracked.

## 7. Installation & Development

```bash
# Backend
cd backend
npm install
npm run seed   # seeds age groups, designs, product types, and the default Super Admin
npm run dev    # starts on http://localhost:5000

# Frontend (in a new terminal)
cd frontend
npm install
npm run dev    # starts on http://localhost:5173
```

Open http://localhost:5173 and log in with the seeded Super Admin credentials from
`SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` (change the password after first login).

### Testing on a phone (same Wi-Fi)

Vite prints a "Network" URL (e.g. `http://192.168.1.6:5173`) alongside the localhost one — open that
on a phone on the same network to test Scan & Sell on a real device. Two things make this work
automatically in development, no config needed:

- The frontend detects it's being loaded from a LAN IP instead of `localhost` and points its API
  calls at that same IP (see `frontend/src/services/api.js`).
- The backend's CORS allows any `localhost`/private-LAN-IP origin when `NODE_ENV` isn't `production`
  (see `LAN_ORIGIN_PATTERN` in `backend/src/app.js`). In production, only the exact origin(s) listed
  in `CLIENT_URL` (comma-separated for multiple) are allowed.

**Camera access (Scan & Sell) needs HTTPS.** Browsers only allow `getUserMedia` on `localhost` or a
secure (HTTPS) origin — plain `http://<lan-ip>:5173` will not get camera permission on a phone. A
self-signed dev certificate is already wired up for this (`vite.config.js` and `backend/src/server.js`
both auto-enable HTTPS when cert files are present at `certs/dev-key.pem` / `certs/dev-cert.pem` at
the repo root; if they're missing, both fall back to plain HTTP as before, so this is fully optional).

To generate the cert (covers `localhost`, `127.0.0.1`, and your current LAN IP — regenerate if your
IP changes, e.g. switching Wi-Fi networks):

```bash
LAN_IP=$(ipconfig getifaddr en0)   # macOS; use `hostname -I` on Linux
mkdir -p certs && cd certs
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout dev-key.pem -out dev-cert.pem -days 825 \
  -subj "/CN=dev" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:${LAN_IP}"
cd ..
```

Then restart both `npm run dev` processes (frontend and backend) — the console will print `https://`
URLs once the certs are picked up. On the phone:

1. Open the backend's HTTPS URL directly first, e.g. `192.168.1.6:5002/api/health` — accept
   the "not secure" warning (it's self-signed, not from a public CA). **This step is easy to miss**:
   without it, the frontend's background API calls to that origin fail silently with no visible
   warning, because a security prompt is only shown for direct/top-level navigation, not for
   fetch/XHR calls from a script.
2. Then open the frontend's HTTPS URL, e.g. `192.168.1.6:5173`, and accept its warning too.
3. Log in and open Scan & Sell — the camera prompt should now appear normally.

Alternatives if you'd rather not click through browser warnings: `mkcert` (installs a locally-trusted
CA so there's no warning at all, but requires trusting that CA on the phone too), or a tunnel like
`ngrok`/Tailscale Funnel (gives you a real HTTPS URL from a public CA, no cert setup needed at all).

## 8. Seeding the Database

`npm run seed` (inside `backend/`) is idempotent — safe to run multiple times. It seeds:

- 7 age groups (0–6 Months … 4–5 Years)
- 15 designs (14 printed designs + Solid)
- 6 product types (Full Sleeve, Half Sleeve, Onesie, Romper, Solid Shirt, Solid Pant)
- 4 colors (Red, Brown, Green, White)
- One Super Admin account (only created if no Super Admin exists yet)

## 9. Production Build

```bash
# Frontend
cd frontend
npm run build      # outputs to frontend/dist
npm run preview    # serve the production build locally

# Backend
cd backend
npm start           # NODE_ENV=production node src/server.js
```

## 10. Docker Deployment

```bash
docker compose up -d --build
```

This starts: a single-node Mongo replica set (with automatic `rs.initiate()`), the backend API on
port 5000, and the frontend (built + served by nginx) on port 5173. Set any of `JWT_SECRET`,
`SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD`, etc. as environment variables before starting to
override the defaults. Run the seed script once against the running backend container:

```bash
docker compose exec backend npm run seed
```

## 11. Barcode / QR Scanning Explained

- Every inventory product gets: `productId` (e.g. `PRD-000001`), `sku` (e.g. `06M-HUN-FS`, used as the
  Code128 **barcode** value), and `qrCode` (the `productId`, encoded as a QR code).
- Codes are rendered on demand by the backend (`qrcode` + `bwip-js`) as PNG data URLs — nothing is
  pre-rendered/stored as an image, so labels always reflect the current product data.
- `GET /api/products/lookup/:code` resolves **any** of `barcode`, `qrCode`, `sku`, or `productId` to the
  same unique product — so it doesn't matter whether the barcode or the QR code was scanned.
- The **Scan & Sell** page uses `html5-qrcode` to access the device camera, decode the code, call the
  lookup endpoint, and show the product with its live stock and price — ready to sell.
- The **Barcode Generator** page renders printable labels (brand name, product name, age group, design,
  product type, SKU, barcode, QR) using the browser's native print dialog (which supports "Save as PDF").

## 12. API Documentation

All endpoints are under `/api`. Authenticated routes read the JWT from an HTTP-only cookie (or a
`Authorization: Bearer <token>` header as a fallback).

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Users (Super Admin) | `GET/POST /users`, `GET/PUT/DELETE /users/:id` |
| Age Groups | `GET /age-groups`, `POST/PUT/DELETE /age-groups[/:id]` (write = Super Admin) |
| Designs | `GET /designs`, `POST/PUT/DELETE /designs[/:id]` (multipart image upload) |
| Product Types | `GET /product-types`, `POST/PUT/DELETE /product-types[/:id]` |
| Colors | `GET /colors`, `POST/PUT/DELETE /colors[/:id]` (write = Super Admin) |
| Products | `GET /products`, `GET /products/labels?ids=`, `GET /products/lookup/:code`, `GET /products/:id`, `POST/PUT/DELETE /products[/:id]` |
| Inventory | `POST /inventory/stock-in`, `POST /inventory/adjust`, `GET /inventory/history`, `GET /inventory/low-stock` |
| Sales | `GET/POST /sales`, `GET /sales/:id` |
| Returns | `GET/POST /returns` |
| Investors (Super Admin) | `GET/POST /investors`, `GET/PUT /investors/:id`, `POST /investors/:id/transactions` |
| Reports | `GET /reports/dashboard`, `/sales`, `/inventory`, `/designs`, `/age-groups`, `/product-types` |
| Audit Logs (Super Admin) | `GET /audit-logs` |

All responses use the shape `{ success, message, data, meta? }`. Errors return
`{ success: false, message, details? }` with an appropriate HTTP status code.

## 13. Security Notes

- Passwords are hashed with bcrypt (cost factor 12); plain-text passwords are never stored or logged.
- JWT is stored in an HTTP-only, `SameSite` cookie (not accessible to JavaScript) to reduce XSS risk.
- All mutating routes are protected by role-based middleware (`SUPER_ADMIN` vs `ADMIN`).
- `helmet`, `cors` (locked to `CLIENT_URL` in production; also allows LAN/localhost origins in
  development for phone testing — see §7), `express-rate-limit` (stricter on `/auth/login`), and
  `express-mongo-sanitize` are applied globally.
- All request bodies are validated with Zod before touching the database.
- Stock-affecting operations run inside MongoDB sessions/transactions so concurrent sales or stock
  updates can never corrupt stock counts — a failed step rolls back the entire operation.
- Sales support an `idempotencyKey` so a double-tapped "Confirm Sale" button cannot create a duplicate
  sale.
- The dev-only Vite dependency chain currently has one moderate/high advisory in `esbuild` (dev server
  only, not present in production builds); run `npm audit` before shipping to review current advisories.
