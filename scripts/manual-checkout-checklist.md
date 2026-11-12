# Manual checkout verification checklist

Use a disposable local MySQL database and Stripe test keys only. Never use production database credentials for these checks.

- [ ] Register and sign in; confirm `/api/auth/me` and protected cart endpoints work.
- [ ] Add products as a guest, sign in, and confirm the local cart merges into the database cart and local storage clears.
- [ ] Sign out, sign in again in a new session, and confirm the database cart persists.
- [ ] Attempt guest order creation through `POST /api/orders`; expect HTTP 401.
- [ ] Add or update a cart quantity above available stock; confirm the quantity is capped at stock.
- [ ] Create a Stripe checkout session; confirm stock is unchanged before payment.
- [ ] Complete a Stripe test payment; confirm the webhook marks the order `PAID` and decrements stock once.
- [ ] Re-send the same completed event; confirm the event id is recorded and stock does not decrement again.
- [ ] Send a signed event whose amount differs from the order total; confirm the order is not marked `PAID`.
- [ ] Cause an oversold line at webhook time; confirm stock changes roll back and the order is flagged for refund.
- [ ] Cancel/expire a Stripe session and visit the cancel page; confirm stock is unchanged.
- [ ] Place a COD order; confirm stock decrements when the order is created.
- [ ] Cancel a COD order and a paid Stripe order in admin; confirm each restores stock once.
- [ ] Sign out and confirm the JWT cookie is cleared; use an expired/invalid token and expect HTTP 401.
- [ ] With `ADMIN_ADVANCED=false`, confirm only the basic admin sections appear and advanced API routes return 404.
- [ ] With no courier credentials, confirm no courier fields, `In Courier` status, sync button, or balance appear in admin.
- [ ] If configured, confirm courier controls appear in admin and courier requests require configured credentials.

Automated local verification:

```powershell
npm run typecheck
npm run smoke:checkout
```

The automated script locally signs its mocked Stripe event with `stripe.webhooks.generateTestHeaderString`; it makes no Stripe API/network calls and refuses non-local database hosts.
