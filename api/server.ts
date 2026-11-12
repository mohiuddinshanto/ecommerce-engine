import "dotenv/config";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./lib/prisma.js";
import { cached, purgeCache, PUBLIC_CACHE_CONTROL } from "./lib/cache.js";
import { apiCompression } from "./lib/compress.js";
import { checkIpCooldown, restrictStaffOrderView, staffCanAccessOrderItems } from "./middleware/security.js";
import { rateLimit } from "./lib/rate-limit.js";
import { makeSessionToken, issueAuthToken, readSessionToken, requireAuth, requireRole, requireStaffArea, setSessionCookie, clearSessionCookie } from "./middleware/auth.js";
import { decrypt, encrypt } from "./lib/crypto.js";
import { uploadImage, deleteImage, getLocalProductsDirectory, imageContentType, isPersistentLocalStoragePath, listImages } from "./lib/storage.js";
import { baseSkuForParts, generateVariationsForProduct, makeUniqueSku, replaceProductVariations } from "./lib/product-variations.js";
import { resendStoredEmail, sendEmailVerification, sendNewOrderToOwner, sendOrderConfirmation, sendOrderStatusEmail, sendPasswordReset, sendTestMail } from "./lib/mailer.js";
import { handleStripeEvent, stripe } from "./lib/payments.js";

const app = express();
async function handleStripeWebhook(req: express.Request, res: express.Response) {
  try {
    await handleStripeEvent(req.body as Buffer, req.header("stripe-signature"));
    res.json({ received: true });
  } catch (error) {
    if (error instanceof Error && /signature|webhook/i.test(error.message)) return res.status(400).json({ error: "Invalid Stripe webhook signature" });
    throw error;
  }
}
const slugFromName = (value: string) =>
  value.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/(^-|-$)/g, "");
async function uniqueProductSlug(value: string, exceptId?: string) {
  const base = slugFromName(value) || `product-${Date.now()}`;
  let candidate = base;
  let suffix = 2;
  while (await prisma.product.findFirst({ where: { slug: candidate, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true } })) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
}
app.set("trust proxy", 1);
app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_URL ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      // Same-origin requests (no Origin header) are always allowed.
      if (!origin) return cb(null, true);
      const allowed =
        allowedOrigins.includes(origin) ||
        /^https?:\/\/([a-z0-9-]+\.)?gadgetlagbe\.online$/i.test(origin) ||
        (process.env.NODE_ENV !== "production" && /^https?:\/\/localhost(:\d+)?$/i.test(origin));
      cb(null, allowed);
    },
    credentials: true,
  })
);
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res, next) => {
  try { await handleStripeWebhook(req, res); } catch (error) { next(error); }
});
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
  }
  next();
});
// Any successful admin mutation may change products, categories or store
// config, so drop the read cache instead of tracking every write by hand.
app.use("/api/admin", (req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) purgeCache();
    });
  }
  next();
});

// Public, non-user-specific reads may be cached by browsers and the CDN. The
// default no-store headers set above are cleared for these responses only.
function applyPublicCache(res: express.Response): void {
  res.set("Cache-Control", PUBLIC_CACHE_CONTROL);
  res.removeHeader("Pragma");
  res.removeHeader("Expires");
}

app.use(apiCompression());
const legacyUploadsDirectory = process.env.UPLOADS_DIR ?? "public/uploads";
app.use("/uploads/products", async (req, res, next) => {
  try {
    const directory = await getLocalProductsDirectory();
    const staticOptions = {
      maxAge: "30d" as const,
      fallthrough: true,
      index: false,
      setHeaders(response: express.Response, filePath: string) {
        const contentType = imageContentType(filePath);
        if (contentType) response.setHeader("Content-Type", contentType);
        response.setHeader("X-Content-Type-Options", "nosniff");
      },
    };
    express.static(directory, staticOptions)(req, res, (error) => {
      if (error) return next(error);
      express.static(`${legacyUploadsDirectory}/products`, staticOptions)(req, res, next);
    });
  } catch (error) {
    next(error);
  }
});
app.use("/uploads", express.static(legacyUploadsDirectory, { maxAge: "30d", fallthrough: true, index: false }));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    /^image\//.test(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only image files are allowed")),
});

const onboardingSchema = z.object({
  storeName: z.string().trim().min(2).max(100),
  adminName: z.string().trim().min(2).max(100),
  adminEmail: z.string().email(),
  password: z.string().min(8).max(128),
  themeSettings: z.object({
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    font: z.string().min(1).max(100),
  }),
});

const defaultFeatureFlags = { reviews: true, wishlist: true, coupons: true, cod: true, addToCart: true, checkoutEmail: false, bottomNav: true };

const defaultCheckoutForm = {
  name: { enabled: true, required: true, label: "Full name", placeholder: "Rahim Ahmed" },
  phone: { enabled: true, required: true, label: "Mobile number", placeholder: "01712345678" },
  email: { enabled: false, required: false, label: "Email address (optional)", placeholder: "you@example.com" },
  address: { enabled: true, required: true, label: "Delivery address", placeholder: "House 12, Road 5, Block B" },
  district: { enabled: true, required: true, label: "District", placeholder: "Dhaka" },
  division: { enabled: true, required: true, label: "Division", placeholder: "Dhaka" },
};
const gatewayBase = {
  enabled: z.boolean(),
  mode: z.enum(["sandbox", "live"]).optional(),
  callbackUrl: z.string().url().optional(),
};

const paymentSettingsSchema = z.object({
  bkash: z.object({
    ...gatewayBase,
    appKey: z.string().optional(),
    appSecret: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
  }).optional(),
  nagad: z.object({
    ...gatewayBase,
    merchantId: z.string().optional(),
    merchantNumber: z.string().optional(),
    privateKey: z.string().optional(),
  }).optional(),
  sslcommerz: z.object({
    ...gatewayBase,
    storeId: z.string().optional(),
    storePassword: z.string().optional(),
    sandbox: z.boolean().optional(),
  }).optional(),
});
type PaymentSettings = z.infer<typeof paymentSettingsSchema>;

// Gateways that have a real payment flow (init + callback + verification)
// implemented. Anything not listed here is hidden from checkout even if it is
// enabled in the admin payment settings, so customers can never pick a method
// that would silently leave the order unpaid.
const ACTIVE_PAYMENT_GATEWAYS = new Set<string>([]);

const DEFAULT_SHIPPING_CENTS = Math.round(Number(process.env.DEFAULT_SHIPPING_CHARGE ?? 80) * 100);

export type ShippingZone = { name?: string; charge?: number; districts?: string[] };
export type ShippingOption = { id?: string; name?: string; charge?: number };
export type ShippingConfig = { defaultCharge?: number; freeAbove?: number | null; zones?: ShippingZone[]; options?: ShippingOption[] };

/** Resolve the shipping charge (in poisha/cents) from the admin zone config. */
export function computeShippingCents(subtotalCents: number, config: unknown, details: Record<string, unknown>): number {
  if (subtotalCents <= 0) return 0;
  const cfg = (config ?? {}) as ShippingConfig;
  const freeAbove = cfg.freeAbove;
  if (typeof freeAbove === "number" && freeAbove > 0 && subtotalCents >= Math.round(freeAbove * 100)) return 0;
  const district = String(details.district ?? "").trim().toLowerCase();
  const division = String(details.division ?? "").trim().toLowerCase();
  const zones = Array.isArray(cfg.zones) ? cfg.zones : [];
  const match = zones.find(
    (zone) =>
      Array.isArray(zone?.districts) &&
      zone.districts.some((entry) => {
        const target = String(entry ?? "").trim().toLowerCase();
        return target !== "" && (target === district || target === division);
      }),
  );
  const chargeTaka = match?.charge ?? cfg.defaultCharge;
  if (typeof chargeTaka === "number" && Number.isFinite(chargeTaka) && chargeTaka >= 0) return Math.round(chargeTaka * 100);
  return DEFAULT_SHIPPING_CENTS;
}

const attributeValueSchema = z.object({
  id: z.string().min(1),
  value: z.string().trim().min(1),
  colorSwatch: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
});

const attributeSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  values: z.array(attributeValueSchema).min(1),
});

const variationSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  sku: z.string().nullable().optional(),
  price: z.number().nonnegative(),
  salePrice: z.number().nonnegative().nullable().optional(),
  stock: z.number().int().nonnegative(),
  manageStock: z.boolean().optional(),
  weight: z.number().nonnegative().nullable().optional(),
  image: z.string().nullable().optional(),
  gallery: z.array(z.string()).nullable().optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["active", "disabled"]).optional(),
  isDefault: z.boolean().optional(),
  attributes: z.array(z.object({ attributeId: z.string().min(1), valueId: z.string().min(1) })).min(1),
});

app.get("/health", (_req, res) => res.json({ ok: true }));

// Readiness probe: verifies the DB dependency so monitors can distinguish a
// live process from a store that cannot actually serve requests.
app.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "up" });
  } catch {
    res.status(503).json({ ok: false, db: "down" });
  }
});

app.get("/api/store/status", async (_req, res) => {
  const payload = await cached("store:status", 30_000, async () => {
    const config = await prisma.storeConfig.findUnique({
      where: { id: "store-config-singleton" },
      select: {
        isOnboarded: true,
        storeName: true,
        logoUrl: true,
        themeSettings: true,
        chatConfig: true,
        marketingPixels: true,
        featureFlags: true,
        homePageConfig: true,
        heroBannerConfig: true,
        navigationConfig: true,
      },
    });
    const configOut = config ? { ...config, featureFlags: { ...defaultFeatureFlags, ...((config.featureFlags as Record<string, boolean> | null) ?? {}) } } : config;
    return { onboarded: Boolean(config?.isOnboarded), config: configOut };
  });
  applyPublicCache(res);
  res.json(payload);
});

app.get("/api/store/checkout-options", async (_req, res) => {
  const payload = await cached("store:checkout-options", 60_000, async () => {
    const config = await prisma.storeConfig.findUnique({
      where: { id: "store-config-singleton" },
      select: { featureFlags: true, paymentConfig: true, checkoutForm: true, shippingConfig: true },
    });
    const flags = { ...defaultFeatureFlags, ...((config?.featureFlags as Record<string, boolean> | null) ?? {}) };
    const encrypted = config?.paymentConfig as { encrypted?: string } | null;
    const payments = encrypted?.encrypted ? (decrypt<PaymentSettings>(encrypted.encrypted) ?? {}) : {};
    const methods = [
      ...(flags.cod ? [{ id: "COD", label: "Cash on delivery" }] : []),
      ...(process.env.STRIPE_SECRET_KEY ? [{ id: "STRIPE", label: "Pay with Card (Stripe)" }] : []),
      ...(payments.bkash?.enabled && ACTIVE_PAYMENT_GATEWAYS.has("bKash") ? [{ id: "bKash", label: "bKash" }] : []),
      ...(payments.nagad?.enabled && ACTIVE_PAYMENT_GATEWAYS.has("Nagad") ? [{ id: "Nagad", label: "Nagad" }] : []),
      ...(payments.sslcommerz?.enabled && ACTIVE_PAYMENT_GATEWAYS.has("SSLCommerz") ? [{ id: "SSLCommerz", label: "Card / Mobile Banking" }] : []),
    ];
    const saved = (config?.checkoutForm as Record<string, Record<string, unknown>> | null) ?? {};
    const form = Object.fromEntries(
      Object.keys(defaultCheckoutForm).map((key) => [key, { ...defaultCheckoutForm[key as keyof typeof defaultCheckoutForm], ...(saved[key] ?? {}) }]),
    );
    const emailEnabled = Boolean((form as Record<string, { enabled?: boolean }>).email?.enabled);
    const shippingConfig = (config?.shippingConfig ?? null) as ShippingConfig | null;
    return { methods, codEnabled: flags.cod, requiresEmail: flags.checkoutEmail === true || emailEnabled, form, shippingConfig };
  });
  applyPublicCache(res);
  res.json(payload);
});

app.get("/api/categories", async (_req, res) => {
  const categories = await cached("categories:all", 60_000, () =>
    prisma.category.findMany({
      include: { _count: { select: { products: { where: { isActive: true } }, productLinks: { where: { product: { isActive: true } } } } } },
      orderBy: { name: "asc" },
    }),
  );
  applyPublicCache(res);
  res.json(categories.map(({ _count, ...category }) => ({ ...category, _count: { ..._count, products: _count.productLinks } })));
});

const PRODUCT_LIST_DEFAULT_PAGE_SIZE = 24;
const PRODUCT_LIST_MAX_PAGE_SIZE = 100;

async function queryProductList(where: Prisma.ProductWhereInput, page?: number, pageSize?: number) {
  const select = {
    id: true,
    slug: true,
    name: true,
    price: true,
    salePrice: true,
    stock: true,
    manageStock: true,
    productType: true,
    sku: true,
    description: true,
    images: true,
    categoryId: true,
    categoryLinks: { select: { categoryId: true } },
    defaultVariationId: true,
    imagesDetails: { orderBy: { sortOrder: "asc" as const } },
    attributes: { select: { id: true, name: true, values: { select: { id: true, value: true } } } },
    variations: {
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        salePrice: true,
        stock: true,
        manageStock: true,
        image: true,
        attributes: {
          select: { attributeId: true, valueId: true, value: { select: { value: true } } },
        },
      },
      where: { status: "active" },
      orderBy: { createdAt: "asc" as const },
    },
    category: { select: { name: true, slug: true } },
    _count: { select: { reviews: { where: { isApproved: true } } } },
  };

  if (page === undefined || pageSize === undefined) {
    const items = await prisma.product.findMany({ where, select, orderBy: { createdAt: "desc" } });
    return { paginated: false as const, items };
  }

  const [total, items] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { paginated: true as const, items, total, page, pageSize };
}

app.get("/api/products", async (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;

  const wantsPagination =
    req.query.page !== undefined || req.query.limit !== undefined || req.query.pageSize !== undefined;

  const limitRaw = Number(req.query.limit ?? req.query.pageSize);
  const pageRaw = Number(req.query.page);
  const pageSize = Math.min(
    Math.max(Number.isFinite(limitRaw) && limitRaw > 0 ? Math.trunc(limitRaw) : PRODUCT_LIST_DEFAULT_PAGE_SIZE, 1),
    PRODUCT_LIST_MAX_PAGE_SIZE,
  );
  const page = Math.max(Number.isFinite(pageRaw) && pageRaw > 0 ? Math.trunc(pageRaw) : 1, 1);

  const cacheKey = `products:${category ?? "all"}:${wantsPagination ? `${page}:${pageSize}` : "full"}`;

  const payload = await cached(cacheKey, 30_000, async () => {
    let categoryFilter: object = {};
    if (category) {
      const cats = await prisma.category.findMany({ select: { id: true, slug: true, parentId: true } });
      const root = cats.find((c) => c.slug === category);
      if (!root) {
        categoryFilter = { id: "__none__" };
      } else {
        const byParent = new Map<string, string[]>();
        for (const c of cats) {
          if (c.parentId) {
            const arr = byParent.get(c.parentId) ?? [];
            arr.push(c.id);
            byParent.set(c.parentId, arr);
          }
        }
        const ids: string[] = [];
        const stack = [root.id];
        while (stack.length) {
          const cur = stack.pop()!;
          ids.push(cur);
          for (const childId of byParent.get(cur) ?? []) stack.push(childId);
        }
        categoryFilter = { OR: [{ categoryId: { in: ids } }, { categoryLinks: { some: { categoryId: { in: ids } } } }] };
      }
    }

    const where: Prisma.ProductWhereInput = { isActive: true, ...categoryFilter };

    if (!wantsPagination) {
      const result = await queryProductList(where);
      return result.items;
    }

    const result = await queryProductList(where, page, pageSize);
    if (!result.paginated) return result.items;

    return {
      items: result.items,
      page,
      pageSize,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
      hasMore: page * pageSize < result.total,
    };
  });

  applyPublicCache(res);
  res.json(payload);
});

app.get("/api/products/:slug", async (req, res) => {
  const cacheKey = `product:${req.params.slug}`;
  const product = await cached(cacheKey, 30_000, async () => {
    const found = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        categoryLinks: { select: { categoryId: true, category: { select: { id: true, name: true, slug: true } } } },
        imagesDetails: { orderBy: { sortOrder: "asc" } },
        attributes: { include: { values: true }, orderBy: { createdAt: "asc" } },
        variations: {
          where: { status: "active" },
          include: { attributes: { include: { attribute: { select: { id: true, name: true } }, value: true } } },
          orderBy: { createdAt: "asc" },
        },
        reviews: {
          where: { isApproved: true },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return found && found.isActive ? found : null;
  });
  if (!product) {
    purgeCache(cacheKey);
    return res.status(404).json({ error: "Product not found" });
  }
  applyPublicCache(res);
  res.json(product);
});

const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(8).max(128) });

app.post("/api/auth/sign-up", rateLimit({ windowMs: 15 * 60_000, max: 10, message: "Too many sign-up attempts. Please try again later." }), async (req, res) => {
  const data = credentialsSchema.extend({ name: z.string().trim().min(2).max(100) }).safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "Invalid registration data" });
  if (await prisma.user.findUnique({ where: { email: data.data.email } })) return res.status(409).json({ error: "Email already registered" });
  const user = await prisma.user.create({
    data: { name: data.data.name, email: data.data.email, passwordHash: await bcrypt.hash(data.data.password, 12) },
  });
  const token = issueAuthToken(user);
  setSessionCookie(req, res, token);
  const verificationToken = makeSessionToken();
  await prisma.user.update({ where: { id: user.id }, data: { emailVerificationToken: verificationToken, emailVerificationExpiry: new Date(Date.now() + VERIFICATION_TTL_MS) } });
  sendEmailVerification(user.email, user.name, `${appBaseUrl()}/verify-email?token=${verificationToken}`).catch((err) => console.error("verification mail failed:", err.message));
  res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.post("/api/auth/sign-in", rateLimit({ windowMs: 15 * 60_000, max: 20, message: "Too many sign-in attempts. Please try again later." }), async (req, res) => {
  const data = credentialsSchema.safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "Invalid credentials" });
  const user = await prisma.user.findUnique({ where: { email: data.data.email } });
  if (!user || !(await bcrypt.compare(data.data.password, user.passwordHash)))
    return res.status(401).json({ error: "Incorrect email or password" });
  const token = issueAuthToken(user);
  setSessionCookie(req, res, token);
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.get("/api/auth/me", requireAuth, async (req, res) => res.json({ user: req.user }));
app.post("/api/auth/sign-out", requireAuth, async (req, res) => {
  clearSessionCookie(req, res);
  res.status(204).end();
});

app.post("/api/auth/change-password", requireAuth, rateLimit({ windowMs: 15 * 60_000, max: 10, message: "Too many attempts. Please try again later." }), async (req, res) => {
  const parsed = z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(8).max(128) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid password payload" });
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !user.passwordHash) return res.status(404).json({ error: "Account not found" });
  if (!(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)))
    return res.status(400).json({ error: "Current password is incorrect" });
  if (await bcrypt.compare(parsed.data.newPassword, user.passwordHash))
    return res.status(400).json({ error: "New password must be different from the current password" });
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  const token = issueAuthToken(user);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.user.update({ where: { id: user.id }, data: { updatedAt: new Date() } }),
  ]);
  setSessionCookie(req, res, token);
  res.json({ ok: true });
});

function appBaseUrl(): string {
  const raw = process.env.FRONTEND_URL ?? process.env.APP_URL ?? "";
  const first = raw.split(",")[0]?.trim();
  return (first || "http://localhost:3000").replace(/\/+$/, "");
}

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

app.post("/api/auth/verify-email", rateLimit({ windowMs: 15 * 60_000, max: 20 }), async (req, res) => {
  const parsed = z.object({ token: z.string().min(10).max(200) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid verification link" });
  const user = await prisma.user.findFirst({ where: { emailVerificationToken: parsed.data.token, emailVerificationExpiry: { gt: new Date() } } });
  if (!user) return res.status(400).json({ error: "This verification link is invalid or has expired." });
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true, emailVerificationToken: null, emailVerificationExpiry: null } });
  res.json({ ok: true });
});

app.post("/api/auth/resend-verification", requireAuth, rateLimit({ windowMs: 10 * 60_000, max: 3 }), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "Account not found" });
  if (user.emailVerified) return res.json({ ok: true, alreadyVerified: true });
  const token = makeSessionToken();
  await prisma.user.update({ where: { id: user.id }, data: { emailVerificationToken: token, emailVerificationExpiry: new Date(Date.now() + VERIFICATION_TTL_MS) } });
  sendEmailVerification(user.email, user.name, `${appBaseUrl()}/verify-email?token=${token}`).catch((err) => console.error("verification mail failed:", err.message));
  res.json({ ok: true });
});

app.post("/api/auth/forgot-password", rateLimit({ windowMs: 15 * 60_000, max: 5 }), async (req, res) => {
  const parsed = z.object({ email: z.string().email().max(200) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid email address" });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const token = makeSessionToken();
    await prisma.user.update({ where: { id: user.id }, data: { passwordResetToken: token, passwordResetExpiry: new Date(Date.now() + PASSWORD_RESET_TTL_MS) } });
    sendPasswordReset(user.email, user.name, `${appBaseUrl()}/reset-password?token=${token}`).catch((err) => console.error("password reset mail failed:", err.message));
  }
  res.json({ ok: true });
});

app.post("/api/auth/reset-password", rateLimit({ windowMs: 15 * 60_000, max: 10 }), async (req, res) => {
  const parsed = z.object({ token: z.string().min(10).max(200), password: z.string().min(8).max(128) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Password must be at least 8 characters long." });
  const user = await prisma.user.findFirst({ where: { passwordResetToken: parsed.data.token, passwordResetExpiry: { gt: new Date() } } });
  if (!user) return res.status(400).json({ error: "This reset link is invalid or has expired." });
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null, emailVerified: true } }),
  ]);
  res.json({ ok: true });
});

const cartItemInput = z.object({ productId: z.string().min(1), variationId: z.string().min(1).optional(), quantity: z.number().int().min(1).max(999) });
async function getUserCart(userId: string) {
  return prisma.cart.upsert({ where: { userId }, create: { userId }, update: {}, include: { items: { include: { product: true, variation: true } } } });
}
function cartResponse(cart: Awaited<ReturnType<typeof getUserCart>>) {
  const items = cart.items.map((item) => {
    const product = item.product;
    const variation = item.variation;
    const price = variation ? (variation.salePrice && Number(variation.salePrice) < Number(variation.price) ? Number(variation.salePrice) : Number(variation.price)) : (product.salePrice && Number(product.salePrice) < Number(product.price) ? Number(product.salePrice) : Number(product.price));
    const image = variation?.image || (Array.isArray(product.images) ? product.images[0] : null);
    return { id: item.id, productId: product.id, variationId: item.variationId, quantity: item.quantity, qty: item.quantity, name: variation ? `${product.name} (${variation.name})` : product.name, price, image, images: image ? [image] : (Array.isArray(product.images) ? product.images : []), categoryId: product.categoryId, categoryIds: [product.categoryId], stock: variation?.stock ?? product.stock, manageStock: variation?.manageStock ?? product.manageStock, subtotal: price * item.quantity };
  });
  return { items, subtotal: items.reduce((sum, item) => sum + item.subtotal, 0) };
}
async function availableStock(productId: string, variationId?: string) {
  if (variationId) return prisma.productVariation.findFirst({ where: { id: variationId, productId, status: "active" }, select: { stock: true, manageStock: true } });
  return prisma.product.findUnique({ where: { id: productId }, select: { stock: true, manageStock: true } });
}
app.get("/api/cart", requireAuth, async (req, res) => res.json(cartResponse(await getUserCart(req.user!.id))));
app.post("/api/cart/items", requireAuth, async (req, res) => {
  const parsed = cartItemInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid cart item" });
  const { productId, variationId, quantity } = parsed.data;
  const product = await prisma.product.findFirst({ where: { id: productId, isActive: true } });
  if (!product) return res.status(404).json({ error: "Product is unavailable" });
  if ((product.productType === "VARIABLE" && !variationId) || (product.productType === "SIMPLE" && variationId)) return res.status(400).json({ error: "Choose a valid product option" });
  const stock = await availableStock(productId, variationId);
  if (!stock) return res.status(404).json({ error: "Selected option is unavailable" });
  const cart = await prisma.cart.upsert({ where: { userId: req.user!.id }, create: { userId: req.user!.id }, update: {} });
  const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId, variationId: variationId ?? null } });
  const nextQuantity = quantity + (existing?.quantity ?? 0);
  if (stock.manageStock && nextQuantity > stock.stock) return res.status(409).json({ error: stock.stock ? `Only ${stock.stock} available.` : "Out of stock." });
  if (existing) await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQuantity } });
  else await prisma.cartItem.create({ data: { cartId: cart.id, productId, variationId, variationKey: variationId ?? "", quantity } });
  res.status(201).json(cartResponse(await getUserCart(req.user!.id)));
});
app.put("/api/cart/items/:itemId", requireAuth, async (req, res) => {
  const parsed = z.object({ quantity: z.number().int().min(1).max(999) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Quantity must be an integer of at least one" });
  const item = await prisma.cartItem.findFirst({ where: { id: String(req.params.itemId), cart: { userId: req.user!.id } } });
  if (!item) return res.status(404).json({ error: "Cart item not found" });
  const stock = await availableStock(item.productId, item.variationId ?? undefined);
  if (!stock || (stock.manageStock && parsed.data.quantity > stock.stock)) return res.status(409).json({ error: stock?.stock ? `Only ${stock.stock} available.` : "Out of stock." });
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: parsed.data.quantity } });
  res.json(cartResponse(await getUserCart(req.user!.id)));
});
app.delete("/api/cart/items/:itemId", requireAuth, async (req, res) => {
  await prisma.cartItem.deleteMany({ where: { id: String(req.params.itemId), cart: { userId: req.user!.id } } });
  res.json(cartResponse(await getUserCart(req.user!.id)));
});
app.delete("/api/cart", requireAuth, async (req, res) => {
  await prisma.cartItem.deleteMany({ where: { cart: { userId: req.user!.id } } });
  res.json({ items: [], subtotal: 0 });
});

// Customer Wishlist
app.get("/api/wishlist", async (req, res) => {
  const token = readSessionToken(req);
  if (!token) return res.json([]);
  try {
    const jwt = await import("jsonwebtoken");
    const payload = jwt.default.verify(token, process.env.JWT_SECRET!) as { sub?: string };
    if (!payload.sub) return res.json([]);
    res.json(await prisma.wishlist.findMany({ where: { userId: payload.sub }, include: { product: { include: { category: true } } } }));
  } catch { res.json([]); }
});
app.post("/api/wishlist/:productId", requireAuth, async (req, res) => {
  const productId = String(req.params.productId);
  const where = { userId_productId: { userId: req.user!.id, productId } };
  const existing = await prisma.wishlist.findUnique({ where });
  if (existing) {
    await prisma.wishlist.delete({ where });
    return res.status(204).end();
  }
  await prisma.wishlist.create({ data: { userId: req.user!.id, productId } });
  res.status(201).json({ saved: true });
});

// Product Reviews
app.post("/api/products/:productId/reviews", requireAuth, async (req, res) => {
  const data = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().max(2000).optional() }).safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "Invalid review" });
  const productId = String(req.params.productId);
  const review = await prisma.review.upsert({
    where: { productId_userId: { productId, userId: req.user!.id } },
    update: { rating: data.data.rating, comment: data.data.comment, isApproved: false },
    create: { rating: data.data.rating, comment: data.data.comment, productId, userId: req.user!.id, isApproved: false },
  });
  res.status(201).json(review);
});

app.get("/api/account/orders", requireAuth, async (req, res) => {
  res.json(await prisma.order.findMany({ where: { customerId: req.user!.id, deletedAt: null }, orderBy: { createdAt: "desc" } }));
});
app.get("/api/orders/:id", requireAuth, async (req, res) => {
  const order = await prisma.order.findFirst({ where: { id: String(req.params.id), customerId: req.user!.id, deletedAt: null }, select: { id: true, status: true, paymentStatus: true, totalAmount: true, createdAt: true } });
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});

// Coupons Validation API
app.post("/api/coupons/validate", rateLimit({ windowMs: 5 * 60_000, max: 40, message: "Too many coupon attempts. Please try again later." }), async (req, res) => {
  const data = z.object({ code: z.string().trim().toUpperCase(), subtotal: z.number().nonnegative(), categoryIds: z.array(z.string()).default([]) }).safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "Invalid coupon request" });
  const coupon = await prisma.coupon.findUnique({ where: { code: data.data.code } });
  const now = new Date();
  if (
    !coupon ||
    !coupon.isActive ||
    (coupon.startsAt && coupon.startsAt > now) ||
    (coupon.expiresAt && coupon.expiresAt < now) ||
    (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) ||
    (coupon.minSpend && data.data.subtotal < Number(coupon.minSpend))
  )
    return res.status(404).json({ error: "Coupon is invalid or expired" });

  const legacyOrKnownCategories = await prisma.category.findMany({
    where: { OR: [{ id: { in: data.data.categoryIds } }, { slug: { in: data.data.categoryIds } }] },
    select: { id: true },
  });
  const submittedCategoryIds = new Set([...data.data.categoryIds, ...legacyOrKnownCategories.map((category) => category.id)]);
  const permitted = !coupon.applicableCategoryIds || (coupon.applicableCategoryIds as string[]).some((id) => submittedCategoryIds.has(id));
  // Same response as an invalid code so the endpoint cannot be used to tell a
  // real-but-ineligible code apart from a non-existent one.
  if (!permitted) return res.status(404).json({ error: "Coupon is invalid or expired" });

  const raw = coupon.type === "PERCENTAGE" ? (data.data.subtotal * Number(coupon.value)) / 100 : Number(coupon.value);
  const discount = Math.min(raw, coupon.maxDiscount ? Number(coupon.maxDiscount) : raw);
  res.json({ id: coupon.id, code: coupon.code, discount });
});

// Onboarding
app.post("/api/onboarding", async (req, res) => {
  const parsed = onboardingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid onboarding data", issues: parsed.error.flatten() });
  const existing = await prisma.storeConfig.findUnique({ where: { id: "store-config-singleton" } });
  if (existing?.isOnboarded) return res.status(403).json({ error: "Onboarding is already complete" });
  const duplicateAdmin = await prisma.user.findUnique({ where: { email: parsed.data.adminEmail } });
  if (duplicateAdmin) return res.status(409).json({ error: "An account with this email already exists" });
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.$transaction([
    prisma.user.create({ data: { name: parsed.data.adminName, email: parsed.data.adminEmail, passwordHash, role: "ADMIN" } }),
    prisma.storeConfig.upsert({
      where: { id: "store-config-singleton" },
      update: { storeName: parsed.data.storeName, themeSettings: parsed.data.themeSettings, featureFlags: defaultFeatureFlags, isOnboarded: true },
      create: { id: "store-config-singleton", storeName: parsed.data.storeName, themeSettings: parsed.data.themeSettings, featureFlags: defaultFeatureFlags, isOnboarded: true },
    }),
  ]);
  purgeCache("store:");
  res.status(201).json({ message: "Store onboarding completed" });
});

// Create Order API
app.post("/api/checkout/abandoned", rateLimit({ windowMs: 10 * 60_000, max: 60 }), async (req, res) => {
  const parsed = z.object({
    sessionId: z.string().min(16).max(64).regex(/^[a-zA-Z0-9_-]+$/),
    name: z.string().max(191).optional(), phone: z.string().max(32).optional(), email: z.string().max(191).optional(), address: z.string().max(2000).optional(),
    items: z.array(z.object({ name: z.string().max(191), qty: z.number().int().positive(), price: z.number().nonnegative() })).max(50),
    total: z.number().nonnegative(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid checkout snapshot" });
  const d = parsed.data;
  await prisma.abandonedCheckout.upsert({ where: { sessionId: d.sessionId }, create: { ...d, total: d.total, items: d.items as Prisma.InputJsonValue }, update: { name: d.name, phone: d.phone, email: d.email, address: d.address, total: d.total, items: d.items as Prisma.InputJsonValue, updatedAt: new Date() } });
  res.json({ ok: true });
});

app.post("/api/checkout/stripe", requireAuth, rateLimit({ windowMs: 10 * 60_000, max: 20 }), async (req, res) => {
  const parsed = z.object({ shippingDetails: z.record(z.string(), z.unknown()), couponId: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid checkout details" });
  const cart = await prisma.cart.findUnique({ where: { userId: req.user!.id }, include: { items: { include: { product: { include: { categoryLinks: true } }, variation: true } } } });
  if (!cart?.items.length) return res.status(400).json({ error: "Your cart is empty" });
  const details = parsed.data.shippingDetails as Record<string, unknown>;
  for (const [key, field] of Object.entries(defaultCheckoutForm)) if (field.required && (typeof details[key] !== "string" || !String(details[key]).trim())) return res.status(400).json({ error: `${field.label} is required.` });
  const normalized: Array<{ productId: string; variationId?: string; name: string; qty: number; price: number; categoryId: string; categoryIds: string[]; sku?: string }> = [];
  let subtotalCents = 0;
  for (const item of cart.items) {
    const product = item.product;
    const variation = item.variation;
    if (!product.isActive || (product.productType === "VARIABLE" && (!variation || variation.status !== "active"))) return res.status(409).json({ error: `${product.name} is unavailable.` });
    const stock = variation ?? product;
    if (stock.manageStock && item.quantity > stock.stock) return res.status(409).json({ error: `${product.name} is out of stock.` });
    const priceValue = variation?.salePrice && Number(variation.salePrice) < Number(variation.price) ? variation.salePrice : variation?.price ?? (product.salePrice && Number(product.salePrice) < Number(product.price) ? product.salePrice : product.price);
    const priceCents = Math.round(Number(priceValue) * 100);
    const name = variation ? `${product.name} (${variation.name})` : product.name;
    subtotalCents += priceCents * item.quantity;
    normalized.push({ productId: product.id, variationId: variation?.id, name, qty: item.quantity, price: Number((priceCents / 100).toFixed(2)), categoryId: product.categoryId, categoryIds: product.categoryLinks.map((link) => link.categoryId), sku: variation?.sku ?? product.sku ?? undefined });
  }
  const config = await prisma.storeConfig.findUnique({ where: { id: "store-config-singleton" }, select: { shippingConfig: true, featureFlags: true } });
  const shippingConfig = (config?.shippingConfig ?? {}) as ShippingConfig;
  const shippingOptions = Array.isArray(shippingConfig.options) ? shippingConfig.options : [];
  let shippingCents = computeShippingCents(subtotalCents, shippingConfig, details);
  if (shippingOptions.length) {
    const choice = String(details.shippingOptionId ?? "");
    const option = shippingOptions.find((item, index) => String(item.id ?? index) === choice);
    if (!option || typeof option.charge !== "number" || !Number.isFinite(option.charge) || option.charge < 0) return res.status(400).json({ error: "Select a valid shipping option." });
    shippingCents = Math.round(option.charge * 100);
    details.shippingOptionName = option.name ?? "Delivery";
  }
  let discountCents = 0;
  let couponId: string | undefined;
  if (parsed.data.couponId) {
    const flags = { ...defaultFeatureFlags, ...((config?.featureFlags as Record<string, boolean> | null) ?? {}) };
    const coupon = await prisma.coupon.findUnique({ where: { id: parsed.data.couponId } });
    const now = new Date();
    if (!flags.coupons || !coupon || !coupon.isActive || (coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt < now) || (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit)) return res.status(400).json({ error: "Coupon is invalid or expired." });
    if (coupon.minSpend && subtotalCents < Math.round(Number(coupon.minSpend) * 100)) return res.status(400).json({ error: "Order subtotal does not meet this coupon's minimum spend." });
    const allowedCategories = coupon.applicableCategoryIds as string[] | null;
    if (allowedCategories?.length && !normalized.some((item) => item.categoryIds.some((id) => allowedCategories.includes(id)))) return res.status(400).json({ error: "Coupon does not apply to items in your cart." });
    const priorUses = await prisma.order.count({ where: { deletedAt: null, couponId: coupon.id, customerId: req.user!.id } });
    if (coupon.perUserLimit !== null && priorUses >= coupon.perUserLimit) return res.status(400).json({ error: "Coupon usage limit reached." });
    const rawDiscount = coupon.type === "PERCENTAGE" ? Math.round(subtotalCents * Number(coupon.value) / 100) : Math.round(Number(coupon.value) * 100);
    discountCents = Math.min(rawDiscount, coupon.maxDiscount ? Math.round(Number(coupon.maxDiscount) * 100) : rawDiscount, subtotalCents);
    const increment = await prisma.coupon.updateMany({ where: { id: coupon.id, usedCount: coupon.usedCount, ...(coupon.usageLimit !== null ? { usedCount: { equals: coupon.usedCount, lt: coupon.usageLimit } } : {}) }, data: { usedCount: { increment: 1 } } });
    if (increment.count !== 1) return res.status(400).json({ error: "Coupon usage limit reached." });
    couponId = coupon.id;
  }
  const totalCents = Math.max(0, subtotalCents - discountCents + shippingCents);
  const currency = (process.env.PAYMENT_CURRENCY || "usd").toLowerCase();
  const order = await prisma.order.create({ data: { customerId: req.user!.id, ipAddress: req.ip || "127.0.0.1", paymentMethod: "STRIPE", paymentStatus: "UNPAID", status: "PENDING", couponId, discountAmount: discountCents / 100, subtotal: subtotalCents / 100, shippingCharge: shippingCents / 100, totalAmount: totalCents / 100, shippingDetails: details as Prisma.InputJsonValue, orderItems: normalized as Prisma.InputJsonValue } });
  try {
    const origin = (process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0].replace(/\/+$/, "");
    const lineItems = normalized.map((item) => ({ quantity: item.qty, price_data: { currency, unit_amount: Math.round(item.price * 100), product_data: { name: item.name } } }));
    if (shippingCents) lineItems.push({ quantity: 1, price_data: { currency, unit_amount: shippingCents, product_data: { name: "Shipping" } } });
    const discounts = discountCents ? [{ coupon: (await stripe().coupons.create({ amount_off: discountCents, currency, duration: "once" })).id }] : undefined;
    const session = await stripe().checkout.sessions.create({ mode: "payment", line_items: lineItems, discounts, client_reference_id: req.user!.id, metadata: { orderId: order.id }, payment_intent_data: { metadata: { orderId: order.id } }, success_url: `${origin}/checkout/success?order=${order.id}`, cancel_url: `${origin}/checkout/cancel?order=${order.id}` });
    await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
    res.json({ url: session.url, orderId: order.id });
  } catch (error) {
    await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED", paymentStatus: "FAILED" } });
    return res.status(503).json({ error: error instanceof Error ? error.message : "Could not start Stripe checkout" });
  }
});

app.post("/api/orders", requireAuth, rateLimit({ windowMs: 10 * 60_000, max: 20, message: "Too many order attempts. Please try again later." }), checkIpCooldown, async (req, res) => {
  const schema = z.object({
    paymentMethod: z.literal("COD"),
    couponId: z.string().optional(),
    checkoutSessionId: z.string().max(64).optional(),
    shippingDetails: z.record(z.string(), z.unknown()),
    orderItems: z.array(z.unknown()).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid order payload", issues: parsed.error.flatten() });

  class OrderRequestError extends Error {
    constructor(public status: number, message: string) { super(message); }
  }

  const customerId = req.user!.id;

  const storeConfig = await prisma.storeConfig.findUnique({ where: { id: "store-config-singleton" }, select: { featureFlags: true, paymentConfig: true, checkoutForm: true, shippingConfig: true } });
  const flags = { ...defaultFeatureFlags, ...((storeConfig?.featureFlags as Record<string, boolean> | null) ?? {}) };
  const encryptedPayments = storeConfig?.paymentConfig as { encrypted?: string } | null;
  const payments = encryptedPayments?.encrypted ? (decrypt<PaymentSettings>(encryptedPayments.encrypted) ?? {}) : {};
  const methods = [
    ...(flags.cod ? ["COD"] : []),
    ...(payments.bkash?.enabled && ACTIVE_PAYMENT_GATEWAYS.has("bKash") ? ["bKash"] : []),
    ...(payments.nagad?.enabled && ACTIVE_PAYMENT_GATEWAYS.has("Nagad") ? ["Nagad"] : []),
    ...(payments.sslcommerz?.enabled && ACTIVE_PAYMENT_GATEWAYS.has("SSLCommerz") ? ["SSLCommerz"] : []),
  ];
  if (!methods.includes(parsed.data.paymentMethod)) return res.status(400).json({ error: "Selected payment method is unavailable." });

  const shippingDetails = parsed.data.shippingDetails as Record<string, unknown>;
  const savedForm = (storeConfig?.checkoutForm as Record<string, Record<string, unknown>> | null) ?? {};
  for (const [key, defaults] of Object.entries(defaultCheckoutForm)) {
    const field = { ...defaults, ...(savedForm[key] ?? {}) };
    if (field.enabled && field.required && (typeof shippingDetails[key] !== "string" || !String(shippingDetails[key]).trim())) {
      return res.status(400).json({ error: `${field.label} is required.` });
    }
  }

  const ipAddress = req.ip || "127.0.0.1";
  const requestedItems = new Map<string, { productId: string; variationId?: string; qty: number }>();
  const userCart = await prisma.cart.findUnique({ where: { userId: customerId }, include: { items: true } });
  if (!userCart?.items.length) return res.status(400).json({ error: "Your cart is empty" });
  for (const row of userCart.items) {
    const item = { productId: row.productId, qty: row.quantity, variationId: row.variationId ?? undefined };
    const key = `${item.productId}:${item.variationId ?? ""}`;
    const qty = (requestedItems.get(key)?.qty ?? 0) + item.qty;
    if (!Number.isSafeInteger(qty)) return res.status(400).json({ error: "Invalid item quantity." });
    requestedItems.set(key, { productId: item.productId, variationId: item.variationId, qty });
  }

  const cents = (value: number | string | { toString(): string }) => Math.round(Number(value) * 100);
  const asMoney = (value: number) => Number((value / 100).toFixed(2));

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      const normalizedItems: { productId: string; variationId?: string; name: string; qty: number; price: number; categoryId: string; categoryIds: string[]; sku?: string }[] = [];
      let subtotalCents = 0;

      for (const item of requestedItems.values()) {
        const product = await tx.product.findUnique({ where: { id: item.productId }, include: { categoryLinks: { select: { categoryId: true } } } });
        if (!product || !product.isActive) throw new OrderRequestError(404, "One or more products are unavailable.");

        let unitPrice: number;
        let name = product.name;
        let sku = product.sku ?? undefined;
        if (product.productType === "VARIABLE") {
          if (!item.variationId) throw new OrderRequestError(400, `Choose an option for ${product.name}.`);
          const variation = await tx.productVariation.findFirst({ where: { id: item.variationId, productId: product.id, status: "active" } });
          if (!variation) throw new OrderRequestError(400, `The selected option for ${product.name} is unavailable.`);
          unitPrice = variation.salePrice !== null && Number(variation.salePrice) < Number(variation.price) ? cents(variation.salePrice) : cents(variation.price);
          name = `${product.name} (${variation.name})`;
          sku = variation.sku ?? sku;
          if (variation.manageStock) {
            const updated = await tx.productVariation.updateMany({ where: { id: variation.id, productId: product.id, status: "active", stock: { gte: item.qty } }, data: { stock: { decrement: item.qty } } });
            if (updated.count !== 1) throw new OrderRequestError(409, `${name} is out of stock.`);
          } else if (variation.stock <= 0) {
            throw new OrderRequestError(409, `${name} is out of stock.`);
          }
        } else {
          if (item.variationId) throw new OrderRequestError(400, `The selected option for ${product.name} is invalid.`);
          unitPrice = product.salePrice !== null && Number(product.salePrice) < Number(product.price) ? cents(product.salePrice) : cents(product.price);
          if (product.manageStock) {
            const updated = await tx.product.updateMany({ where: { id: product.id, isActive: true, stock: { gte: item.qty } }, data: { stock: { decrement: item.qty } } });
            if (updated.count !== 1) throw new OrderRequestError(409, `${product.name} is out of stock.`);
          } else if (product.stock <= 0) {
            throw new OrderRequestError(409, `${product.name} is out of stock.`);
          }
        }

        const lineTotalCents = unitPrice * item.qty;
        if (!Number.isSafeInteger(lineTotalCents) || !Number.isSafeInteger(subtotalCents + lineTotalCents)) {
          throw new OrderRequestError(400, "Order total exceeds the supported amount.");
        }
        subtotalCents += lineTotalCents;
        normalizedItems.push({ productId: product.id, variationId: item.variationId, name, qty: item.qty, price: asMoney(unitPrice), categoryId: product.categoryId, categoryIds: product.categoryLinks.map((link) => link.categoryId), sku });
      }

      const shippingConfig = (storeConfig?.shippingConfig ?? {}) as ShippingConfig;
      const shippingChoice = String(shippingDetails.shippingOptionId ?? "");
      const configuredOptions = Array.isArray(shippingConfig.options) ? shippingConfig.options : [];
      let shippingCents: number;
      if (configuredOptions.length) {
        const option = configuredOptions.find((item, index) => String(item.id ?? index) === shippingChoice);
        if (!option || typeof option.charge !== "number" || !Number.isFinite(option.charge) || option.charge < 0) {
          throw new OrderRequestError(400, "Select a valid shipping option.");
        }
        shippingCents = Math.round(option.charge * 100);
        shippingDetails.shippingOptionName = option.name ?? "Delivery";
      } else {
        shippingCents = computeShippingCents(subtotalCents, shippingConfig, shippingDetails);
      }
      let discountCents = 0;
      let couponId: string | undefined;
      if (parsed.data.couponId) {
        if (!flags.coupons) throw new OrderRequestError(400, "Coupons are currently unavailable.");
        const coupon = await tx.coupon.findUnique({ where: { id: parsed.data.couponId } });
        const now = new Date();
        if (!coupon || !coupon.isActive || (coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt < now) || (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit)) {
          throw new OrderRequestError(400, "Coupon is invalid or expired.");
        }
        if (coupon.minSpend && subtotalCents < cents(coupon.minSpend)) throw new OrderRequestError(400, "Order subtotal does not meet this coupon's minimum spend.");
        const allowedCategories = coupon.applicableCategoryIds as string[] | null;
        if (allowedCategories?.length && !normalizedItems.some((item) => item.categoryIds.some((categoryId) => allowedCategories.includes(categoryId)))) {
          throw new OrderRequestError(400, "Coupon does not apply to items in your cart.");
        }
        const priorUses = await tx.order.count({ where: { deletedAt: null, couponId: coupon.id, ...(customerId ? { customerId } : { ipAddress }) } });
        if (coupon.perUserLimit !== null && priorUses >= coupon.perUserLimit) throw new OrderRequestError(400, "Coupon usage limit reached.");
        const rawDiscount = coupon.type === "PERCENTAGE" ? Math.round((subtotalCents * Number(coupon.value)) / 100) : cents(coupon.value);
        discountCents = Math.min(rawDiscount, coupon.maxDiscount ? cents(coupon.maxDiscount) : rawDiscount, subtotalCents);
        const couponUpdate = await tx.coupon.updateMany({
          where: { id: coupon.id, usedCount: { equals: coupon.usedCount, ...(coupon.usageLimit !== null ? { lt: coupon.usageLimit } : {}) } },
          data: { usedCount: { increment: 1 } },
        });
        if (couponUpdate.count !== 1) throw new OrderRequestError(400, "Coupon usage limit reached.");
        couponId = coupon.id;
      }

      const createdOrder = await tx.order.create({
        data: {
          paymentMethod: parsed.data.paymentMethod,
          stockAdjusted: true,
          subtotal: asMoney(subtotalCents),
          shippingCharge: asMoney(shippingCents),
          discountAmount: asMoney(discountCents),
          totalAmount: asMoney(Math.max(0, subtotalCents - discountCents + shippingCents)),
          couponId,
          shippingDetails: shippingDetails as Prisma.InputJsonValue,
          orderItems: normalizedItems as Prisma.InputJsonValue,
          ipAddress,
          customerId,
        },
      });
      await tx.cartItem.deleteMany({ where: { cart: { userId: customerId } } });
      return createdOrder;
    });
  } catch (error) {
    if (error instanceof OrderRequestError) return res.status(error.status).json({ error: error.message });
    throw error;
  }

  const normalizedItems = order.orderItems as { name: string; qty: number; price: number }[];
  const subtotalAmount = Number(order.subtotal);
  const shippingAmount = Number(order.shippingCharge);
  const discountAmount = Number(order.discountAmount ?? 0);
  const totalAmount = Number(order.totalAmount);
  const customerEmail = String(shippingDetails.email ?? "").trim();
  const shipDetails = (parsed.data.shippingDetails as Record<string, unknown>) ?? {};
  sendNewOrderToOwner({
    orderId: order.id,
    customerName: String(shipDetails.name ?? shipDetails.fullname ?? ""),
    customerPhone: String(shipDetails.phone ?? "-"),
    customerEmail,
    items: normalizedItems.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
    subtotal: subtotalAmount,
    shippingCharge: shippingAmount,
    discountAmount,
    totalAmount,
    paymentMethod: parsed.data.paymentMethod,
  }).catch((err) => console.error("owner notification mail failed:", err.message));
  if (customerEmail) {
    sendOrderConfirmation({
      orderId: order.id,
      customerEmail,
      customerName: String(shipDetails.name ?? shipDetails.fullname ?? ""),
      items: normalizedItems.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
      subtotal: subtotalAmount,
      shippingCharge: shippingAmount,
      discountAmount,
      totalAmount,
      paymentMethod: parsed.data.paymentMethod,
    }).catch((err) => console.error("order confirmation mail failed:", err.message));
  }

  if (parsed.data.checkoutSessionId) {
    await prisma.abandonedCheckout.updateMany({ where: { sessionId: parsed.data.checkoutSessionId }, data: { convertedAt: new Date() } }).catch((err) => console.error("checkout conversion tracking failed:", err.message));
  }

  res.status(201).json(order);
});

// --- ADMIN API ENDPOINTS ---

app.get("/api/admin/dashboard", requireAuth, requireRole("ADMIN", "STAFF"), async (req, res) => {
  const days = Math.min(30, Math.max(7, Number(req.query.days) || 7));
  const now = new Date(); const today = new Date(now); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const from = new Date(today); from.setDate(from.getDate() - days + 1);
  const [productCount, lowStock, customers, pendingReviews, statusGroups, paymentGroups, allRevenue, todayStats, yesterdayStats, pendingStats, codOutstanding, recentOrders, oldPending, deliveredUnpaid, confirmedUnsent, trendRows] = await Promise.all([
    prisma.product.count(),
    prisma.product.findMany({ where: { manageStock: true, stock: { lte: 5 } }, select: { id: true, name: true, stock: true }, take: 20 }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.review.count({ where: { isApproved: false } }),
    prisma.order.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.order.groupBy({ by: ["paymentStatus"], where: { deletedAt: null, createdAt: { gte: from } }, _count: { _all: true }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({ where: { deletedAt: null }, _count: { _all: true }, _avg: { totalAmount: true } }),
    prisma.order.aggregate({ where: { deletedAt: null, createdAt: { gte: today } }, _count: { _all: true }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({ where: { deletedAt: null, createdAt: { gte: yesterday, lt: today } }, _count: { _all: true }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({ where: { deletedAt: null, status: "PENDING" }, _count: { _all: true }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({ where: { deletedAt: null, status: "DELIVERED", paymentMethod: "COD", paymentStatus: { not: "PAID" } }, _count: { _all: true }, _sum: { totalAmount: true } }),
    prisma.order.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, status: true, paymentStatus: true, totalAmount: true, createdAt: true, customerId: true, shippingDetails: true, orderItems: true, courierName: true, courierTrackingId: true } }),
    prisma.order.findMany({ where: { deletedAt: null, status: "PENDING", createdAt: { lt: new Date(Date.now() - 2 * 86400000) } }, orderBy: { createdAt: "asc" }, take: 20 }),
    prisma.order.findMany({ where: { deletedAt: null, status: "DELIVERED", paymentMethod: "COD", paymentStatus: { not: "PAID" } }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.order.findMany({ where: { deletedAt: null, status: "CONFIRMED", courierTrackingId: null }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.$queryRaw<Array<{ day: Date; gross: unknown; paid: unknown }>>`SELECT DATE(createdAt) AS day, SUM(totalAmount) AS gross, SUM(CASE WHEN paymentStatus = 'PAID' THEN totalAmount ELSE 0 END) AS paid FROM \`Order\` WHERE deletedAt IS NULL AND createdAt >= ${from} GROUP BY DATE(createdAt) ORDER BY day ASC`,
  ]);
  const visible = req.user?.role === "ADMIN" ? (orders: typeof recentOrders) => orders : (orders: typeof recentOrders) => orders.filter((order) => staffCanAccessOrderItems(req.user!, order.orderItems));
  const byPayment = Object.fromEntries(paymentGroups.map((g) => [g.paymentStatus, { count: g._count._all, amount: Number(g._sum.totalAmount ?? 0) }]));
  res.json({ products: productCount, customers, pendingReviews, recentOrders: visible(recentOrders), lowStock, statusCounts: Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all])), payment: byPayment,
    totalOrders: allRevenue._count._all, averageOrderValue: Number(allRevenue._avg.totalAmount ?? 0), today: { count: todayStats._count._all, gross: Number(todayStats._sum.totalAmount ?? 0) }, yesterday: { count: yesterdayStats._count._all, gross: Number(yesterdayStats._sum.totalAmount ?? 0) }, pending: { count: pendingStats._count._all, amount: Number(pendingStats._sum.totalAmount ?? 0) }, codOutstanding: { count: codOutstanding._count._all, amount: Number(codOutstanding._sum.totalAmount ?? 0) },
    alerts: { oldPending: visible(oldPending), deliveredUnpaid: visible(deliveredUnpaid), confirmedUnsent: visible(confirmedUnsent) }, salesTrend: trendRows.map((r) => ({ day: r.day, gross: Number(r.gross ?? 0), paid: Number(r.paid ?? 0) })) });
});

app.get("/api/admin/products", requireAuth, requireRole("ADMIN", "STAFF"), async (_req, res) => {
  res.json(
    await prisma.product.findMany({
      include: {
        category: { select: { name: true } },
        categoryLinks: { select: { categoryId: true } },
        imagesDetails: { orderBy: { sortOrder: "asc" } },
        attributes: { include: { values: true } },
        variations: { include: { attributes: true }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
    })
  );
});

app.patch("/api/admin/products/:id", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("products"), async (req, res) => {
  const id = String(req.params.id);
  const data = z
    .object({
      name: z.string().min(2).optional(),
      slug: z.string().min(1).optional(),
      categoryId: z.string().optional(),
      categoryIds: z.array(z.string().min(1)).min(1).optional(),
      price: z.number().nonnegative().optional(),
      salePrice: z.number().nonnegative().nullable().optional(),
      longDescription: z.string().nullable().optional(),
      stock: z.number().int().nonnegative().optional(),
      manageStock: z.boolean().optional(),
      isActive: z.boolean().optional(),
      showOnHome: z.boolean().optional(),
      productType: z.enum(["SIMPLE", "VARIABLE"]).optional(),
      sku: z.string().trim().max(100).nullable().optional(),
      defaultVariationId: z.string().nullable().optional(),
      images: z.array(z.string().url().or(z.string().regex(/^\//))).optional(),
      imageDetails: z.array(z.object({ url: z.string(), altText: z.string().nullable().optional(), title: z.string().nullable().optional(), sortOrder: z.number().int().nonnegative().optional(), isFeatured: z.boolean().optional() })).optional(),
      attributes: z.array(attributeSchema).optional(),
      variations: z.array(variationSchema).optional(),
      productAttributes: z.unknown().optional(),
      variants: z.unknown().optional(),
      variationImages: z.unknown().optional(),
    })
    .safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "Invalid product update", details: data.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) });

  let { imageDetails, images, variationImages, attributes, variations, defaultVariationId, categoryId, categoryIds, ...rest } = data.data;

  if (rest.sku === null) rest.sku = undefined;
  if (rest.slug) rest.slug = await uniqueProductSlug(rest.slug, id);
  const selectedCategoryIds = categoryIds?.length ? [...new Set(categoryIds)] : categoryId ? [categoryId] : undefined;
  if (categoryIds !== undefined && !selectedCategoryIds?.length) return res.status(400).json({ error: "Select at least one category" });
  const categoryUpdates = selectedCategoryIds ? {
    category: { connect: { id: selectedCategoryIds[0] } },
    categoryLinks: { deleteMany: {}, create: selectedCategoryIds.map((categoryId) => ({ category: { connect: { id: categoryId } } })) },
  } : {};

  if (variations !== undefined && attributes !== undefined) {
    await replaceProductVariations(id, attributes, variations, rest.sku || undefined);
  } else if (defaultVariationId !== undefined) {
    await prisma.product.update({ where: { id }, data: { defaultVariationId: defaultVariationId || null } });
  } else if (rest.productType === "SIMPLE") {
    const existingVariations = await prisma.productVariation.count({ where: { productId: id } });
    if (existingVariations) {
      await prisma.$transaction([
        prisma.productVariation.deleteMany({ where: { productId: id } }),
        prisma.productAttribute.deleteMany({ where: { productId: id } }),
        prisma.product.update({ where: { id }, data: { defaultVariationId: null } }),
      ]);
    }
  }

  if (imageDetails && imageDetails.length) {
    const sorted = [...imageDetails].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const hasFeatured = sorted.some((i) => i.isFeatured);
    const normalized = sorted.map((i, index) => ({ url: i.url, altText: i.altText ?? null, title: i.title ?? null, sortOrder: index, isFeatured: !hasFeatured ? index === 0 : Boolean(i.isFeatured) }));
    res.json(
      await prisma.$transaction([
        prisma.productImage.deleteMany({ where: { productId: id } }),
        prisma.product.update({
          where: { id },
          data: {
            ...(rest as object),
            ...categoryUpdates,
            images: normalized.filter((i) => i.isFeatured).concat(normalized.filter((i) => !i.isFeatured)).map((i) => i.url) as unknown as Prisma.InputJsonValue,
            ...(variationImages !== undefined ? { variationImages: variationImages as Prisma.InputJsonValue } : {}),
            imagesDetails: { create: normalized },
          },
        }),
      ])
    );
    return;
  }

  res.json(
    await prisma.product.update({
      where: { id },
      data: {
        ...(rest as object),
        ...categoryUpdates,
        ...(images ? { images: images as unknown as Prisma.InputJsonValue } : {}),
        ...(variationImages !== undefined ? { variationImages: variationImages as Prisma.InputJsonValue } : {}),
      },
    })
  );
});

app.delete("/api/admin/products/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  await prisma.product.delete({ where: { id: String(req.params.id) } });
  res.status(204).end();
});

app.get("/api/admin/categories", requireAuth, requireRole("ADMIN", "STAFF"), async (_req, res) => {
  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { products: true, productLinks: true } },
      subCategories: { orderBy: { name: "asc" }, include: { _count: { select: { products: true, productLinks: true } } } },
    },
    orderBy: { name: "asc" },
  });
  res.json(categories.map((category) => ({
    ...category,
    _count: { ...category._count, products: category._count.productLinks },
    subCategories: category.subCategories.map((sub) => ({ ...sub, _count: { ...sub._count, products: sub._count.productLinks } })),
  })));
});

app.get("/api/admin/orders", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("orders"), restrictStaffOrderView, async (_req, res) => {
  res.json(await prisma.order.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 100 }));
});

app.get("/api/admin/abandoned-checkouts", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("orders"), async (_req, res) => {
  const [count, items] = await Promise.all([
    prisma.abandonedCheckout.count({ where: { convertedAt: null } }),
    prisma.abandonedCheckout.findMany({ where: { convertedAt: null }, orderBy: { updatedAt: "desc" }, take: 100 }),
  ]);
  res.json({ count, items });
});

async function softDeleteOrders(ids: string[], actorId: string) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.order.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { id: true, status: true, paymentStatus: true, totalAmount: true, courierName: true, courierTrackingId: true } });
    if (!rows.length) return 0;
    const deletedAt = new Date();
    await tx.order.updateMany({ where: { id: { in: rows.map((row) => row.id) }, deletedAt: null }, data: { deletedAt } });
    await tx.orderDeletionAudit.createMany({ data: rows.map((row) => ({ id: randomUUID(), orderId: row.id, actorId, action: "SOFT_DELETED", snapshot: { status: row.status, paymentStatus: row.paymentStatus, totalAmount: Number(row.totalAmount), courierName: row.courierName, courierTrackingId: row.courierTrackingId } as Prisma.InputJsonValue, createdAt: deletedAt })) });
    return rows.length;
  });
}

app.get("/api/admin/order-deletion-audit", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  res.json(await prisma.orderDeletionAudit.findMany({ orderBy: { createdAt: "desc" }, take: 200 }));
});

app.get("/api/admin/orders/archived", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  res.json(await prisma.order.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" }, take: 100, select: { id: true, status: true, paymentStatus: true, totalAmount: true, deletedAt: true, courierName: true, courierTrackingId: true } }));
});

app.post("/api/admin/orders/:id/restore", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const id = String(req.params.id);
  const restoredAt = new Date();
  const restored = await prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({ where: { id, deletedAt: { not: null } }, data: { deletedAt: null } });
    if (!result.count) return false;
    await tx.orderDeletionAudit.create({ data: { id: randomUUID(), orderId: id, actorId: req.user!.id, action: "RESTORED", createdAt: restoredAt } });
    return true;
  });
  if (!restored) return res.status(404).json({ error: "Archived order not found" });
  res.json({ restored: true });
});

app.delete("/api/admin/orders/bulk", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const parsed = z.object({ ids: z.array(z.string().min(1)).min(1).max(500) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Select between 1 and 500 orders" });
  const deleted = await softDeleteOrders(parsed.data.ids, req.user!.id);
  res.json({ deleted });
});

app.delete("/api/admin/orders/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const deleted = await softDeleteOrders([String(req.params.id)], req.user!.id);
  if (!deleted) return res.status(404).json({ error: "Order not found" });
  res.json({ deleted });
});

app.patch("/api/admin/orders/:id", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("orders"), async (req, res) => {
  const data = z
    .object({
      status: z.enum(["PENDING", "CONFIRMED", "IN_COURIER", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
      paymentStatus: z.enum(["UNPAID", "PAID", "FAILED", "REFUNDED"]).optional(),
      courierName: z.string().max(100).nullable().optional(),
      courierTrackingId: z.string().max(200).nullable().optional(),
    })
    .safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "Invalid order update" });
  const prior = await prisma.order.findFirst({ where: { id: String(req.params.id), deletedAt: null }, select: { status: true, shippingDetails: true, orderItems: true, stockAdjusted: true } });
  if (!prior) return res.status(404).json({ error: "Order not found" });
  if (req.user && !staffCanAccessOrderItems(req.user, prior.orderItems)) return res.status(403).json({ error: "Not authorized for this order" });
  const updated = await prisma.$transaction(async (tx) => {
    if (data.data.status === "CANCELLED" && prior.status !== "CANCELLED" && prior.stockAdjusted) {
      for (const item of prior.orderItems as Array<{ productId?: string; variationId?: string; qty?: number }>) {
        if (!item.productId || !item.qty) continue;
        if (item.variationId) await tx.productVariation.updateMany({ where: { id: item.variationId, manageStock: true }, data: { stock: { increment: item.qty } } });
        else await tx.product.updateMany({ where: { id: item.productId, manageStock: true }, data: { stock: { increment: item.qty } } });
      }
    }
    return tx.order.update({ where: { id: String(req.params.id), deletedAt: null }, data: { ...data.data, ...(data.data.status === "CANCELLED" ? { stockAdjusted: false } : {}) } });
  });
  if (data.data.status && prior && prior.status !== data.data.status) {
    const details = (prior.shippingDetails as Record<string, unknown>) ?? {};
    const email = String(details.email ?? "").trim();
    if (email) {
      sendOrderStatusEmail({
        orderId: updated.id,
        customerEmail: email,
        customerName: String(details.name ?? details.fullname ?? ""),
        status: data.data.status,
      }).catch((err) => console.error("order status mail failed:", err.message));
    }
  }
  res.json(updated);
});

app.post("/api/admin/orders/:id/send-steadfast", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("orders"), async (req, res) => {
  const order = await prisma.order.findFirst({ where: { id: String(req.params.id), deletedAt: null } });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (req.user && !staffCanAccessOrderItems(req.user, order.orderItems)) return res.status(403).json({ error: "Not authorized for this order" });
  if (order.courierName && order.courierName !== "Steadfast") return res.status(400).json({ error: `Order already sent via ${order.courierName}` });

  const settings = await prisma.storeConfig.findUnique({ where: { id: "store-config-singleton" }, select: { courierConfig: true } });
  if (!settings || !settings.courierConfig) return res.status(400).json({ error: "Steadfast is not configured" });
  const courier = (settings.courierConfig as { encrypted?: string })?.encrypted
    ? (decrypt<{ steadfast?: { enabled?: boolean; apiKey?: string; secretKey?: string } }>(String((settings.courierConfig as { encrypted?: string }).encrypted)) ?? {})
    : {};
  const sf = courier.steadfast;
  if (!sf?.enabled) return res.status(400).json({ error: "Steadfast is not enabled" });
  if (!sf.apiKey || !sf.secretKey) return res.status(400).json({ error: "Steadfast API credentials missing" });

  const shipping = (order.shippingDetails ?? {}) as { name?: string; phone?: string; address?: string };
  const name = (shipping.name ?? "").trim();
  const phone = (shipping.phone ?? "").trim().replace(/[^0-9]/g, "");
  const address = (shipping.address ?? "").trim();
  if (!name) return res.status(400).json({ error: "Recipient name is missing on this order" });
  if (!/^01[0-9]{9}$/.test(phone)) return res.status(400).json({ error: `Invalid recipient phone: ${phone || "missing"}` });
  if (address.length < 5) return res.status(400).json({ error: "Recipient address is too short" });

  const codAmount = order.paymentStatus === "UNPAID" ? Number(order.totalAmount) : 0;

  let response: Response;
  try {
    response = await fetch("https://portal.packzy.com/api/v1/create_order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": sf.apiKey,
        "Secret-Key": sf.secretKey,
      },
      body: JSON.stringify({
        invoice: order.id,
        recipient_name: name,
        recipient_phone: phone,
        recipient_address: address.slice(0, 250),
        cod_amount: codAmount,
        note: "Placed from web store",
      }),
    });
  } catch {
    return res.status(502).json({ error: "Could not reach Steadfast API" });
  }
  const body = (await response.json().catch(() => ({}))) as {
    status?: number;
    message?: string;
    consignment?: { consignment_id?: number; tracking_code?: string; invoice?: string };
  };
  if (!response.ok || body.status !== 200 || !body.consignment) {
    return res.status(502).json({ error: body.message || `Steadfast error (${response.status})` });
  }

  const tracking = String(body.consignment.tracking_code ?? body.consignment.consignment_id ?? "");
  const sd = (order.shippingDetails ?? {}) as Record<string, unknown>;
  const updated = await prisma.order.update({
    where: { id: order.id, deletedAt: null },
    data: {
      status: "IN_COURIER",
      courierName: "Steadfast",
      courierTrackingId: tracking,
      shippingDetails: { ...sd, sfConsignmentId: body.consignment.consignment_id != null ? String(body.consignment.consignment_id) : undefined, sfTrackingCode: tracking || undefined } as Prisma.InputJsonValue,
    },
  });
  res.json({ ok: true, consignment: body.consignment, order: updated });
});

function getSteadfastClient() {
  return prisma.storeConfig.findUnique({ where: { id: "store-config-singleton" }, select: { courierConfig: true } });
}
function decodeSteadfast(settings: { courierConfig: unknown } | null) {
  if (!settings?.courierConfig) return null;
  const courier = (settings.courierConfig as { encrypted?: string })?.encrypted
    ? (decrypt<{ steadfast?: { enabled?: boolean; apiKey?: string; secretKey?: string } }>(String((settings.courierConfig as { encrypted?: string }).encrypted)) ?? {})
    : {};
  const sf = courier.steadfast;
  if (!sf?.enabled || !sf.apiKey || !sf.secretKey) return null;
  return sf as { apiKey: string; secretKey: string };
}

app.post("/api/admin/orders/:id/sync-steadfast", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("orders"), async (req, res) => {
  const order = await prisma.order.findFirst({ where: { id: String(req.params.id), deletedAt: null } });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if ((order.courierName ?? "").trim().toLowerCase() !== "steadfast" || !order.courierTrackingId)
    return res.status(400).json({ error: "Order is not sent via Steadfast" });

  const sf = await getSteadfastClient().then(decodeSteadfast);
  if (!sf) return res.status(400).json({ error: "Steadfast API credentials missing" });

  let response: Response;
  try {
    response = await fetch(`https://portal.packzy.com/api/v1/status_by_trackingcode/${encodeURIComponent(order.courierTrackingId)}`, {
      headers: { "Content-Type": "application/json", "Api-Key": sf.apiKey, "Secret-Key": sf.secretKey },
    });
  } catch {
    return res.status(502).json({ error: "Could not reach Steadfast API" });
  }
  const body = (await response.json().catch(() => ({}))) as { status?: number; delivery_status?: string; message?: string };
  if (!response.ok || body.status !== 200 || !body.delivery_status) {
    return res.status(502).json({ error: body.message || `Steadfast error (${response.status})` });
  }

  const sd = (order.shippingDetails ?? {}) as Record<string, unknown>;
  const updated = await prisma.order.update({
    where: { id: order.id, deletedAt: null },
    data: { shippingDetails: { ...sd, sfStatus: body.delivery_status, sfTrackingCode: sd.sfTrackingCode ?? order.courierTrackingId, sfSyncedAt: new Date().toISOString() } as Prisma.InputJsonValue },
  });
  res.json({ ok: true, delivery_status: body.delivery_status, sfSyncedAt: (updated.shippingDetails as Record<string, unknown>)?.sfSyncedAt });
});

app.post("/api/admin/orders/sync-all-steadfast", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("orders"), async (_req, res) => {
  const sf = await getSteadfastClient().then(decodeSteadfast);
  if (!sf) return res.status(400).json({ error: "Steadfast API credentials missing" });

  const parcels = (await prisma.order.findMany({ where: { deletedAt: null, courierTrackingId: { not: null } } })).filter(
    (o) => (o.courierName ?? "").trim().toLowerCase() === "steadfast"
  );
  if (!parcels.length) return res.json({ ok: true, synced: 0, failed: 0, statuses: {} });

  const statuses: Record<string, string> = {};
  let failed = 0;
  for (const order of parcels) {
    try {
      const response = await fetch(`https://portal.packzy.com/api/v1/status_by_trackingcode/${encodeURIComponent(order.courierTrackingId!)}`, {
        headers: { "Content-Type": "application/json", "Api-Key": sf.apiKey, "Secret-Key": sf.secretKey },
      });
      const body = (await response.json().catch(() => ({}))) as { status?: number; delivery_status?: string };
      if (response.ok && body.status === 200 && body.delivery_status) {
        const sd = (order.shippingDetails ?? {}) as Record<string, unknown>;
        await prisma.order.update({
          where: { id: order.id, deletedAt: null },
          data: { shippingDetails: { ...sd, sfStatus: body.delivery_status, sfTrackingCode: sd.sfTrackingCode ?? order.courierTrackingId, sfSyncedAt: new Date().toISOString() } as Prisma.InputJsonValue },
        });
        statuses[order.id] = body.delivery_status;
      } else failed++;
    } catch {
      failed++;
    }
  }
  res.json({ ok: true, synced: parcels.length - failed, failed, statuses });
});

app.get("/api/admin/steadfast/balance", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("orders"), async (_req, res) => {
  const sf = await getSteadfastClient().then(decodeSteadfast);
  if (!sf) return res.status(400).json({ error: "Steadfast API credentials missing" });

  let response: Response;
  try {
    response = await fetch("https://portal.packzy.com/api/v1/get_balance", {
      headers: { "Content-Type": "application/json", "Api-Key": sf.apiKey, "Secret-Key": sf.secretKey },
    });
  } catch {
    return res.status(502).json({ error: "Could not reach Steadfast API" });
  }
  const body = (await response.json().catch(() => ({}))) as { status?: number; current_balance?: number; message?: string };
  if (!response.ok || body.status !== 200 || typeof body.current_balance !== "number") {
    return res.status(502).json({ error: body.message || `Steadfast error (${response.status})` });
  }
  res.json({ ok: true, balance: body.current_balance, fetchedAt: new Date().toISOString() });
});

app.post("/api/admin/categories", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const data = z
    .object({
      name: z.string().trim().min(2),
      slug: z.string().min(1),
      parentId: z.string().optional(),
      image: z.string().max(500).nullable().optional(),
      attributeSchema: z.unknown().optional(),
    })
    .safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "Invalid category" });
  res.status(201).json(await prisma.category.create({ data: { ...data.data, attributeSchema: data.data.attributeSchema as Prisma.InputJsonValue } }));
});

app.patch("/api/admin/categories/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const data = z
    .object({
      name: z.string().trim().min(2).optional(),
      slug: z.string().min(1).optional(),
      parentId: z.string().nullable().optional(),
      image: z.string().max(500).nullable().optional(),
    })
    .safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "Invalid category update" });
  res.json(await prisma.category.update({ where: { id: String(req.params.id) }, data: data.data }));
});

app.delete("/api/admin/categories/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const id = String(req.params.id);
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  const moveTo = typeof body.moveToCategoryId === "string" && body.moveToCategoryId.trim() ? body.moveToCategoryId.trim() : null;
  if (moveTo && moveTo === id) return res.status(400).json({ error: "Cannot move products to the same category" });
  const category = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!category) return res.status(404).json({ error: "Category not found" });
  const descendants = [id];
  for (let index = 0; index < descendants.length; index++) {
    const children = await prisma.category.findMany({ where: { parentId: descendants[index] }, select: { id: true } });
    descendants.push(...children.map((child) => child.id));
  }
  const linkedProducts = await prisma.productCategory.findMany({ where: { categoryId: { in: descendants } }, select: { productId: true } });
  const productIds = [...new Set(linkedProducts.map((link) => link.productId))];
  const products = productIds.length;
  if (products > 0 && !moveTo) return res.status(400).json({ error: "Choose a destination category for products before deleting" });
  if (moveTo) {
    if (descendants.includes(moveTo)) return res.status(400).json({ error: "Destination cannot be this category or one of its sub-categories" });
    const target = await prisma.category.findUnique({ where: { id: moveTo }, select: { id: true } });
    if (!target) return res.status(400).json({ error: "Destination category not found" });
  }
  await prisma.$transaction(async (tx) => {
    if (moveTo) {
      await tx.product.updateMany({ where: { categoryId: { in: descendants } }, data: { categoryId: moveTo } });
      await tx.productCategory.deleteMany({ where: { categoryId: { in: descendants } } });
      if (productIds.length) await tx.productCategory.createMany({ data: productIds.map((productId) => ({ productId, categoryId: moveTo })), skipDuplicates: true });
    }
    await tx.category.delete({ where: { id } });
  });
  res.status(204).end();
});

app.post("/api/admin/products", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("products"), async (req, res) => {
  const data = z
    .object({
      categoryId: z.string().optional(),
      categoryIds: z.array(z.string().min(1)).min(1).optional(),
      name: z.string().min(2),
      slug: z.string().min(1).optional(),
      description: z.string().min(10),
      longDescription: z.string().optional(),
      price: z.number().nonnegative(),
      salePrice: z.number().nonnegative().optional(),
      stock: z.number().int().nonnegative().optional(),
      manageStock: z.boolean().optional(),
      sku: z.string().trim().max(100).optional(),
      productType: z.enum(["SIMPLE", "VARIABLE"]).optional(),
      images: z.array(z.string().url().or(z.string().regex(/^\//))).min(1),
      imageDetails: z.array(z.object({ url: z.string(), altText: z.string().nullable().optional(), title: z.string().nullable().optional(), sortOrder: z.number().int().nonnegative().optional(), isFeatured: z.boolean().optional() })).optional(),
      attributes: z.array(attributeSchema).optional(),
      variations: z.array(variationSchema).optional(),
      productAttributes: z.unknown().optional(),
      variants: z.unknown().optional(),
      variationImages: z.unknown().optional(),
      isPerishable: z.boolean().optional(),
      showOnHome: z.boolean().optional(),
      expiryDate: z.string().datetime().optional(),
    })
    .safeParse(req.body);
  if (!data.success) {
    return res.status(400).json({ error: "Invalid product", details: data.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) });
  }
  const { expiryDate, variationImages, imageDetails, attributes, variations, categoryId, categoryIds, ...product } = data.data;
  const selectedCategoryIds = [...new Set(categoryIds?.length ? categoryIds : categoryId ? [categoryId] : [])];
  if (!selectedCategoryIds.length) return res.status(400).json({ error: "Select at least one category" });
  const productSlug = await uniqueProductSlug(product.slug || product.name);
  try {
    const imagesArr = product.images as string[];
    const sorted = imageDetails && imageDetails.length
      ? [...imageDetails].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      : imagesArr.map((url, index) => ({ url, altText: null as string | null, title: null as string | null, sortOrder: index, isFeatured: index === 0 }));
    const hasFeatured = sorted.some((i) => i.isFeatured);
    const normalizedDetails = sorted.length
      ? sorted.map((i, index) => ({ url: i.url, altText: i.altText, title: i.title, sortOrder: index, isFeatured: !hasFeatured ? index === 0 : Boolean(i.isFeatured) }))
      : imagesArr.map((url, index) => ({ url, altText: null as string | null, title: null as string | null, sortOrder: index, isFeatured: index === 0 }));
    const created = await prisma.product.create({
      data: {
        ...product,
        slug: productSlug,
        category: { connect: { id: selectedCategoryIds[0] } },
        categoryLinks: { create: selectedCategoryIds.map((id) => ({ category: { connect: { id } } })) },
        images: normalizedDetails.filter((i) => i.isFeatured).concat(normalizedDetails.filter((i) => !i.isFeatured)).map((i) => i.url) as unknown as Prisma.InputJsonValue,
        productAttributes: (product as { productAttributes?: unknown }).productAttributes as Prisma.InputJsonValue,
        variants: (product as { variants?: unknown }).variants as Prisma.InputJsonValue,
        variationImages: variationImages as Prisma.InputJsonValue,
        imagesDetails: { create: normalizedDetails },
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      },
    });
    if (attributes && variations) {
      await replaceProductVariations(created.id, attributes, variations, product.sku || undefined);
    }
    const result = await prisma.product.findUnique({
      where: { id: created.id },
      include: { category: { select: { name: true } }, imagesDetails: { orderBy: { sortOrder: "asc" } }, attributes: { include: { values: true } }, variations: { include: { attributes: true } } },
    });
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ error: "A product with this slug already exists - change the product name or slug" });
    }
    throw error;
  }
});

app.post("/api/admin/upload", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("products"), upload.single("image"), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No image file provided" });
  try {
    const url = await uploadImage(file, req.body.kind === "hero");
    await prisma.mediaAsset.upsert({ where: { url }, create: { url }, update: {} });
    res.status(201).json({ url });
  } catch (error) {
    console.error("Upload failed:", error);
    res.status(502).json({ error: error instanceof Error ? error.message : "Failed to upload image" });
  }
});

// Media library: files and metadata managed independently from product forms.
app.get("/api/admin/media", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("products"), async (_req, res) => {
  const files = await listImages();
  await prisma.mediaAsset.createMany({ data: files.map((file) => ({ url: file.url })), skipDuplicates: true });
  const [assets, productImages] = await Promise.all([
    prisma.mediaAsset.findMany({ where: { url: { in: files.map((file) => file.url) } } }),
    prisma.productImage.findMany({ where: { url: { in: files.map((file) => file.url) } }, select: { url: true, altText: true, title: true } }),
  ]);
  const metadata = new Map(assets.map((asset) => [asset.url, asset]));
  for (const image of productImages) {
    const asset = metadata.get(image.url);
    if (!asset) continue;
    asset.altText ??= image.altText;
    asset.title ??= image.title;
  }
  res.json(files.map((file) => ({ ...file, ...(metadata.get(file.url) ?? {}) })));
});

app.post("/api/admin/media", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("products"), upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image file provided" });
  const url = await uploadImage(req.file);
  const asset = await prisma.mediaAsset.upsert({ where: { url }, create: { url }, update: {} });
  res.status(201).json(asset);
});

app.patch("/api/admin/media/:id", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("products"), async (req, res) => {
  const parsed = z.object({ altText: z.string().max(500).nullable().optional(), title: z.string().max(500).nullable().optional(), description: z.string().max(10000).nullable().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid media details" });
  const asset = await prisma.mediaAsset.findUnique({ where: { id: String(req.params.id) } });
  if (!asset) return res.status(404).json({ error: "Image not found" });
  const updated = await prisma.mediaAsset.update({ where: { id: asset.id }, data: parsed.data });
  await prisma.productImage.updateMany({ where: { url: asset.url }, data: { altText: parsed.data.altText, title: parsed.data.title } });
  res.json(updated);
});

function removeMediaUrl(value: unknown, url: string): unknown {
  if (value === url) return undefined;
  if (Array.isArray(value)) return value.filter((item) => item !== url).map((item) => removeMediaUrl(item, url));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => item === url ? [] : [[key, removeMediaUrl(item, url)]]));
  return value;
}

app.delete("/api/admin/media/:id", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("products"), async (req, res) => {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: String(req.params.id) } });
  if (!asset) return res.status(404).json({ error: "Image not found" });
  await deleteImage(asset.url);
  const [products, variations, attributes, configs] = await Promise.all([
    prisma.product.findMany({ select: { id: true, images: true, productAttributes: true, variants: true, variationImages: true } }),
    prisma.productVariation.findMany({ select: { id: true, image: true, gallery: true } }),
    prisma.attributeValue.findMany({ select: { id: true, image: true } }),
    prisma.storeConfig.findMany({ select: { id: true, logoUrl: true, marketingPixels: true, chatConfig: true, themeSettings: true, homePageConfig: true, heroBannerConfig: true, navigationConfig: true } }),
  ]);
  await prisma.$transaction(async (tx) => {
    await tx.productImage.deleteMany({ where: { url: asset.url } });
    for (const product of products) {
      const images = (Array.isArray(product.images) ? product.images : []).filter((image) => image !== asset.url);
      const productAttributes = removeMediaUrl(product.productAttributes, asset.url) as Prisma.InputJsonValue | undefined;
      const variants = removeMediaUrl(product.variants, asset.url) as Prisma.InputJsonValue | undefined;
      const variationImages = removeMediaUrl(product.variationImages, asset.url) as Prisma.InputJsonValue | undefined;
      const changed = images.length !== (Array.isArray(product.images) ? product.images.length : 0)
        || JSON.stringify(productAttributes) !== JSON.stringify(product.productAttributes)
        || JSON.stringify(variants) !== JSON.stringify(product.variants)
        || JSON.stringify(variationImages) !== JSON.stringify(product.variationImages);
      if (changed) await tx.product.update({ where: { id: product.id }, data: {
        ...(images.length !== (Array.isArray(product.images) ? product.images.length : 0) ? { images: images as Prisma.InputJsonValue } : {}),
        ...(productAttributes !== undefined ? { productAttributes } : {}),
        ...(variants !== undefined ? { variants } : {}),
        ...(variationImages !== undefined ? { variationImages } : {}),
      } });
    }
    await tx.category.updateMany({ where: { image: asset.url }, data: { image: null } });
    for (const variation of variations) {
      const gallery = removeMediaUrl(variation.gallery, asset.url) as Prisma.InputJsonValue | undefined;
      if (variation.image === asset.url || JSON.stringify(gallery) !== JSON.stringify(variation.gallery)) {
        await tx.productVariation.update({ where: { id: variation.id }, data: { ...(variation.image === asset.url ? { image: null } : {}), ...(gallery !== undefined ? { gallery } : {}) } });
      }
    }
    await tx.attributeValue.updateMany({ where: { image: asset.url }, data: { image: null } });
    for (const config of configs) {
      const update = {
        ...(config.logoUrl === asset.url ? { logoUrl: null } : {}),
        ...(config.marketingPixels ? { marketingPixels: removeMediaUrl(config.marketingPixels, asset.url) as Prisma.InputJsonValue } : {}),
        ...(config.chatConfig ? { chatConfig: removeMediaUrl(config.chatConfig, asset.url) as Prisma.InputJsonValue } : {}),
        ...(config.themeSettings ? { themeSettings: removeMediaUrl(config.themeSettings, asset.url) as Prisma.InputJsonValue } : {}),
        ...(config.homePageConfig ? { homePageConfig: removeMediaUrl(config.homePageConfig, asset.url) as Prisma.InputJsonValue } : {}),
        ...(config.heroBannerConfig ? { heroBannerConfig: removeMediaUrl(config.heroBannerConfig, asset.url) as Prisma.InputJsonValue } : {}),
        ...(config.navigationConfig ? { navigationConfig: removeMediaUrl(config.navigationConfig, asset.url) as Prisma.InputJsonValue } : {}),
      };
      if (Object.keys(update).length) await tx.storeConfig.update({ where: { id: config.id }, data: update });
    }
    await tx.mediaAsset.delete({ where: { id: asset.id } });
  });
  res.status(204).end();
});

// Product image management (gallery CRUD)
// GET  /api/admin/products/:id/images
// POST /api/admin/products/:id/images        { urls: string[] }  (attach existing uploaded images)
// PATCH /api/admin/products/images/:imgId    { altText?, title?, isFeatured?, sortOrder? }
// POST /api/admin/products/images/:imgId/toggle-featured
// DELETE /api/admin/products/:id/images/:imgId

async function syncProductImages(productId: string) {
  const rows = await prisma.productImage.findMany({ where: { productId }, orderBy: { sortOrder: "asc" } });
  const featuredFirst = rows.filter((r) => r.isFeatured).concat(rows.filter((r) => !r.isFeatured));
  await prisma.product.update({
    where: { id: productId },
    data: { images: featuredFirst.map((r) => r.url) as unknown as Prisma.InputJsonValue },
  });
  return rows;
}

app.get("/api/admin/products/:id/images", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("products"), async (req, res) => {
  const images = await prisma.productImage.findMany({
    where: { productId: String(req.params.id) },
    orderBy: { sortOrder: "asc" },
  });
  res.json(images);
});

app.post("/api/admin/products/:id/images", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("products"), async (req, res) => {
  const data = z.object({ urls: z.array(z.string().url().or(z.string().regex(/^\//))).min(1) }).safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "Invalid image payload" });
  const productId = String(req.params.id);
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return res.status(404).json({ error: "Product not found" });
  const nextOrder = await prisma.productImage.count({ where: { productId } });
  await prisma.productImage.createMany({
    data: data.data.urls.map((url, index) => ({
      productId,
      url,
      sortOrder: nextOrder + index,
      isFeatured: nextOrder + index === 0,
    })),
  });
  const rows = await syncProductImages(productId);
  res.status(201).json(rows);
});

app.patch("/api/admin/products/images/:imgId", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("products"), async (req, res) => {
  const data = z
    .object({
      altText: z.string().nullable().optional(),
      title: z.string().nullable().optional(),
      isFeatured: z.boolean().optional(),
      sortOrder: z.number().int().nonnegative().optional(),
    })
    .safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "Invalid image update" });
  const img = await prisma.productImage.update({ where: { id: String(req.params.imgId) }, data: data.data });
  if (data.data.isFeatured === true) {
    await prisma.productImage.updateMany({ where: { productId: img.productId, id: { not: img.id } }, data: { isFeatured: false } });
  }
  await syncProductImages(img.productId);
  res.json(await prisma.productImage.findMany({ where: { productId: img.productId }, orderBy: { sortOrder: "asc" } }));
});

app.post("/api/admin/products/images/:imgId/toggle-featured", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("products"), async (req, res) => {
  const img = await prisma.productImage.findUnique({ where: { id: String(req.params.imgId) } });
  if (!img) return res.status(404).json({ error: "Image not found" });
  await prisma.productImage.updateMany({ where: { productId: img.productId }, data: { isFeatured: false } });
  await prisma.productImage.update({ where: { id: img.id }, data: { isFeatured: true } });
  await syncProductImages(img.productId);
  res.json(await prisma.productImage.findMany({ where: { productId: img.productId }, orderBy: { sortOrder: "asc" } }));
});

app.delete("/api/admin/products/:id/images/:imgId", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("products"), async (req, res) => {
  const img = await prisma.productImage.findUnique({ where: { id: String(req.params.imgId) } });
  if (!img || img.productId !== String(req.params.id)) return res.status(404).json({ error: "Image not found" });
  await prisma.productImage.delete({ where: { id: img.id } });
  const remaining = await syncProductImages(img.productId);
  if (remaining.length > 0) {
    const hasFeatured = remaining.some((r) => r.isFeatured);
    if (!hasFeatured) {
      await prisma.productImage.update({ where: { id: remaining[0].id }, data: { isFeatured: true } });
      await syncProductImages(img.productId);
    }
  }
  res.status(204).end();
});

// Product Variations Management
const variationInclude = { attributes: { include: { attribute: { select: { id: true, name: true } }, value: true } } } as const;

app.post("/api/admin/products/:id/generate-variations", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("products"), async (req, res) => {
  const id = String(req.params.id);
  const data = z
    .object({
      attributes: z.array(z.object({ id: z.string().min(1), name: z.string().min(1), values: z.array(z.object({ id: z.string().min(1), value: z.string().min(1) })).min(1) })).min(1),
      basePrice: z.number().nonnegative().optional(),
      baseStock: z.number().int().nonnegative().optional(),
      skuPrefix: z.string().trim().optional(),
    })
    .safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "Invalid generate request", details: data.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) });
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return res.status(404).json({ error: "Product not found" });

  const attrDetails = await prisma.productAttribute.findMany({ where: { productId: id }, include: { values: true } });
  const attrTempMap = new Map<string, string>();
  data.data.attributes.forEach((a) => {
    const real = attrDetails.find((ad) => ad.name.toLowerCase() === a.name.trim().toLowerCase());
    attrTempMap.set(a.id, real?.id ?? "");
    a.values.forEach((v) => {
      const realVal = real?.values.find((rv) => rv.value.toLowerCase() === v.value.trim().toLowerCase());
      if (realVal) v.id = realVal.id;
    });
  });

  const { created } = await generateVariationsForProduct(
    id,
    data.data.attributes.map((a) => ({ id: attrTempMap.get(a.id) || a.id, name: a.name, values: a.values })),
    { basePrice: data.data.basePrice ?? Number(product.price), baseStock: data.data.baseStock ?? 0, skuPrefix: data.data.skuPrefix || product.sku || undefined }
  );

  res.status(201).json({ created, variations: await prisma.productVariation.findMany({ where: { productId: id }, include: variationInclude, orderBy: { createdAt: "asc" } }) });
});

app.patch("/api/admin/products/variations/:vid", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("products"), async (req, res) => {
  const vid = String(req.params.vid);
  const data = z
    .object({
      name: z.string().trim().min(1).optional(),
      sku: z.string().trim().max(100).nullable().optional(),
      price: z.number().nonnegative().optional(),
      salePrice: z.number().nonnegative().nullable().optional(),
      stock: z.number().int().nonnegative().optional(),
      manageStock: z.boolean().optional(),
      weight: z.number().nonnegative().nullable().optional(),
      image: z.string().nullable().optional(),
      gallery: z.array(z.string()).optional(),
      description: z.string().nullable().optional(),
      status: z.enum(["active", "disabled"]).optional(),
      isDefault: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "Invalid variation update" });

  let skuFinal: string | null | undefined;
  if (data.data.sku !== undefined) {
    const trim = data.data.sku?.trim();
    if (trim) {
      const existing = await prisma.productVariation.findFirst({ where: { sku: trim.toUpperCase(), id: { not: vid } }, select: { id: true } });
      if (existing) return res.status(409).json({ error: "SKU already in use by another variation" });
      skuFinal = trim.toUpperCase();
    } else {
      skuFinal = null;
    }
  }

  const { isDefault, ...rest } = data.data;
  const variation = await prisma.productVariation.update({ where: { id: vid }, data: { ...rest, ...(skuFinal !== undefined ? { sku: skuFinal } : {}), gallery: rest.gallery ? (rest.gallery as Prisma.InputJsonValue) : undefined } });

  if (isDefault === true) {
    await prisma.product.update({ where: { id: variation.productId }, data: { defaultVariationId: variation.id } });
  } else if (isDefault === false && variation.productId) {
    const prod = await prisma.product.findUnique({ where: { id: variation.productId }, select: { defaultVariationId: true } });
    if (prod?.defaultVariationId === variation.id) {
      await prisma.product.update({ where: { id: variation.productId }, data: { defaultVariationId: null } });
    }
  }

  res.json(await prisma.productVariation.findUnique({ where: { id: vid }, include: variationInclude }));
});

app.post("/api/admin/products/variations/:vid/duplicate", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("products"), async (req, res) => {
  const vid = String(req.params.vid);
  const source = await prisma.productVariation.findUnique({ where: { id: vid }, include: { attributes: true } });
  if (!source) return res.status(404).json({ error: "Variation not found" });
  const sku = await makeUniqueSku(source.sku ? `${source.sku}-COPY` : "VAR");
  const created = await prisma.productVariation.create({
    data: {
      productId: source.productId,
      name: `${source.name} (Copy)`,
      sku,
      price: source.price,
      salePrice: source.salePrice,
      stock: source.stock,
      manageStock: source.manageStock,
      weight: source.weight,
      image: source.image,
      gallery: source.gallery as Prisma.InputJsonValue | undefined,
      description: source.description,
      status: source.status,
      attributes: { create: source.attributes.map((a) => ({ attributeId: a.attributeId, valueId: a.valueId })) },
    },
  });
  res.status(201).json(created);
});

app.delete("/api/admin/products/variations/:vid", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("products"), async (req, res) => {
  const variation = await prisma.productVariation.findUnique({ where: { id: String(req.params.vid) }, select: { id: true, productId: true } });
  if (!variation) return res.status(404).json({ error: "Variation not found" });
  await prisma.productVariation.delete({ where: { id: variation.id } });
  const prod = await prisma.product.findUnique({ where: { id: variation.productId }, select: { defaultVariationId: true } });
  if (prod?.defaultVariationId === variation.id) {
    const first = await prisma.productVariation.findFirst({ where: { productId: variation.productId }, orderBy: { createdAt: "asc" } });
    await prisma.product.update({ where: { id: variation.productId }, data: { defaultVariationId: first?.id ?? null } });
  }
  res.status(204).end();
});

app.post("/api/admin/products/:id/variations/bulk", requireAuth, requireRole("ADMIN", "STAFF"), requireStaffArea("products"), async (req, res) => {
  const productId = String(req.params.id);
  const data = z
    .object({
      ids: z.array(z.string()).min(1),
      action: z.enum(["setPrice", "setSalePrice", "setStock", "setStatus", "enable", "disable", "delete"]),
      value: z.number().nonnegative().optional().or(z.enum(["active", "disabled"])).or(z.unknown()),
    })
    .safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "Invalid bulk action" });

  const { ids, action, value } = data.data;

  if (action === "delete") {
    await prisma.productVariation.deleteMany({ where: { id: { in: ids }, productId } });
  } else if (action === "setPrice") {
    await prisma.productVariation.updateMany({ where: { id: { in: ids }, productId }, data: { price: value as number } });
  } else if (action === "setSalePrice") {
    await prisma.productVariation.updateMany({ where: { id: { in: ids }, productId }, data: { salePrice: value === 0 ? null : (value as number) } });
  } else if (action === "setStock") {
    await prisma.productVariation.updateMany({ where: { id: { in: ids }, productId }, data: { stock: value as number } });
  } else if (action === "setStatus") {
    await prisma.productVariation.updateMany({ where: { id: { in: ids }, productId }, data: { status: value === "disabled" ? "disabled" : "active" } });
  } else if (action === "enable") {
    await prisma.productVariation.updateMany({ where: { id: { in: ids }, productId }, data: { status: "active" } });
  } else if (action === "disable") {
    await prisma.productVariation.updateMany({ where: { id: { in: ids }, productId }, data: { status: "disabled" } });
  }

  res.json(await prisma.productVariation.findMany({ where: { productId }, include: variationInclude, orderBy: { createdAt: "asc" } }));
});

// Admin Coupons Management APIs
app.get("/api/admin/coupons", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  res.json(await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }));
});

app.post("/api/admin/coupons", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const data = z
    .object({
      code: z.string().trim().toUpperCase().min(3),
      type: z.enum(["PERCENTAGE", "FLAT"]),
      value: z.number().positive(),
      minSpend: z.number().nonnegative().optional(),
      maxDiscount: z.number().nonnegative().optional(),
      usageLimit: z.number().int().positive().optional(),
    })
    .safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "Invalid coupon data" });

  const coupon = await prisma.coupon.create({ data: data.data });
  res.status(201).json(coupon);
});

app.delete("/api/admin/coupons/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  await prisma.coupon.delete({ where: { id: String(req.params.id) } });
  res.status(204).end();
});

// Admin Reviews Moderation APIs
app.get("/api/admin/reviews", requireAuth, requireRole("ADMIN", "STAFF"), async (_req, res) => {
  res.json(await prisma.review.findMany({ include: { product: { select: { name: true } }, user: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } }));
});

app.patch("/api/admin/reviews/:id", requireAuth, requireRole("ADMIN", "STAFF"), async (req, res) => {
  const data = z.object({ isApproved: z.boolean() }).safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "Invalid review update" });
  res.json(await prisma.review.update({ where: { id: String(req.params.id) }, data: data.data }));
});

app.delete("/api/admin/reviews/:id", requireAuth, requireRole("ADMIN", "STAFF"), async (req, res) => {
  await prisma.review.delete({ where: { id: String(req.params.id) } });
  res.status(204).end();
});

// Admin Staff Management APIs
app.get("/api/admin/staff", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  res.json(await prisma.user.findMany({ where: { role: "STAFF" }, select: { id: true, name: true, email: true, role: true, staffType: true, allowedCategories: true, createdAt: true } }));
});

app.post("/api/admin/staff", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const data = z
    .object({
      name: z.string().trim().min(2),
      email: z.string().email(),
      password: z.string().min(8),
      staffType: z.enum(["ORDER_MANAGER", "PRODUCT_MANAGER"]),
      allowedCategories: z.array(z.string()).optional(),
    })
    .safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "Invalid staff payload" });

  const existing = await prisma.user.findUnique({ where: { email: data.data.email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(data.data.password, 12);
  const staff = await prisma.user.create({
    data: {
      name: data.data.name,
      email: data.data.email,
      passwordHash,
      role: "STAFF",
      staffType: data.data.staffType,
      allowedCategories: data.data.allowedCategories ? (data.data.allowedCategories as Prisma.InputJsonValue) : undefined,
    },
  });

  res.status(201).json({ id: staff.id, name: staff.name, email: staff.email, role: staff.role });
});

app.delete("/api/admin/staff/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  await prisma.user.delete({ where: { id: String(req.params.id) } });
  res.status(204).end();
});

// Keys whose decrypted values are secrets and must never reach the browser.
const SECRET_MASK = "••••••••";
const SECRET_KEYS = new Set([
  "appSecret",
  "password",
  "storePassword",
  "pass",
  "apiKey",
  "secretKey",
  "clientSecret",
  "secretAccessKey",
  "privateKey",
  "refreshToken",
]);

/** Recursively replace secret string values with a mask for browser responses. */
function maskSecrets<T>(value: T): T {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => maskSecrets(item)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (entry && typeof entry === "object") out[key] = maskSecrets(entry);
    else if (typeof entry === "string" && entry !== "" && SECRET_KEYS.has(key)) out[key] = SECRET_MASK;
    else out[key] = entry;
  }
  return out as T;
}

/** Deep-merge new config over prior, treating masked/empty values as "keep prior". */
function mergeSecretConfig<T extends Record<string, unknown>>(oldValue: T | undefined, newValue: T | undefined): T | undefined {
  if (!newValue) return oldValue;
  if (!oldValue) return newValue;
  const out: Record<string, unknown> = { ...oldValue };
  for (const [key, value] of Object.entries(newValue)) {
    if (value === undefined || value === SECRET_MASK) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) out[key] = mergeSecretConfig(oldValue[key] as Record<string, unknown>, value as Record<string, unknown>);
    else out[key] = value;
  }
  return out as T;
}

app.patch("/api/admin/config", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const data = z
    .object({
      storeName: z.string().min(2).max(100).optional(),
      logoUrl: z.string().url().optional(),
      themeSettings: z.unknown().optional(),
      featureFlags: z.object({ reviews: z.boolean().optional(), wishlist: z.boolean().optional(), coupons: z.boolean().optional(), cod: z.boolean().optional(), addToCart: z.boolean().optional(), checkoutEmail: z.boolean().optional(), bottomNav: z.boolean().optional(), productCallButton: z.boolean().optional(), productWhatsappButton: z.boolean().optional() }).optional(),
      checkoutForm: z.object({
        name: z.object({ enabled: z.boolean().optional(), required: z.boolean().optional(), label: z.string().max(80).optional(), placeholder: z.string().max(120).optional() }).optional(),
        phone: z.object({ enabled: z.boolean().optional(), required: z.boolean().optional(), label: z.string().max(80).optional(), placeholder: z.string().max(120).optional() }).optional(),
        email: z.object({ enabled: z.boolean().optional(), required: z.boolean().optional(), label: z.string().max(80).optional(), placeholder: z.string().max(120).optional() }).optional(),
        address: z.object({ enabled: z.boolean().optional(), required: z.boolean().optional(), label: z.string().max(80).optional(), placeholder: z.string().max(120).optional() }).optional(),
        district: z.object({ enabled: z.boolean().optional(), required: z.boolean().optional(), label: z.string().max(80).optional(), placeholder: z.string().max(120).optional() }).optional(),
        division: z.object({ enabled: z.boolean().optional(), required: z.boolean().optional(), label: z.string().max(80).optional(), placeholder: z.string().max(120).optional() }).optional(),
      }).optional(),
      shippingConfig: z
        .object({
          defaultCharge: z.number().min(0).max(100000).optional(),
          freeAbove: z.number().min(0).max(1000000).nullable().optional(),
          zones: z
            .array(
              z.object({
                name: z.string().max(80).optional(),
                charge: z.number().min(0).max(100000).optional(),
                districts: z.array(z.string().max(80)).max(200).optional(),
              }),
            )
            .max(50)
            .optional(),
          options: z.array(z.object({ id: z.string().max(80).optional(), name: z.string().min(1).max(80), charge: z.number().min(0).max(100000) })).max(20).optional(),
        })
        .optional(),
      marketingPixels: z.unknown().optional(),
      chatConfig: z.unknown().optional(),
      homePageConfig: z
        .object({
          layout: z.enum(["classic", "catalog"]).optional(),
          sectionVisibility: z
            .object({
              hero: z.boolean().optional(),
              categories: z.boolean().optional(),
              products: z.boolean().optional(),
              collections: z.boolean().optional(),
              trust: z.boolean().optional(),
              promos: z.boolean().optional(),
              announcement: z.boolean().optional(),
            })
            .optional(),
          categories: z
            .object({
              maxCategories: z.number().int().min(1).max(50).optional(),
              selectionMode: z.enum(["automatic", "manual"]).optional(),
              categoryIds: z.array(z.string()).max(100).optional(),
              mode: z.enum(["grid", "carousel", "loop"]).optional(),
              auto: z.boolean().optional(),
              loop: z.boolean().optional(),
              seconds: z.number().int().min(1).max(60).optional(),
              pagination: z.boolean().optional(),
              perView: z.object({ mobile: z.number().min(0.5).max(10), tablet: z.number().min(0.5).max(12), desktop: z.number().min(0.5).max(16) }).optional(),
              eyebrow: z.string().max(60).optional(),
              title: z.string().max(120).optional(),
              accent: z.string().max(120).optional(),
              countLabel: z.string().max(40).optional(),
            })
            .optional(),
          popularProducts: z
            .object({
              eyebrow: z.string().max(80).optional(),
              title: z.string().max(120).optional(),
              limit: z.number().int().min(1).max(50).optional(),
              mode: z.enum(["slider", "grid"]).optional(),
              auto: z.boolean().optional(),
            })
            .optional(),
          sections: z
            .array(
              z.object({
                id: z.string().min(1),
                title: z.string().optional(),
                categoryIds: z.array(z.string()).min(1),
                mode: z.enum(["carousel", "grid", "responsive", "infinite"]),
                productLimit: z.number().int().min(1).max(50).optional(),
                auto: z.boolean(),
                seconds: z.number().int().min(1).max(60),
                perView: z.object({ mobile: z.number().min(0.5).max(10), tablet: z.number().min(0.5).max(12), desktop: z.number().min(0.5).max(16) }),
                pagination: z.boolean(),
                loop: z.boolean(),
                showViewAll: z.boolean(),
              })
            )
            .optional(),
          homepageCategories: z.object({
            mode: z.enum(["manual", "automatic"]),
            defaultProductLimit: z.number().int().min(1).max(50).nullable(),
            defaultDisplayStyle: z.enum(["grid", "slider", "loop"]),
            defaultAuto: z.boolean().optional(),
            defaultLoop: z.boolean().optional(),
            defaultSeconds: z.number().int().min(1).max(60).optional(),
            defaultPagination: z.boolean().optional(),
            defaultPerView: z.object({ mobile: z.number().int().min(1).max(12), tablet: z.number().int().min(1).max(12), desktop: z.number().int().min(1).max(12) }).optional(),
            defaultOrder: z.enum(["alphabetical", "newest"]),
            categories: z.array(z.object({
              categoryId: z.string().min(1),
              visible: z.boolean(),
              productLimit: z.number().int().min(1).max(50).nullable().optional(),
              displayStyle: z.enum(["grid", "slider", "loop"]).optional(),
              auto: z.boolean().optional(),
              loop: z.boolean().optional(),
              seconds: z.number().int().min(1).max(60).optional(),
              pagination: z.boolean().optional(),
              perView: z.object({ mobile: z.number().int().min(1).max(12), tablet: z.number().int().min(1).max(12), desktop: z.number().int().min(1).max(12) }).optional(),
            })).max(300),
          }).optional(),
          promoBanners: z
            .array(
              z.object({
                enabled: z.boolean().optional(),
                badge: z.string().max(100).optional(),
                title: z.string().max(150).optional(),
                accent: z.string().max(150).optional(),
                subtitle: z.string().max(300).optional(),
                buttonLabel: z.string().max(80).optional(),
                buttonLink: z.string().max(300).optional(),
                image: z.string().max(500).optional(),
              })
            )
            .max(2)
            .optional(),
          trustBadges: z
            .array(
              z.object({
                enabled: z.boolean().optional(),
                icon: z.string().max(40).optional(),
                title: z.string().max(100).optional(),
                subtitle: z.string().max(200).optional(),
              })
            )
            .max(4)
            .optional(),
          testimonials: z
            .object({
              enabled: z.boolean().optional(),
              eyebrow: z.string().max(60).optional(),
              title: z.string().max(120).optional(),
              accent: z.string().max(120).optional(),
              subtitle: z.string().max(300).optional(),
              items: z
                .array(
                  z.object({
                    init: z.string().max(5).optional(),
                    image: z.string().max(500).nullable().optional(),
                    name: z.string().max(100).optional(),
                    role: z.string().max(150).optional(),
                    quote: z.string().max(500).optional(),
                    rating: z.number().int().min(1).max(5).optional(),
                  })
                )
                .max(12)
                .optional(),
            })
            .optional(),
          footer: z
            .object({
              enabled: z.boolean().optional(),
              brand: z.string().max(100).optional(),
              logo: z.string().max(500).optional(),
              slogan: z.string().max(300).optional(),
              social: z
                .object({
                  facebook: z.string().max(500).optional(),
                  youtube: z.string().max(500).optional(),
                  instagram: z.string().max(500).optional(),
                  whatsapp: z.string().max(500).optional(),
                  phone: z.string().max(60).optional(),
                })
                .optional(),
              showCategories: z.boolean().optional(),
              categoryTitle: z.string().max(80).optional(),
              categoryLimit: z.number().int().min(1).max(20).optional(),
              categories: z
                .array(
                  z.object({
                    label: z.string().max(80).optional(),
                    url: z.string().max(300).optional(),
                  })
                )
                .max(20)
                .optional(),
              contactTitle: z.string().max(80).optional(),
              contact: z
                .object({
                  address: z.string().max(300).optional(),
                  phone: z.string().max(60).optional(),
                  email: z.string().max(200).optional(),
                })
                .optional(),
              copyright: z.string().max(200).optional(),
              credit: z.string().max(120).optional(),
              links: z
                .array(
                  z.object({
                    label: z.string().max(60).optional(),
                    url: z.string().max(200).optional(),
                  })
                )
                .max(10)
                .optional(),
            })
            .optional(),
        })
        .optional(),
      heroBannerConfig: z
        .object({
          enabled: z.boolean().optional(),
          announceEnabled: z.boolean().optional(),
          announceText: z.string().nullable().optional(),
          announceBadge: z.string().max(60).nullable().optional(),
          announceLinkLabel: z.string().max(40).nullable().optional(),
          announceLink: z.string().max(200).nullable().optional(),
          seconds: z.number().int().min(2).max(30).optional(),
          slides: z
            .array(
              z.object({
                id: z.string().min(1),
                image: z.string().nullable().optional(),
                badge: z.string().nullable().optional(),
                title: z.string().nullable().optional(),
                accent: z.string().nullable().optional(),
                subtitle: z.string().nullable().optional(),
                buttonLabel: z.string().nullable().optional(),
                buttonLink: z.string().nullable().optional(),
                secondaryLabel: z.string().nullable().optional(),
                secondaryLink: z.string().nullable().optional(),
              })
            )
            .optional(),
          image: z.string().nullable().optional(),
          badge: z.string().nullable().optional(),
          title: z.string().nullable().optional(),
          accent: z.string().nullable().optional(),
          subtitle: z.string().nullable().optional(),
          buttonLabel: z.string().nullable().optional(),
          buttonLink: z.string().nullable().optional(),
          secondaryLabel: z.string().nullable().optional(),
          secondaryLink: z.string().nullable().optional(),
          trendingPill: z
            .object({
              enabled: z.boolean().optional(),
              topText: z.string().nullable().optional(),
              bottomText: z.string().nullable().optional(),
            })
            .optional(),
        })
        .optional(),
      navigationConfig: z
        .object({
          menus: z
            .array(
              z.object({
                id: z.string().min(1),
                label: z.string().min(1),
                location: z.string().min(1),
                items: z.array(z.any()),
              })
            )
            .default([]),
        })
        .optional(),
      enableIpLimit: z.boolean().optional(),
      cooldownMinutes: z.number().int().min(1).max(1440).optional(),
      paymentConfig: paymentSettingsSchema.optional(),
      emailConfig: z.object({ host: z.string(), port: z.number().int(), user: z.string(), pass: z.string(), fromEmail: z.string().email() }).optional(),
      courierConfig: z
        .object({
          steadfast: z.object({ enabled: z.boolean(), apiKey: z.string().optional(), secretKey: z.string().optional() }).optional(),
          pathao: z.object({ enabled: z.boolean(), clientId: z.string().optional(), clientSecret: z.string().optional(), clientEmail: z.string().optional() }).optional(),
          redx: z.object({ enabled: z.boolean(), apiKey: z.string().optional() }).optional(),
        })
        .optional(),
      storageConfig: z
        .discriminatedUnion("provider", [
          z.object({
            provider: z.literal("hostinger-object-storage"),
            endpoint: z.string().url().optional(),
            region: z.string().optional(),
            bucket: z.string().min(1).optional(),
            accessKeyId: z.string().min(1).optional(),
            secretAccessKey: z.string().min(1).optional(),
            publicBaseUrl: z.string().url().optional(),
          }),
          z.object({
            provider: z.literal("local"),
            folderPath: z.string().refine(isPersistentLocalStoragePath, "Use an absolute writable folder outside hbuilds and public_html."),
            publicBaseUrl: z.string().url().refine((value) => {
              try {
                const url = new URL(value);
                return url.pathname.replace(/\/+$/, "") === "/uploads/products" && (process.env.NODE_ENV !== "production" || url.protocol === "https:");
              }
              catch { return false; }
            }, "Use the public URL ending in /uploads/products."),
          }),
        ])
        .optional(),
      aiConfig: z.object({ provider: z.enum(["openai", "gemini"]), apiKey: z.string(), systemPromptOverride: z.string().optional() }).optional(),
    })
    .safeParse(req.body);

  if (!data.success) return res.status(400).json({ error: "Invalid store configuration" });
  const input = data.data;
  const existing = await prisma.storeConfig.findUnique({
    where: { id: "store-config-singleton" },
    select: { featureFlags: true, paymentConfig: true, emailConfig: true, courierConfig: true, storageConfig: true, aiConfig: true, heroBannerConfig: true, homePageConfig: true },
  });
  const priorPayment = decrypt<PaymentSettings>((existing?.paymentConfig as { encrypted?: string } | null)?.encrypted) ?? {};
  const mergeGateway = <T extends Record<string, unknown>>(oldValue: T | undefined, newValue: T | undefined) =>
    newValue
      ? { ...oldValue, ...Object.fromEntries(Object.entries(newValue).filter(([, value]) => value !== undefined && value !== "" && value !== SECRET_MASK)) }
      : oldValue;

  const paymentConfig = input.paymentConfig
    ? {
        bkash: mergeGateway(priorPayment.bkash, input.paymentConfig.bkash),
        nagad: mergeGateway(priorPayment.nagad, input.paymentConfig.nagad),
        sslcommerz: mergeGateway(priorPayment.sslcommerz, input.paymentConfig.sslcommerz),
      }
    : undefined;

  const priorEmail = decrypt<Record<string, unknown>>((existing?.emailConfig as { encrypted?: string } | null)?.encrypted) ?? {};
  const priorCourier = decrypt<Record<string, unknown>>((existing?.courierConfig as { encrypted?: string } | null)?.encrypted) ?? {};
  const priorStorage = decrypt<Record<string, unknown>>((existing?.storageConfig as { encrypted?: string } | null)?.encrypted) ?? {};
  const priorAi = decrypt<Record<string, unknown>>((existing?.aiConfig as { encrypted?: string } | null)?.encrypted) ?? {};

  const emailConfig = input.emailConfig ? mergeSecretConfig(priorEmail, input.emailConfig as Record<string, unknown>) : undefined;
  const courierConfig = input.courierConfig ? mergeSecretConfig(priorCourier, input.courierConfig as Record<string, unknown>) : undefined;
  const storageConfig = input.storageConfig ? mergeSecretConfig(priorStorage, input.storageConfig as Record<string, unknown>) : undefined;
  const aiConfig = input.aiConfig ? mergeSecretConfig(priorAi, input.aiConfig as Record<string, unknown>) : undefined;

  const config = await prisma.storeConfig.update({
    where: { id: "store-config-singleton" },
    data: {
      ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)),
      themeSettings: input.themeSettings as Prisma.InputJsonValue,
      featureFlags: input.featureFlags ? ({ ...defaultFeatureFlags, ...((existing?.featureFlags as object | null) ?? {}), ...input.featureFlags } as Prisma.InputJsonValue) : undefined,
      marketingPixels: input.marketingPixels as Prisma.InputJsonValue,
      chatConfig: input.chatConfig as Prisma.InputJsonValue,
      homePageConfig: input.homePageConfig
        ? ({
            ...((existing?.homePageConfig as Record<string, unknown>) ?? {}),
            ...input.homePageConfig,
          } as Prisma.InputJsonValue)
        : undefined,
      heroBannerConfig: input.heroBannerConfig
        ? ({ ...((existing?.heroBannerConfig as Record<string, unknown>) ?? {}), ...Object.fromEntries(Object.entries(input.heroBannerConfig).filter(([, v]) => v !== undefined)) } as Prisma.InputJsonValue)
        : undefined,
      navigationConfig: input.navigationConfig as Prisma.InputJsonValue,
      shippingConfig: input.shippingConfig as Prisma.InputJsonValue,
      paymentConfig: paymentConfig ? { encrypted: encrypt(paymentConfig) } : undefined,
      emailConfig: emailConfig ? { encrypted: encrypt(emailConfig) } : undefined,
      courierConfig: courierConfig ? { encrypted: encrypt(courierConfig) } : undefined,
      storageConfig: storageConfig ? { encrypted: encrypt(storageConfig) } : undefined,
      aiConfig: aiConfig ? { encrypted: encrypt(aiConfig) } : undefined,
    },
  });

  const updatedStorage = config.storageConfig as { encrypted?: string } | null;
  const updatedPayment = config.paymentConfig as { encrypted?: string } | null;
  const updatedEmail = config.emailConfig as { encrypted?: string } | null;
  const updatedCourier = config.courierConfig as { encrypted?: string } | null;
  const updatedAi = config.aiConfig as { encrypted?: string } | null;
  const dec = (v: { encrypted?: string } | null) => (v?.encrypted ? (decrypt<Record<string, unknown>>(v.encrypted) ?? null) : null);
  res.json({
    ...config,
    featureFlags: { ...defaultFeatureFlags, ...((config.featureFlags as Record<string, boolean> | null) ?? {}) },
    paymentConfig: maskSecrets(dec(updatedPayment)),
    emailConfig: maskSecrets(dec(updatedEmail)),
    courierConfig: maskSecrets(dec(updatedCourier)),
    storageConfig: maskSecrets(dec(updatedStorage)),
    aiConfig: maskSecrets(dec(updatedAi)),
  });
});

app.get("/api/admin/config", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  const config = await prisma.storeConfig.findUnique({ where: { id: "store-config-singleton" } });
  if (!config) return res.status(404).json({ error: "Store is not configured" });
  const encrypted = config.paymentConfig as { encrypted?: string } | null;
  const payments = encrypted?.encrypted ? (decrypt<PaymentSettings>(encrypted.encrypted) ?? {}) : {};
  const storage = config.storageConfig as { encrypted?: string } | null;
  const storageDecrypted = storage?.encrypted ? (decrypt<Record<string, unknown>>(storage.encrypted) ?? null) : null;
  const email = config.emailConfig as { encrypted?: string } | null;
  const emailDecrypted = email?.encrypted ? (decrypt<Record<string, unknown>>(email.encrypted) ?? null) : null;
  const courier = config.courierConfig as { encrypted?: string } | null;
  const courierDecrypted = courier?.encrypted ? (decrypt<Record<string, unknown>>(courier.encrypted) ?? null) : null;
  const ai = config.aiConfig as { encrypted?: string } | null;
  const aiDecrypted = ai?.encrypted ? (decrypt<Record<string, unknown>>(ai.encrypted) ?? null) : null;
  res.json({
    ...config,
    featureFlags: { ...defaultFeatureFlags, ...((config.featureFlags as Record<string, boolean> | null) ?? {}) },
    paymentConfig: maskSecrets(payments),
    emailConfig: maskSecrets(emailDecrypted),
    courierConfig: maskSecrets(courierDecrypted),
    storageConfig: maskSecrets(storageDecrypted),
    aiConfig: maskSecrets(aiDecrypted),
    emailConfigured: Boolean(config.emailConfig),
    courierConfigured: Boolean(config.courierConfig),
    storageConfigured: Boolean(config.storageConfig),
    aiConfigured: Boolean(config.aiConfig),
  });
});

app.post("/api/admin/test-email", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const parsed = z.object({ to: z.string().email().max(200) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid recipient email" });
  try {
    await sendTestMail(parsed.data.to);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Could not send test email" });
  }
});

app.get("/api/admin/failed-emails", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  res.json(
    await prisma.failedEmail.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, to: true, subject: true, error: true, attempts: true, createdAt: true },
    }),
  );
});

app.post("/api/admin/failed-emails/:id/resend", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const row = await prisma.failedEmail.findUnique({ where: { id: String(req.params.id) } });
  if (!row) return res.status(404).json({ error: "Failed email not found" });
  try {
    await resendStoredEmail(row.to, row.subject, row.html);
  } catch (err) {
    return res.status(502).json({ error: err instanceof Error ? err.message : "Could not resend email" });
  }
  await prisma.failedEmail.delete({ where: { id: row.id } });
  res.json({ ok: true });
});

app.delete("/api/admin/failed-emails/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  await prisma.failedEmail.delete({ where: { id: String(req.params.id) } });
  res.status(204).end();
});

const abandonedCheckoutCleanup = () => prisma.abandonedCheckout.deleteMany({ where: { updatedAt: { lt: new Date(Date.now() - 30 * 86400000) } } })
  .then(({ count }) => { if (count) console.info(`[checkout cleanup] removed ${count} expired sessions`); })
  .catch((error) => console.error("abandoned checkout cleanup failed:", error instanceof Error ? error.message : error));
void abandonedCheckoutCleanup();
const abandonedCheckoutCleanupTimer = setInterval(() => { void abandonedCheckoutCleanup(); }, 24 * 60 * 60 * 1000);
abandonedCheckoutCleanupTimer.unref();

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
