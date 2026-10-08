# PG Saathi

PG Saathi is a student-first local ecosystem for homemade food, meal plans, fresh produce, and trusted PG services. The existing React/Vite experience is backed by an Express API and a file-backed data store suitable for local development and an early student-scale deployment.

## Architecture

- **Client:** React 19, Vite, Tailwind CSS v4, Lucide icons
- **API/server:** Express 4, TypeScript via `tsx`, same-origin API under `/api`
- **Persistence:** `data/pgsaathi.json` by default, loaded through `server/db.ts`; `STORAGE_DRIVER=sqlite` enables the transactional `server/storage.ts` adapter using `DATABASE_URL`. Both stores include users, provider profiles, homemakers, farmers, listings, bookings, orders, subscriptions, payments, reviews, notifications, complaints, and institutions.
- **Authentication:** signed HMAC access tokens with seven-day expiry and salted `scrypt` password hashes. Demo persona login is disabled whenever `NODE_ENV=production`.
- **AI:** Gemini is optional. The local parser and matcher use only the current database when no key is configured.
- **Payments:** the mock provider is explicit and auto-confirms only in development/demo mode. Razorpay order creation is server-side when both Razorpay credentials are configured.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`.

Seeded development personas use the password from `DEMO_PASSWORD` (default `demo1234`). The persona buttons call the server and receive a signed session; they are not client-side authorization shortcuts. Use real passwords for newly registered accounts.

## Environment

See `.env.example`. Production should set:

- `NODE_ENV=production`
- a long random `AUTH_SECRET`
- `DEMO_MODE=false` (or omit it)
- `APP_ORIGIN` only when the API is called from a separate approved frontend origin
- `GEMINI_API_KEY` only when Gemini enhancement is desired
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and webhook configuration when real payments are ready

The default JSON store preserves the existing project data during migration. For an early production deployment, use `STORAGE_DRIVER=sqlite` with a file-backed SQLite `DATABASE_URL`; the adapter enables WAL, foreign keys, indexes, unique review/request keys, and transactional saves while preserving the existing API payloads. A PostgreSQL migration can preserve the same entity boundaries before scaling beyond an early deployment.

## Core API groups

- `/api/auth/*` — registration, password login, signed session lookup, demo persona access
- `/api/providers` and `/api/food/homemakers` — verified discovery and profiles
- `/api/bookings*` — service request creation, provider status progression, cancellation
- `/api/food/orders*` — server-priced food orders, kitchen progression, cancellation
- `/api/recurring*` — meal/service subscriptions
- `/api/reviews`, `/api/complaints`, `/api/notifications` — trust and support workflows
- `/api/farmers*` — verified farmer profiles and produce listing management
- `/api/admin/*` — admin-only analytics, verification, complaints, and matching controls
- `/api/ai/*` — grounded natural-language matching and support chat

All protected endpoints require `Authorization: Bearer <token>`. Mutation endpoints enforce role and ownership checks on the server.

## Production build

```bash
npm run lint
npm run build
NODE_ENV=production npm start
```

The server serves `dist/` and falls back to `index.html` for the SPA. Put it behind HTTPS and a process supervisor/container platform. Keep `.env` outside the repository; `.env.example` contains placeholders only.

## Payment status

Without Razorpay credentials, the application exposes a clearly labelled development/mock payment session. In production, configure Razorpay and complete the browser checkout callback/webhook verification before enabling customer payments. The server already stores payment records and refuses arbitrary payment verification IDs.
