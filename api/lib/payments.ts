import Stripe from "stripe";
import { prisma } from "./prisma.js";

let stripeClient: Stripe | undefined;
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured");
  if (!key.startsWith("sk_test_") && process.env.ALLOW_LIVE_PAYMENTS !== "true") throw new Error("Stripe live payments are disabled");
  return (stripeClient ??= new Stripe(key));
}

export async function handleStripeEvent(rawBody: Buffer, signature: string | undefined) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) throw new Error("Stripe webhook signature is not configured");
  const event = stripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  const session = event.data.object as Stripe.Checkout.Session;
  const eventObject = session as Stripe.Checkout.Session & { metadata?: Record<string, string> };
  const orderId = eventObject.metadata?.orderId;

  if (event.type === "checkout.session.completed" && session.payment_status === "paid" && orderId) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.stripeEvent.create({ data: { id: event.id, type: event.type } });
        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (!order || order.paymentStatus !== "UNPAID" || order.status !== "PENDING") return;
        if (session.amount_total !== Math.round(Number(order.totalAmount) * 100)) throw new Error("Stripe amount does not match order total");
        const items = order.orderItems as Array<{ productId: string; variationId?: string; qty: number }>;
        for (const item of items) {
          const result = item.variationId
            ? await tx.productVariation.updateMany({ where: { id: item.variationId, productId: item.productId, manageStock: true, stock: { gte: item.qty } }, data: { stock: { decrement: item.qty } } })
            : await tx.product.updateMany({ where: { id: item.productId, manageStock: true, stock: { gte: item.qty } }, data: { stock: { decrement: item.qty } } });
          const manage = item.variationId
            ? await tx.productVariation.findFirst({ where: { id: item.variationId }, select: { manageStock: true } })
            : await tx.product.findUnique({ where: { id: item.productId }, select: { manageStock: true } });
          if (manage?.manageStock && result.count !== 1) throw new Error(`Inventory unavailable for order ${order.id}`);
        }
        await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID", status: "CONFIRMED", stockAdjusted: true, stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id } });
        if (order.customerId) await tx.cartItem.deleteMany({ where: { cart: { userId: order.customerId } } });
      });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") return event;
      if (!(error instanceof Error) || !/Stripe amount does not match|Inventory unavailable/.test(error.message)) throw error;
      await prisma.$transaction(async (tx) => {
        await tx.stripeEvent.create({ data: { id: event.id, type: event.type } }).catch((insertError: unknown) => { if (!(insertError && typeof insertError === "object" && "code" in insertError && insertError.code === "P2002")) throw insertError; });
        await tx.order.updateMany({ where: { id: orderId, paymentStatus: { not: "PAID" } }, data: { status: "ON_HOLD", needsRefund: true } });
      });
      console.error(`Stripe order ${orderId} put on hold: ${error instanceof Error ? error.message : error}`);
    }
  } else if ((event.type === "checkout.session.expired" || event.type === "payment_intent.payment_failed") && orderId) {
    await prisma.$transaction(async (tx) => {
      await tx.stripeEvent.create({ data: { id: event.id, type: event.type } });
      await tx.order.updateMany({ where: { id: orderId, paymentStatus: "UNPAID" }, data: { status: "CANCELLED", paymentStatus: "FAILED" } });
    }).catch((error: unknown) => { if (!(error && typeof error === "object" && "code" in error && error.code === "P2002")) throw error; });
  }
  return event;
}
