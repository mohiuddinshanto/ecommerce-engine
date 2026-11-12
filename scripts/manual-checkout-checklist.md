# Manual checkout verification checklist

Use a local MySQL database and Stripe test keys only.

- [ ] Register and sign in; verify `/api/auth/me` and protected cart endpoints.
- [ ] Add a guest cart, sign in, then sign out/in or use a second browser; confirm the cart persists.
- [ ] Attempt guest order creation; expect HTTP 401.
- [ ] Complete a Stripe test payment; confirm `PAID` and stock decremented once.
- [ ] Resend the completed event (`stripe events resend <evt_id>`); confirm no second decrement.
- [ ] Cancel a Stripe payment; confirm cart remains and stock is unchanged.
- [ ] Place a COD order; confirm stock decrements and the cart clears.
- [ ] Cancel an order from admin; confirm previously adjusted stock is restored once.
