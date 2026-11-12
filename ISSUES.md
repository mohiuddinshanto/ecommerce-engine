# Store App — সমস্যার তালিকা ও উন্নয়ন পরিকল্পনা (Issue List & Roadmap)

> সংস্করণ: ২০২৬-১০-১৫ · কোডবেস: Next.js 15 + Express 5 + Prisma 6 + MySQL
> হিসাব: একটাই Node process, একটাই DB। তালিকা **গুরুত্ব অনুযায়ী সিরিয়াল** করা — সবচেয়ে জরুরি উপরে।

## অগ্রাধিকার চিহ্ন (Priority legend)

| লেবেল | অর্থ | কখন করতে হবে |
|---|---|---|
| **P0 — Critical** | লঞ্চের আগে অবশ্যই | এখনই |
| **P1 — High** | দ্রুত করা দরকার | লঞ্চের কাছাকাছি |
| **P2 — Medium** | mejorar করা উচিত | লঞ্চের পরে শীঘ্রই |
| **P3 — Low** | ভালো হবে করলে | সুযোগমতো |

---

# P0 — Critical — ✅ সব সমাধান হয়েছে ও verified

> সব P0 fix করা হয়েছে, typecheck + build + runtime test দিয়ে যাচাই করা হয়েছে (P0-5/P0-7 বাদে বাকি সব merge-এর আগে)।
> প্রতিটি section-এ নিচে **সমাধান** লেখা আছে।

## ✅ ১. অনলাইন পেমেন্ট — এখন COD-only enforce করা
- **সমাধান (done):** `api/server.ts`-এ `ACTIVE_PAYMENT_GATEWAYS` allow-list যোগ করা হয়েছে। যে gateway-এর real flow নেই (bKash/Nagad/SSLCommerz) সেটা config-এ `enabled` থাকলেও `checkout-options` ও অর্ডার validation-এ দেখায় না — কাস্টমার আর ভুল করে unpaid method বেছে নিতে পারবে না। ভবিষ্যতে integration শেষ হলে শুধু allow-list-এ নাম যোগ করলেই চালু হবে।
- **Verified:** bKash enable করে test → `methods=[COD]`, bKash দিয়ে order → `400 unavailable`।
- **অবস্থান:** `api/server.ts:220-224`, `api/server.ts:550-556`
- **সমস্যা:** bKash / Nagad / SSLCommerz কেবল admin-এ credential হিসেবে সেভ হয়। কোনো create-payment / execute / callback / webhook endpoint নেই। কেউ bKash সিলেক্ট করলে order সাথে সাথে `UNPAID` অবস্থায় তৈরি হয়ে success পেজে চলে যায় — কাস্টমার ভাবে পেমেন্ট হয়ে গেছে।
- **উপরন্তু:** `README.md:188` দাবি করে এগুলো "supported", যা বাস্তব নয়।
- **করনীয়:** অন্তত একটি gateway (BD-তে **SSLCommerz** সবচেয়ে সহজ) সত্যি implement করুন — order তৈরি → gateway redirect → callback verify → `paymentStatus=PAID`। অথবা যা কাজ করে না সেটা checkout-এ **লুকিয়ে দিন** (`checkout-options`).
- **যতক্ষণ না হয়:** COD ছাড়া অন্য method disable রাখুন।

## ✅ ২. Footer-এর নতুন ফিল্ড সেভ হচ্ছে (committed)
- **অবস্থান:** `api/server.ts` (zod footer schema)
- **সমস্যা ছিল:** schema-তে শুধু `enabled / copyright / links` ছিল; zod unknown key strip করে ফেলায় brand / logo / slogan / social / categories / contact **সেভ হচ্ছিল না**।
- **সমাধান (done, committed):** zod schema expand করা হয়েছে; commit `8f87461`. Runtime-এ verify করা হয়েছে (brand/social/slogan/email persist হয়)।

## ✅ ৩. Rate Limiting যোগ করা হয়েছে
- **সমস্যা ছিল:** `sign-in`/`sign-up`-এ brute-force / credential stuffing সম্ভব; newsletter ও order spam করা যায়।
- **সমাধান (done):** নতুন `api/lib/rate-limit.ts` (in-memory fixed-window limiter)। লাগানো হয়েছে — sign-up (10/15m), sign-in (20/15m), newsletter (10/1h), coupon (40/5m), orders (20/10m)। 429 + `Retry-After` + `X-RateLimit-*` হেডার দেয়।
- **Verified:** ২৫টা failed sign-in → 429; ১২টা newsletter → 429।

## ✅ ৪. Security Headers যোগ করা হয়েছে
- **সমস্যা ছিল:** HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy` কিছুই ছিল না।
- **সমাধান (done):** `server.js`-এ global middleware — `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`, baseline `Content-Security-Policy` (`frame-ancestors 'self'; object-src 'none'; base-uri 'self'`), এবং production-এ HSTS। API ও Next page দুই জায়গাতেই প্রযোজ্য।
- **Verified:** page ও API দুই জায়গায় হেডার উপস্থিত।
- **নোট:** strict `script-src` CSP ভাঙার ঝুঁকি থাকায় এখনো দেওয়া হয়নি (ভবিষ্যতে nonce সহ করা যায়)।

## ✅ ৫. Auth Token এখন httpOnly Cookie-তে
- **সমস্যা ছিল:** যেকোনো XSS-এ `epic-admin-token`/`epic-customer-token` চুরি হয়ে অ্যাকাউন্ট দখল হতে পারত।
- **সমাধান (done):** session এখন `epic_session` **httpOnly** cookie-তে (sameSite=lax, `secure` actual HTTPS-এ)। localStorage থেকে সব token সরানো হয়েছে — client শুধু cookie দিয়ে auth হয়; `Authorization: Bearer` fallback রাখা হয়েছে (API clients/tooling-এর জন্য)। sign-out-এ cookie ও session মুছে যায়। password reset-এ সব পুরনো session বাতিল হয়।
- **Verified:** sign-up `HttpOnly` cookie দেয় ও body-তে token নেই; cookie দিয়ে `/me` 200; cookie ছাড়া 401; bearer fallback 200; sign-out-এর পর session নেই।

## ✅ ৬. CORS Allow-list কঠোর করা হয়েছে
- **সমস্যা ছিল:** `cb(null, true)` — `credentials: true` সহ যেকোনো origin allow হয়ে যেত।
- **সমাধান (done):** শুধু `FRONTEND_URL` list + `*.gadgetlagbe.online` (strict regex) এবং dev-এ localhost reflect হয়; বাকি origin-এ `Access-Control-Allow-Origin` দেওয়া হয় না।
- **Verified:** `evil.example.com` → ACAO নেই; `woocommerce.gadgetlagbe.online` → reflect হয়।

## ✅ ৭. Email Verification + Self-service Password Reset যোগ করা হয়েছে
- **সমস্যা ছিল:** রেজিস্ট্রেশনে email যাচাই হতো না; পাসওয়ার্ড ভুলে গেলে কাস্টমার নিজে রিসেট করতে পারত না।
- **সমাধান (done):** User model-এ `emailVerificationToken/Expiry` ও `passwordResetToken/Expiry` (migration `20261015000000_add_auth_tokens`)। নতুন endpoint — `verify-email`, `resend-verification`, `forgot-password` (enumeration-safe), `reset-password` (weak password reject, reset-এ সব session বাতিল)। নতুন page `/verify-email` ও `/reset-password`; account-panel-এ "পাসওয়ার্ড ভুলে গেছেন?" + unverified banner। mail template যোগ (`sendEmailVerification`, `sendPasswordReset`)।
- **Verified:** verify token flow, reset token flow, weak password reject, পুরনো password ভাঙে, নতুন password কাজ করে, stale token reject — সব pass।
- **নোট:** আসল ইমেইল পাঠাতে SMTP configure থাকা লাগবে (এখানে SMTP ছিল না, তাই শুধু token logic যাচাই হয়েছে)।

## ✅ ৮. Tests / CI / DB Backup যোগ করা হয়েছে
- **সমস্যা ছিল:** কোনো automated test/CI/backup ছিল না; footer bug সেশনেই ধরা পড়েনি।
- **সমাধান (done):** `scripts/smoke.mjs` (`npm run smoke`, ৮টি endpoint/page), `scripts/backup-db.mjs` (`npm run db:backup`, timestamped mysqldump → `backups/`), এবং `.github/workflows/ci.yml` (MySQL service + typecheck + build)।
- **Verified:** smoke 8/8; backup 143 KB dump তৈরি হয়েছে।

---

# P1 — ✅ সব সমাধান হয়েছে ও verified

## ✅ ৯. STAFF-order category authorization enforce
- **সমাধান:** নতুন `staffCanAccessOrderItems()` (`api/middleware/security.ts`) — STAFF-এর `allowedCategories` (খালি হলে = unrestricted) অনুযায়ী order access check। `PATCH /api/admin/orders/:id` ও `send-steadfast`-এ enforce (না মিললে 403)। সাথে list filter-ও ঠিক করা হয়েছে (array handle করে, scope-এর বাইরের order বাদ যায়)। staff create-এ `allowedCategories` এখন array হিসেবে সেভ হয় (আগে stringify হয়ে restriction অকেজো ছিল)।
- **Verified:** mismatched staff → 403, matched → 200, no-scope → 200; list filtered।

## ✅ ১০. Password change-এ session invalidation
- **সমাধান:** নতুন `POST /api/auth/change-password` (current password যাচাই) — পাসওয়ার্ড বদলে **সব পুরনো session বাতিল** করে শুধু বর্তমান ডিভাইসের জন্য নতুন cookie দেয় (rotation)। account-panel-এ "নিরাপত্তা" ট্যাবে UI। (reset-password-ও আগেই সব session মুছে দিত।)
- **Verified:** ভুল current → 400; সঠিক → 200 + নতুন cookie; পুরনো session → 401; নতুন password দিয়ে sign-in → 200।

## ✅ ১১. Shop-এ incremental rendering (Load more)
- **সমাধান:** `components/shop-view.tsx` — প্রথমে ২৪টা card render, "আরও দেখুন" বাটনে পরের ব্যাচ (DOM/LCP হালকা; filter/size/count accuracy ধরে রাখতে full data fetch অপরিবর্তিত)। filter/sort বদলালে আবার ২৪-এ reset।
- **নোট:** খুব বড় catalogue-এর জন্য server `?page=&limit=` + facets একটি follow-up।

## ✅ ১২. Admin secret masking
- **সমাধান:** `api/server.ts` — GET ও PATCH response-এ `appSecret/password/pass/apiKey/secretAccessKey/...` গুলো `••••••••` মানে masked। খালি/মাস্কেড মান পাঠালে `mergeSecretConfig`/`mergeGateway` পুরনো আসল secret রাখে। email/courier/ai/storage সবই এখন prior-এর সাথে merge হয়।
- **Verified:** GET mask করে, non-secret appKey আগের মতো; masked পাঠালে DB-তে পুরনো আসল মান থাকে।

## ✅ ১৩. Shipping config (zone-wise)
- **সমাধান:** `StoreConfig.shippingConfig` (migration `20261016000000_add_shipping_config`) — `defaultCharge`, `freeAbove`, এবং zone list (`charge` + `districts`). `computeShippingCents()` district/division মিলিয়ে charge ঠিক করে; কোনো config না থাকলে fallback ৳80। checkout-options ও checkout page-এ live charge দেখায়; admin "Delivery" সেকশনে zone editor।
- **Verified:** Dhaka zone → 60, অন্য → 80, freeAbove (≥2000) → 0।

## ✅ ১৪. Graceful shutdown + crash handlers
- **সমাধান:** `server.js` — `SIGTERM`/`SIGINT`-এ server.close() + Prisma disconnect (১০s force-exit timeout); `unhandledRejection` লগ করে site আপ রাখে; `uncaughtException`-এ clean shutdown + exit 1 (host restart policy-র জন্য)।

## ✅ ১৫. Email retry + durable failed-email log
- **সমাধান:** `api/lib/mailer.ts` — প্রতিটি mail ৩ বার backoff সহ retry; সব attempt ব্যর্থ হলে নতুন `FailedEmail` টেবিলে (migration `20261016010000_add_failed_email`) persist। admin API `GET/POST resend/DELETE /api/admin/failed-emails` + Delivery সেকশনে "Failed Emails" কার্ড (resend/delete)।
- **Verified:** ব্যর্থ SMTP-এ order দিলে FailedEmail row তৈরি ও admin list-এ দেখায়।

---


# P2 — Medium

## ✅ ১৬. marketingPixels এখন inject হয়
- **সমাধান:** নতুন `components/marketing-scripts.tsx` (`next/script`) — GA4, GTM, Meta Pixel, TikTok Pixel storefront-এ load হয়। `app/layout.tsx` store-status থেকে `marketingPixels` পড়ে দেয়। প্রতিটি ID provider-format regex দিয়ে validate করা হয় (inline script-এ XSS এড়াতে); ভুল ফরম্যাট হলে skip।

## ⏭️ ১৭. In-memory Cache (single instance only) — deferred (roadmap)
- **নোট:** এক instance-এ ঠিক আছে; horizontal scale করলে Redis লাগবে (`api/lib/cache.ts`)। এখনও প্রযোজ্য নয় — VPS/multi-instance গেলে করণীয়।

## ⏭️ ১৮. Images Unoptimized — deferred (infra)
- **নোট:** shared host-এ optimizer অফ (`next.config.ts` `unoptimized: true`)। CDN (Hostinger Object Storage/Cloudflare) + resized variants লাগবে — infra কাজ।

## ✅ ১৯. Prisma Pool এখন env-configurable
- **সমাধান:** `api/lib/prisma.ts:14` — `DATABASE_CONNECTION_LIMIT` / `DATABASE_POOL_TIMEOUT` env দিয়ে (বা URL params দিয়ে) bump করা যায়; URL-এ থাকলে তা-ই প্রাধান্য পায়। ডিফল্ট ৫ (shared MySQL `max_connections` মাথায় রেখে)।

## ✅ ২০. `express.json()` limit স্পষ্ট করা হয়েছে
- **সমাধান:** `api/server.ts:40` — `express.json({ limit: "1mb" })`। বড় variation/attribute payload আর অপ্রত্যাশিতভাবে 413 খাবে না।

## ✅ ২১. `x-forwarded-for` spoof ঠেকানো হয়েছে
- **সমাধান:** `app.set("trust proxy", 1)` থাকায় `req.ip`-ই trusted-proxy-resolved client IP। তাই `api/middleware/security.ts` (`checkIpCooldown`) ও order IP দুটোই এখন `req.ip` ব্যবহার করে — ক্লায়েন্ট header spoof করে spam-guard bypass করতে পারবে না।

## ✅ ২২. Coupon enumeration কমিয়েছে
- **সমাধান:** validate endpoint-এ rate limit ছিল (`windowMs: 5min, max: 40`)। এখন "valid-but-not-applicable" code-ও invalid-এর মতোই uniform `404 "Coupon is invalid or expired"` ফেরায় — code-এর অস্তিত্ব ফাঁস হয় না।

---

# P3 — Low / UX / Code quality

## ✅ ২৩. `error.tsx` / `not-found.tsx` / `global-error.tsx` যোগ করা হয়েছে
- **সমাধান:** `app/error.tsx` (retry button), `app/not-found.tsx` (branded ৪০৪), `app/global-error.tsx` (root crash fallback)। ভেরিফায়েড: অজানা path → ৪০৪ branded পেজ।

## ⏭️ ২৪. Admin Panel একটাই বিশাল Component — deferred (refactor)
- **নোট:** `components/admin-panel.tsx` ~৫৩০০ লাইন, first-load ~৩০০kB। sectional split/lazy-load একটি বড় refactor — আলাদা কাজ হিসেবে রাখা হলো (ভাঙার ঝুঁকি এড়াতে)।

## ✅ ২৫. Middleware প্রতি Request-এ Status Fetch কমানো
- **সমাধান:** `middleware.ts` — onboarded=true হলে cache TTL ৬০s → **১০ মিনিট** (onboarded কখনো false হয় না)। onboarded=false/unknown এখনও ৩s (দ্রুত onboarding-এর জন্য)।

## ✅ ২৬. Bridge Mode extra hop নিশ্চিত করা হয়েছে
- **সমাধান:** deployment **startup file = `server.js`** (Express API + Next একই process-এ mount), তাই `app/api/[...path]` bridge proxy hop লাইভে ব্যবহার হয় না। নিশ্চিত করতে hPanel-এ startup file `server.js` রাখতে হবে (নোট: ব্রীজ শুধু `next start` চালালে সক্রিয় হয়)।

## ✅ ২৭. STAFF Role-এর endpoint-permission matrix
- **সমাধান:** `api/middleware/auth.ts:68` — নতুন `requireStaffArea("orders" | "products")`। ADMIN সব পায়; STAFF-এর `staffType` সেট থাকলে সে শুধু নিজের domain পায় (`ORDER_MANAGER` → orders/steadfast, `PRODUCT_MANAGER` → products/images/variations/upload)। পুরনো STAFF (staffType=null) আগের মতোই full access (backward-compat)। admin-panel-এ nav-ও sub-role অনুযায়ী filter হয়।
- **Verified:** PRODUCT_MANAGER orders list/PATCH → 403; ORDER_MANAGER upload → 403; নিজ নিজ domain → 200।

## ✅ ২৮. Newsletter unsubscribe flow যোগ করা হয়েছে
- **সমাধান:** `NewsletterSubscriber`-এ `unsubscribeToken` (unique) + `unsubscribedAt` (migration `20261016020000_add_newsletter_unsubscribe`)। subscribe-এ token তৈরি, welcome mail-এ আসল unsubscribe লিংক। নতুন `POST /api/newsletter/unsubscribe` ও `/unsubscribe` পেজ (confirm-based)। আবার subscribe করলে `unsubscribedAt` ক্লিয়ার হয়।
- **Verified:** token issue, invalid token → 404, unsubscribe → unsubscribedAt সেট।

## ✅ ২৯. Health/Readiness আলাদা
- **সমাধান:** `api/server.ts` — `/health` liveness (`{ok:true}`) রেখে নতুন **`/ready`** যোগ (Prisma `SELECT 1`); DB down হলে `503 {ok:false,db:"down"}`। ভেরিফায়েড: DB বন্ধ → ৫০৩, চালু → ২০০।

## ✅ ৩০. Password Reset CLI-তে secret input
- **সমাধান:** `api/reset-password.ts` — password আর command argument-এ নয়; `ADMIN_RESET_PASSWORD` env var বা interactive **hidden prompt** থেকে নেয়। usage উদাহরণও নিরাপদ করা হয়েছে।

## ✅ ৩১. Variable Product-এ manual out-of-stock মানা হয়
- **সমাধান:** `api/server.ts` order validation — variation-এর `manageStock=false` হলে এখন `stock <= 0` যাচাই করে order আটকায় (simple product-এর মতোই)।
- **Verified:** variation (manageStock=false, stock=0) → order 409 out-of-stock।

---

# স্কেলেবিলিটি — কতোজন কাস্টমার handle করবে

**আর্কিটেকচার:** ১টি Node process (Express + Next SSR) + ১টি MySQL, Prisma pool = **5**।

| লোড | ধারণক্ষমতা |
|---|---|
| ব্রাউজিং (cached reads) | স্বাচ্ছন্দ্যে; কয়েকশ visiting/ঘণ্টা |
| সমান্তরাল DB-hit | একসাথে ~৫–১০ (pool limit) |
| Active concurrent users | ~৩০–৫০ |
| ১০০+ concurrent / flash sale | queue + timeout, ভাঙার ঝুঁকি |
| দৈনিক ভিজিটর | ~২,০০০–৫,০০০ (তবে একসাথে ১০০+ গেলে সমস্যা) |
| দৈনিক order | শতাধিক (ছোট/মাঝারি স্টোরের জন্য যথেষ্ট) |

**বড় করার শর্ত:** VPS + MySQL tuning + pool বাড়ানো + Redis + CDN + shop pagination → দৈনিক ~৫–২০ হাজার ভিজিটর সম্ভব।

---

# লঞ্চ করার উপযোগি কি?

**শর্তসাপেক্ষে হ্যাঁ — COD-only মডেলে।**

- শক্ত দিক: catalog, cart, checkout, order+stock+coupon **atomic transaction** (`api/server.ts:581-659`), admin, Steadfast courier, encrypted secrets, SSR, caching।
- **P0-র সব (১–৮) এখন সমাধান হয়েছে** ও verified — লঞ্চের আগের critical ঝুঁকি কমে গেছে।
- Online payment বাস্তবে implement করা হয়নি (দরকার হলে SSLCommerz ইত্যাদি)।
- লাইভ সাইটে পুরনো build চলছে → hPanel **Deploy → Build → Restart** ছাড়া পরিবর্তন আসবে না।

---

# দ্রুত করণীয় (action checklist)

## P0 — ✅ সম্পন্ন (typecheck + build + runtime test verified)
- [x] **P0-1** কাজ না করা payment method checkout থেকে hide (`ACTIVE_PAYMENT_GATEWAYS`)
- [x] **P0-2** footer fix commit (`8f87461`) — push + redeploy বাকি
- [x] **P0-3** auth/order/newsletter-এ rate limiting
- [x] **P0-4** security headers
- [x] **P0-5** token → httpOnly cookie
- [x] **P0-6** CORS allow-list কঠোর
- [x] **P0-7** email verification + forgot-password
- [x] **P0-8** automated DB backup + smoke test + CI

## P1 — ✅ সম্পন্ন (typecheck + build + runtime test verified)
- [x] **P1-9** STAFF order-update authorization
- [x] **P1-10** password change → session invalidation + rotation
- [x] **P1-11** shop load-more (incremental render)
- [x] **P1-12** admin secret masking
- [x] **P1-13** shipping config (zone wise)
- [x] **P1-14** graceful shutdown + crash handlers
- [x] **P1-15** email retry + failed-email log
- [x] **P1-28** newsletter unsubscribe flow

## P2 — ✅ সম্পন্ন (যেগুলো কোড-লেভেল)
- [x] **P2-16** marketing pixels inject (GA/GTM/Meta/TikTok)
- [x] **P2-19** Prisma pool env-configurable
- [x] **P2-20** express.json 1mb limit
- [x] **P2-21** trusted-proxy IP (x-forwarded-for spoof বন্ধ)
- [x] **P2-22** coupon enumeration (uniform response + throttle)
- [x] **P2-29** `/ready` DB-aware readiness check
- [x] **P2-30** reset-password CLI secret input
- [x] **P2-31** variable product manual out-of-stock
- [ ] **P2-17** Redis (multi-instance cache) — infra/deferred
- [ ] **P2-18** CDN + image variants — infra/deferred

## P3 — ✅ সম্পন্ন (যেগুলো কোড-লেভেল)
- [x] **P3-23** error/404/global-error পেজ
- [x] **P3-25** middleware onboarded cache 10 মিনিট
- [x] **P3-26** startup = `server.js` (bridge hop এড়ানো)
- [x] **P3-27** STAFF sub-role permission matrix
- [ ] **P3-24** admin-panel split/lazy-load — refactor/deferred

## বাকি (ইনফ্রা/refactor — আলাদা কাজ)
- [ ] **P2-17/18** Redis + CDN (scale-এ দরকার)
- [ ] **P3-24** admin-panel ভাগ করা
- [ ] Online payment gateway (SSLCommerz ইত্যাদি) — implement করা হয়নি
