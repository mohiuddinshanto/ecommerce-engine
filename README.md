# EPIC Store

A full-stack storefront for browsing products, managing a cart, creating customer accounts, and placing Cash on Delivery or Stripe Checkout orders. The project includes a configurable storefront and an admin panel for managing the store.

## Key Features

- **Product listing:** Browse the catalog by category and view product cards with images, prices, stock, and optional variants.
- **Product details:** Open a product page to see its description, gallery, price, availability, and purchase options.
- **Shopping cart:** Add products, adjust quantities, and review the cart before checkout.
- **Registration and login:** Create a customer account, sign in, manage account details, and review orders.
- **Order processing:** Place Cash on Delivery (COD) orders or pay through Stripe Checkout. Inventory is reserved/updated by the server, and Stripe webhook processing is idempotent.
- **Store administration:** Manage products, categories, orders, customers, store settings, and optional advanced storefront settings.

## Technology Stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4, HeroUI |
| Backend | Node.js, Express 5, TypeScript API, Next.js server |
| Database and ORM | MySQL, Prisma 6 |
| Payments | Stripe Checkout and signed Stripe webhooks |
| Authentication | JWT session cookie, bcrypt password hashing |

The same Node.js server serves the storefront and the Express API.

## Prerequisites

- Node.js 20 or newer and npm
- MySQL 8-compatible server and an empty database for a fresh local setup
- Stripe account and Stripe CLI for local payment/webhook testing (optional if you only use COD)
- Git

MongoDB is not used by this project; its database is MySQL.

## Installation

```bash
git clone https://github.com/mohiuddinshanto/ecommerce-engine.git
cd ecommerce-engine
npm install
```

Copy `.env.example` to `.env` and fill in the values for your local database and development setup. Then create the database, apply migrations, seed the catalog, and start the app:

```bash
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run dev
```

Open <http://localhost:3000>. The catalog seed is safe to rerun: it upserts the sample categories and products rather than adding another copy. It provides 6 categories and 30 products. Seed-created admin/customer accounts are optional and require their corresponding seed environment variables.

## Environment Variables

Use `.env.example` as the source of truth. Never commit `.env` or put server secrets in `NEXT_PUBLIC_*` variables.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Prisma MySQL URL. For local development, use a database on `127.0.0.1`; on Hostinger use the local MySQL host/credentials provided by hPanel. |
| `JWT_SECRET` | Yes | Random JWT signing secret (at least 32 characters). |
| `APP_ENCRYPTION_KEY` | Yes | Unique key of at least 32 characters for credentials encrypted in the database. |
| `STRIPE_SECRET_KEY` | For Stripe | Server-side Stripe key. Use an `sk_test_...` key for sandbox payments. |
| `STRIPE_WEBHOOK_SECRET` | For Stripe webhooks | Signing secret from Stripe CLI (`whsec_...`) locally or the Stripe webhook endpoint in production. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | For Stripe | Browser-safe Stripe publishable key (`pk_test_...` in sandbox). |
| `CLIENT_URL` | Recommended | Public storefront origin used to build checkout success/cancel URLs (for example `http://localhost:3000`). Set it to the live HTTPS origin in production. |
| `FRONTEND_URL` | Recommended | Allowed frontend origin used by API CORS and account-related links. |
| `INTERNAL_API_URL` | Optional | Override the origin used by server-side storefront API fetches. |
| `PAYMENT_CURRENCY` | Optional | Stripe currency code, lowercase (for example `usd`). |
| `NEXT_PUBLIC_CURRENCY` | Optional | Currency shown in the storefront (for example `USD` or `BDT`). |
| `DEFAULT_SHIPPING_CHARGE`, `NEXT_PUBLIC_DEFAULT_SHIPPING_CHARGE` | Optional | Server and storefront default shipping amount. |
| `ALLOW_LIVE_PAYMENTS` | Optional | Keep `false` for test mode. Set to `true` only when using matching Stripe live keys and intentionally accepting live payments. |
| `ADMIN_ADVANCED` | Optional | Set to `true` to enable advanced admin pages and API routes. |
| `STORE_NAME`, `PORT`, `JWT_EXPIRES_IN` | Optional | Store label, server port, and JWT lifetime. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Optional | Credentials for creating the initial admin during seed. Set a strong, private password before seeding. |
| `SEED_DEMO_CUSTOMER_EMAIL`, `SEED_DEMO_CUSTOMER_PASSWORD` | Optional | Optional seed customer credentials; the seed also creates sample orders for that account. |

The Hostinger panel may also contain `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_API_URL`. The current app does not read those names directly; configure `CLIENT_URL` and `FRONTEND_URL` for the live origin, and use `INTERNAL_API_URL` only when you need to override server-side API fetches. Do not put `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `JWT_SECRET`, or `APP_ENCRYPTION_KEY` in client-visible variables.

## Database Setup

1. Create a MySQL database and user.
2. Put its Prisma connection URL in `DATABASE_URL`.
3. Generate Prisma Client and apply committed migrations:

   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

4. Populate the sample catalog:

   ```bash
   npm run seed
   ```

The seed is idempotent and does not clear the database. Do not run local development or smoke checks against a production database. For schema changes during local development, use `npm run prisma:migrate` and commit the generated migration.

## Run Instructions

Development server (storefront and API on the same port):

```bash
npm run dev
```

Production build and start:

```bash
npm run build
npm start
```

On Hostinger, configure the environment variables in the Node.js application settings and deploy the repository. The server uses the `PORT` supplied by the platform.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js storefront and Express API in development mode. |
| `npm run build` | Generate Prisma Client, compile the API, apply migrations, build Next.js, and seed an empty catalog. |
| `npm start` | Start the built production server. |
| `npm run typecheck` | Type-check frontend and server code. |
| `npm run lint` | Run the configured Next.js lint command. |
| `npm run seed` | Idempotently seed the store catalog and configured demo accounts. |
| `npm run smoke:checkout` | Run local checkout/auth smoke checks (requires a disposable local MySQL database). |
| `npm run smoke` | Run the general smoke script. |
| `npm run prisma:studio` | Open Prisma Studio for the configured database. |
| `npm run db:backup` | Create a database backup using the configured connection. |

## Authentication Setup

Customer registration and login are available from the account interface. Passwords are hashed with bcrypt, and successful authentication uses a JWT session cookie. Set a unique `JWT_SECRET` before starting the app. For an initial admin, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in the private server environment, then run the seed; never publish admin credentials. The first-admin onboarding route is also available when no admin account exists.

## Payment Setup

Use matching Stripe **test mode** credentials: `sk_test_...` for the server and `pk_test_...` for the browser. Keep `ALLOW_LIVE_PAYMENTS=false` while testing. Configure `CLIENT_URL` and `PAYMENT_CURRENCY` to match your storefront.

For local webhook testing, install and authenticate Stripe CLI, then run:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the CLI's `whsec_...` value into the local `.env` as `STRIPE_WEBHOOK_SECRET`, restart the app, and check out with Stripe's test card `4242 4242 4242 4242` (any future expiry and CVC). The webhook validates Stripe's signature and order amount, updates inventory after successful payment, and safely ignores duplicate event delivery. Never use a live key for local sandbox testing.

## Demo Credentials

The public reviewer account opens `/admin` in **read-only demo mode**. The overview uses sample figures; it does not show live orders or customer details and cannot change store data. The credentials are printed on the admin sign-in screen with a fill button:

| Email | Password |
| --- | --- |
| `reviewer@epic-store.example.com` | `EpicReview-2026!` |

Use the storefront to browse product listings and details. To test registration, cart, and checkout, create a separate customer account. Do not use the public reviewer account for purchases. Real admin credentials remain private and are not included here.

## Project Map

- `app/` — storefront pages and Next.js app shell
- `components/` — storefront, account, cart, checkout, and admin UI
- `api/` — Express API, auth, checkout, webhook, seed, and Prisma helpers
- `prisma/` — MySQL schema and migrations
- `public/` — static assets
- `scripts/` — smoke checks and operational utilities
