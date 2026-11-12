import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import Stripe from "stripe";
import jwt from "jsonwebtoken";
import { prisma } from "../api/lib/prisma.js";


async function main() {
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Set DATABASE_URL to a local MySQL database in .env before running this smoke test.");
const databaseHost = new URL(databaseUrl).hostname.toLowerCase();
if (!("localhost,127.0.0.1,::1,[::1]".split(",").includes(databaseHost))) throw new Error("Refusing to run checkout smoke tests unless DATABASE_URL points to localhost.");

process.env.JWT_SECRET ||= randomBytes(48).toString("hex");
process.env.STRIPE_SECRET_KEY = "sk_test_local_smoke_only";
process.env.STRIPE_WEBHOOK_SECRET ||= `whsec_${randomBytes(32).toString("hex")}`;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const suffix = randomBytes(6).toString("hex");
const email = `smoke-${suffix}@example.test`;
const password = `Smoke-${randomBytes(12).toString("hex")}`;
let userId: string | undefined;
let categoryId: string | undefined;
let productId: string | undefined;
let orderId: string | undefined;
const appModule = await import("../api/server.js");
const server = createServer(appModule.default);

function cookieFrom(response: Response): string {
  const cookie = response.headers.getSetCookie?.().find((value) => value.startsWith("epic_session=")) ?? response.headers.get("set-cookie");
  assert.ok(cookie?.startsWith("epic_session="), "JWT must be issued in the epic_session cookie");
  if (!cookie) throw new Error("JWT cookie was not issued");
  return cookie.split(";")[0];
}

async function api(baseUrl: string, path: string, options: RequestInit = {}, cookie?: string) {
  const headers = new Headers(options.headers);
  if (cookie) headers.set("cookie", cookie);
  return fetch(`${baseUrl}${path}`, { ...options, headers });
}

try {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const signup = await api(baseUrl, "/api/auth/sign-up", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Checkout Smoke", email, password }) });
  assert.equal(signup.status, 201, `sign-up failed (${signup.status})`);
  let cookie = cookieFrom(signup);
  assert.equal(cookie.split("=")[1]?.split(".").length, 3, "sign-up cookie must contain a JWT");
  const user = await signup.json() as { user: { id: string } };
  userId = user.user.id;

  const category = await prisma.category.create({ data: { name: `Smoke ${suffix}`, slug: `smoke-${suffix}` } });
  categoryId = category.id;
  const product = await prisma.product.create({ data: { categoryId, name: `Smoke Product ${suffix}`, slug: `smoke-product-${suffix}`, description: "Checkout smoke fixture", price: 10, stock: 5, images: [] } });
  productId = product.id;

  const add = await api(baseUrl, "/api/cart/items", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId, quantity: 1 }) }, cookie);
  assert.equal(add.status, 201, "cart add failed");
  const signout = await api(baseUrl, "/api/auth/sign-out", { method: "POST" }, cookie);
  assert.equal(signout.status, 204, "sign-out failed");
  assert.match(signout.headers.get("set-cookie") ?? "", /epic_session=;.*(?:Max-Age=0|Expires=Thu, 01 Jan 1970)/i, "sign-out must clear the JWT cookie");

  const signin = await api(baseUrl, "/api/auth/sign-in", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  assert.equal(signin.status, 200, "sign-in failed");
  cookie = cookieFrom(signin);
  assert.equal(cookie.split("=")[1]?.split(".").length, 3, "sign-in cookie must contain a JWT");
  const badJwt = await api(baseUrl, "/api/auth/me", { headers: { authorization: "Bearer not-a-jwt" } });
  assert.equal(badJwt.status, 401, "invalid JWT must be rejected");
  const expiredJwt = jwt.sign({ role: "CUSTOMER" }, process.env.JWT_SECRET!, { subject: userId, expiresIn: "-1s" });
  const expiredAuth = await api(baseUrl, "/api/auth/me", { headers: { authorization: `Bearer ${expiredJwt}` } });
  assert.equal(expiredAuth.status, 401, "expired JWT must be rejected");
  const cartResponse = await api(baseUrl, "/api/cart", {}, cookie);
  assert.equal(cartResponse.status, 200);
  const cart = await cartResponse.json() as { items: Array<{ productId: string; quantity: number }> };
  assert.ok(cart.items.some((item) => item.productId === productId && item.quantity === 1), "cart did not persist across login");
  const persistedItem = cart.items.find((item) => item.productId === productId) as { id?: string; quantity: number };
  const overAdd = await api(baseUrl, "/api/cart/items", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId, quantity: 5 }) }, cookie);
  assert.equal(overAdd.status, 409, "cart add must reject quantities above stock");
  const overUpdate = await api(baseUrl, `/api/cart/items/${persistedItem.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ quantity: 6 }) }, cookie);
  assert.equal(overUpdate.status, 409, "cart update must reject quantities above stock");

  const order = await prisma.order.create({ data: { customerId: userId, ipAddress: "127.0.0.1", paymentMethod: "STRIPE", paymentStatus: "UNPAID", status: "PENDING", subtotal: 10, shippingCharge: 0, totalAmount: 10, shippingDetails: { name: "Smoke User" }, orderItems: [{ productId, qty: 1, price: 10 }] } });
  orderId = order.id;
  const eventId = `evt_smoke_${suffix}`;
  const payload = JSON.stringify({ id: eventId, object: "event", created: Math.floor(Date.now() / 1000), data: { object: { id: `cs_test_${suffix}`, object: "checkout.session", amount_total: 1000, currency: "usd", payment_status: "paid", payment_intent: `pi_test_${suffix}`, metadata: { orderId } } }, livemode: false, pending_webhooks: 1, type: "checkout.session.completed" });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
  const sendWebhook = () => api(baseUrl, "/api/webhooks/stripe", { method: "POST", headers: { "content-type": "application/json", "stripe-signature": signature }, body: payload });
  assert.equal((await sendWebhook()).status, 200, "signed Stripe webhook failed");
  const paidOrder = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  const stockAfterFirst = (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock;
  assert.equal(paidOrder.paymentStatus, "PAID");
  assert.equal(stockAfterFirst, 4, "first webhook should decrement stock once");
  assert.equal((await sendWebhook()).status, 200, "duplicate Stripe webhook failed");
  const stockAfterDuplicate = (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock;
  assert.equal(stockAfterDuplicate, 4, "duplicate event decremented stock again");

  const guestOrder = await api(baseUrl, "/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paymentMethod: "COD", shippingDetails: {}, orderItems: [] }) });
  assert.equal(guestOrder.status, 401, "guest order request must be rejected");
  console.log("Checkout smoke passed: JWT register/login, persistent cart, signed Stripe webhook/idempotency, and guest rejection.");
} finally {
  if (orderId) await prisma.order.deleteMany({ where: { id: orderId } });
  await prisma.user.deleteMany({ where: { email } });
  if (productId) await prisma.product.deleteMany({ where: { id: productId } });
  if (categoryId) await prisma.category.deleteMany({ where: { id: categoryId } });
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.$disconnect();
}

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
