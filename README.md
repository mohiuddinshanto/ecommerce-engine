# ShopEngine Store

A single Node.js process serves the Next.js storefront, Express API, and admin panel. Prisma connects to MySQL. The default storefront language is English and the default currency is USD.

## Local setup

1. Install Node.js 20 or newer and start a local MySQL server. Create an empty database on `127.0.0.1`.
2. Copy `.env.example` to `.env`. Set `DATABASE_URL` to the local database and replace the JWT, encryption, Stripe, and seed-account placeholders you plan to use. Never point local development or the smoke script at a production database.
3. Install dependencies, generate Prisma Client, apply migrations, and seed the demo store:

   ```powershell
   npm install
   npx prisma generate
   npx prisma migrate deploy
   npm run seed
   ```

   The seed creates six English-language categories, 30 products with offline local placeholder images, and three size-variant products. When demo-customer credentials are set, it also creates the demo customer and four sample orders. It preserves existing records when rerun. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to create the first admin, and `SEED_DEMO_CUSTOMER_EMAIL` and `SEED_DEMO_CUSTOMER_PASSWORD` to create the demo customer and sample orders. Passwords are bcrypt-hashed; existing accounts and catalog records are never reset by the seed.

4. Start the app:

   ```powershell
   npm run dev
   ```

5. Open <http://localhost:3000>. Sign in at `/account` with the seed admin email/password, then open `/admin`.

If no seed admin was created, `/onboarding` remains available for the first admin: enter the store name, admin name/email, a unique password (at least eight characters), and theme values, then submit. This creates the first `ADMIN` account and completes store onboarding. Sign in and open `/admin`.

## Environment configuration

See `.env.example` for placeholders. Common settings:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma MySQL connection. Use `127.0.0.1` for the local database. |
| `JWT_SECRET` | Signing key for auth tokens. Use a unique random value at least 32 characters long. |
| `APP_ENCRYPTION_KEY` | At least 32 characters; protects credentials stored in the database. |
| `STORE_NAME` | Storefront metadata name; defaults to `ShopEngine`. |
| `NEXT_PUBLIC_CURRENCY` / `PAYMENT_CURRENCY` | Store display and Stripe session currency; defaults to USD / `usd`. |
| `DEFAULT_SHIPPING_CHARGE` / `NEXT_PUBLIC_DEFAULT_SHIPPING_CHARGE` | Default checkout shipping charge; defaults to 8. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Optional first admin created by the idempotent seed. Set a strong password before seeding. |
| `SEED_DEMO_CUSTOMER_EMAIL` / `SEED_DEMO_CUSTOMER_PASSWORD` | Optional demo customer; the sample orders are created when these are set. |
| `ADMIN_ADVANCED` | `false` by default. Set `true` to expose advanced admin sections and enable their API routes. |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe test credentials and webhook signing secret. Keep the secret key server-side. |
| `PORT` | Local server port; defaults to 3000. |

## Admin panel and integrations

With `ADMIN_ADVANCED=false`, the admin includes Overview, Products, Categories, Orders, Customers (read-only), Coupons, Payments, and basic Settings (store name, configured currency, and default shipping charge). Advanced sections such as media library, reviews, staff, homepage/banner/menu, delivery, checkout form, and storage return 404 from their admin API routes while disabled. Set `ADMIN_ADVANCED=true` and restart the server to enable them.

Courier fields, courier statuses, parcel actions, and balance views appear only when courier credentials are configured in the database or supported server environment variables. The shared configuration check also protects courier API routes.

Stripe checkout displays **Pay with Card (Stripe)** when the secret and publishable keys are configured. Without them it remains visible but disabled with a configuration note. The Payments section shows whether Stripe is configured, whether the secret is a test key, and the webhook URL `/api/webhooks/stripe`; it never displays secret values.

### Stripe test checkout

Set matching Stripe test keys (`sk_test_...` and `pk_test_...`), `STRIPE_WEBHOOK_SECRET`, `CLIENT_URL=http://localhost:3000`, and `PAYMENT_CURRENCY=usd`. Start the app, then in another terminal run:

```powershell
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the signing secret printed by Stripe CLI into `STRIPE_WEBHOOK_SECRET`, restart the app, and complete a checkout with test card `4242 4242 4242 4242` (any future expiry/CVC). The webhook verifies the raw signed body, checks the paid amount against the order total, and applies stock once. Re-send the same event to verify idempotency. The local smoke script uses a locally signed mock event and makes no Stripe network calls.

## Verification

Run the requested local checks against a disposable local MySQL database:

```powershell
npm run typecheck
npm run smoke:checkout
```

The smoke script verifies registration/login, DB cart persistence after a new login, a locally signed `checkout.session.completed` event, duplicate-event idempotency, and a guest order request returning HTTP 401. It refuses a non-local database host and cleans up its temporary rows.

See [scripts/manual-checkout-checklist.md](scripts/manual-checkout-checklist.md) for browser and admin checks.

## Production notes

The production build applies migrations, builds Next.js/API output, and runs the catalog seed only when the catalog is empty. Set the seed credentials in the server environment before the first deployment if you want a seeded admin/demo customer. Existing catalog and user rows are preserved on subsequent seed runs. Keep `.env` out of source control.
