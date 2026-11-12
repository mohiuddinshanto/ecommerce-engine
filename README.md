# Store — single-app eCommerce (Next.js + Express + Prisma)

Storefront, admin panel and JSON API live in **one Node.js process** on **one
port**. There is no separate API URL, no CORS setup and no second hosting slot.

```
store-app/
├── server.js          single entry point: Express API + Next.js SSR
├── app/ components/ lib/   Next.js App Router storefront + admin
├── api/               Express 5 API (routes, Prisma access, mail, storage)
├── prisma/            schema + migrations
├── public/uploads/    uploaded product images (local storage provider)
├── dist/              compiled output of api/  (tsc, tsconfig.server.json)
└── .next/             Next.js build output
```

## Stack

| Layer     | Technology                                                        |
| --------- | ----------------------------------------------------------------- |
| Frontend  | Next.js 15 App Router, React 19, TypeScript, Tailwind v4, HeroUI  |
| Backend   | Express 5, Zod, Helmet, JWT, Stripe, bcryptjs, Multer, Nodemailer   |
| Database  | Prisma 6 → MySQL                                                   |
| Auth      | JWT httpOnly cookies or Bearer tokens, bcrypt hashes, role based    |
| Secrets   | AES-256-GCM for payment / SMTP / courier / AI credentials          |

## Customer account page

The `/account` sign-in and registration page uses a responsive customer portal
layout with clear tab states, readable form fields, visible keyboard focus, and
touch-friendly controls. Customers can toggle password visibility while signing
in or creating an account. Its styling is scoped to the sign-in experience so it
does not change the customer dashboard after login.

## Product catalog, categories and SEO

- A product can belong to multiple categories. Its primary category remains the
  default, while the additional category assignments also appear in category
  listings and storefront sections.
- Product slugs are generated from the product name and made unique. You can
  still edit a slug manually in the product form.
- Product pages get search metadata automatically: the product name and store
  name form the default title, and a cleaned excerpt of the product description
  forms the default description. Set a product's SEO title or description in the
  admin product form to override either default.
- Sale badges across the storefront show the calculated discount percentage;
  sale and original prices remain visible on the product card.

## Local development

1. Copy the env file and point `DATABASE_URL` at a MySQL server:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Install and prepare the database:

   ```powershell
   npm install
   npm run prisma:deploy   # apply migrations (use prisma:migrate in dev to create new ones)
   npm run seed            # optional demo catalogue
   ```

3. Start everything on <http://localhost:3000>:

   ```powershell
   npm run dev
   ```

   Editing a file under `api/` restarts the API; edits inside `app/`,
   `components/` or `lib/` hot-reload through Next.js. Only one process runs.

## Production build

```powershell
npm run build     # prisma generate + next build + tsc for the API
npm start         # node server.js, listens on $PORT (default 3000)
```

`npm start` fails fast with a clear message if `dist/server.js` is missing —
run `npm run build` first.

### Environment variables

| Variable            | Required | Purpose                                                            |
| ------------------- | -------- | ------------------------------------------------------------------ |
| `DATABASE_URL`      | yes      | MySQL connection string used by Prisma                              |
| `PORT`              | yes      | Port the single server binds to (Hostinger sets this for you)       |
| `APP_ENCRYPTION_KEY`| yes      | AES-256-GCM key (≥ 32 chars) for stored gateway credentials         |
| `FRONTEND_URL`      | no       | CORS allow-list; only needed if the API is hosted separately        |
| `INTERNAL_API_URL`  | no       | Absolute origin for server-side fetches; defaults to `127.0.0.1:$PORT` |
| `HOST`              | no       | Bind address, defaults to `0.0.0.0`                                 |

Generate an encryption key with `openssl rand -hex 32` (or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

## Deploying to Hostinger

### 1. Create the Node.js application

hPanel → **Websites → Node.js → Create** and pick the domain you want to sell
on. Hostinger provisions a folder such as `~/node_app` with a `server.js`
startup file — that is exactly our entry point, so nothing else is needed.

Requirements: Node.js **22** (20 works), and the **Node.js** Web Application
feature (Business/Cloud plans).

### 2. Upload the code

Upload the whole `store-app/` directory (Git, SFTP or the hPanel file manager)
and **exclude** `node_modules`, `.next`, `dist`, `.env` and `*.log` — those are
produced on the server.

### 3. Create the database

hPanel → **Databases → MySQL Databases**, create a database and a user with
full privileges. Hostinger usually restricts connections to `localhost`, so
keep the host as `localhost` in the connection string.

### 4. Configure environment variables

Either add a `.env` file inside the app folder:

```dotenv
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/DATABASE_NAME"
PORT=3000
APP_ENCRYPTION_KEY=<64 hex characters>
FRONTEND_URL=https://yourstore.com
```

or set them in hPanel → **Node.js app → Environment variables**.

### 5. Build and migrate

hPanel runs the **Build command** (`npm run build`) for you, so nothing else is
needed there. It performs, in order:

```bash
prisma generate && npm run migrate:deploy && next build && npm run build:api && npm run seed:store:prod:empty
```

| Step | Purpose |
| --- | --- |
| `prisma generate` | Regenerates the Prisma client |
| `npm run migrate:deploy` | Applies `prisma/migrations/*` and records them in `_prisma_migrations` |
| `next build` | Builds the storefront |
| `npm run build:api` | Compiles `api/**` into `dist/` (required by `server.js`) |
| `npm run seed:store:prod:empty` | Imports the storefront catalog, but only while the catalog is empty |

Running the build again is safe: migrations are skipped when already applied, and
the catalog import is skipped as soon as any product exists, so later admin edits
are never overwritten.

> **Why a custom migration runner?** Some shared hosts execute native binaries
> inside a `noexec` sandbox, which makes Prisma's own `prisma migrate deploy` fail
> with `EACCES` on the bundled `schema-engine`. `scripts/migrate-deploy.js` applies
> the exact same SQL through `mysql2`, which is pure JavaScript, and writes the
> same `_prisma_migrations` bookkeeping (SHA-256 checksums) so `prisma migrate
> status` still reports the database as up to date.

> **Writing migrations:** MySQL table names are case sensitive on Linux hosts, so
> always write them exactly as the `CREATE TABLE` statement spelled them
> (`` `Product` ``, `` `StoreConfig` ``, `` `Order` ``). Never `product` or
> `storeconfig`. The runner checks every table reference against the schema before
> it applies anything, so a mismatch fails the build with a clear message instead
> of a mid-migration error. Column, index and constraint names are not affected.

To rebuild by hand over SSH:

```bash
npm install
npm run deploy
```

### 6. Start the app

hPanel → **Node.js app → Restart**, and confirm the startup file is `server.js`.
Logs appear under the same screen.

The storefront, `/api/*`, `/uploads/*`, `/admin` and `/onboarding` are all
served from the same domain.

### If the host runs `next start` instead of `server.js`

Some hosts lock the startup file and always launch their own Next.js runner.
In that case no Express process exists and `/api/*` returns 404, which makes the
storefront render with empty categories.

`app/api/[...path]/route.ts` handles this: it imports the Express app from
`api/server.ts`, binds it to an ephemeral loopback port on first use, and
proxies each incoming request to it. Everything still lives in one process, so
`next start` alone is enough — no host configuration required.

The bridge is inert when `server.js` is the entry point, because Express claims
`/api/*` before Next.js sees the request. Both paths were verified to return
identical responses for JSON reads, authenticated requests and multipart
uploads.

## Local file storage vs S3

New installs have no storage provider configured. Open `/admin` →
**Storage** after onboarding and pick one:

- **Local** — files are written to `public/uploads/products` inside the app
  folder. Works if the app directory is writable; included in your uploads.
- **Hostinger Object Storage / S3** — files go to a bucket and are served from
  its public URL. Recommended once the store is live, and it survives app
  re-deploys.

SMTP, payment gateways (bKash, Nagad, SSLCommerz), courier (Steadfast) and AI
credentials are stored encrypted in the database from `/admin` → **Settings**;
they never belong in a frontend env file.

## Adding a new API route

Add it to `api/server.ts` under `/api/...`. Because the API app is mounted at
the root of `server.js`, the path is already the public path — the browser calls
`/api/your-route` on the same origin.

## Internship tasks: Task 1 and Task 4

| Feature | Task |
| --- | --- |
| Product catalogue, product details, local cart, accounts, order history and administration | Task 1 |
| JWT sign-up/sign-in, bcrypt password hashes, role based staff access | Task 1 + Task 4 |
| Per-user persistent cart and authenticated checkout | Task 4 |
| Cash on delivery orders with inventory adjustment | Task 1 + Task 4 |
| Stripe test checkout, signed webhook, idempotent payment and inventory adjustment | Task 4 |

### Local setup

1. Install Node.js 20+ and a local MySQL server. Create an empty local database. Copy `.env.example` to `.env`, set `DATABASE_URL` to that local database, and replace `JWT_SECRET` with at least 32 random characters. Never use production database credentials for local work.
2. Install dependencies and initialize the local database/catalogue:

   ```powershell
   npm install
   npx prisma generate
   npx prisma migrate deploy
   npm run seed
   ```

3. Start the combined Next.js and Express server:

   ```powershell
   npm run dev
   ```

   Browse to http://localhost:3000. `npm run seed` only seeds demo products and categories; it does not create an admin account.

### Create the first admin

After migrations are applied and `npm run dev` is running, open <http://localhost:3000/onboarding>. Enter the store name, admin name, admin email, a unique password (at least eight characters), and the required theme colors/font, then submit the form. This creates the first `ADMIN` user and completes store onboarding. Sign in at `/account`, then use `/admin` to manage the store. There is no seeded default admin login. Keep the onboarding details private and use only local database credentials during local setup.

### Stripe sandbox

Set `STRIPE_SECRET_KEY` to an `sk_test_` key from your Stripe test account, `STRIPE_WEBHOOK_SECRET` to the webhook signing secret, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to the matching `pk_test_` key, `CLIENT_URL=http://localhost:3000`, and `PAYMENT_CURRENCY=usd`. The API refuses a live secret unless `ALLOW_LIVE_PAYMENTS=true`.

Run the Stripe CLI in another terminal:

```powershell
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the `whsec_...` value printed by `stripe listen` into `STRIPE_WEBHOOK_SECRET`, then restart the app. Stripe test cards: `4242 4242 4242 4242` succeeds; `4000 0000 0000 9995` is declined. Use any future expiry date and any CVC.

### Manual verification

- Register and sign in at `/account`; confirm protected APIs work with the httpOnly JWT cookie (and with an Authorization Bearer JWT from an API client).
- Add products as a guest, sign in, and confirm the local cart merges into the database cart. Sign out and back in, or open another browser after signing in, and confirm the database cart remains.
- Confirm a guest is redirected to sign-in when submitting checkout and cannot create an order through `POST /api/orders`.
- Complete Stripe checkout with the success test card. Confirm payment becomes `PAID` and stock decreases once. Resend the same event using `stripe events resend <evt_id>` and confirm stock does not decrease again.
- Start another Stripe checkout and cancel it. Confirm the cart remains and stock is unchanged.
- Place a COD order and confirm stock decreases and the cart clears.
- Cancel a stocked order from the admin panel and confirm stock is restored once.

### Automated local smoke check

With `.env` pointing to a disposable MySQL database on `localhost`, run `npm run smoke:checkout`. The script refuses non-local `DATABASE_URL` hosts, creates and cleans up temporary records, and signs a mock Stripe webhook locally with `stripe.webhooks.generateTestHeaderString`; it makes no Stripe network requests.

### API endpoints

| Method and path | Purpose |
| --- | --- |
| `POST /api/auth/sign-up`, `POST /api/auth/sign-in`, `POST /api/auth/sign-out`, `GET /api/auth/me` | Account authentication |
| `GET /api/cart`, `POST /api/cart/items`, `PUT /api/cart/items/:itemId`, `DELETE /api/cart/items/:itemId`, `DELETE /api/cart` | Authenticated persistent cart |
| `POST /api/orders` | Authenticated COD order, calculated from the DB cart |
| `POST /api/checkout/stripe` | Authenticated Stripe Checkout Session |
| `POST /api/webhooks/stripe` | Signed Stripe webhook and inventory update |
| `GET /api/account/orders`, `GET /api/orders/:id` | Authenticated order history/status |
| `GET /api/products`, `GET /api/products/:slug`, `GET /api/categories` | Public catalogue |

