"use client";

import { formatMoney } from "../../api/lib/money";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FiAlertCircle, FiCheckCircle, FiChevronRight, FiClock, FiCreditCard, FiMail, FiMapPin, FiPackage, FiPhone, FiUser } from "react-icons/fi";
import { SiteHeader } from "../../components/site-header";
import { Skeleton } from "../../components/skeletons";

type OrderItem = { name?: string; qty?: number; price?: number; productId?: string; variationId?: string };
type DeliveryDetails = { name?: string; phone?: string; email?: string; addressLine1?: string; addressLine2?: string; city?: string; state?: string; postalCode?: string; country?: string };
type LastOrder = {
  id?: string;
  createdAt?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  status?: string;
  subtotal?: number;
  shippingCharge?: number;
  discountAmount?: number | null;
  totalAmount?: number;
  shippingDetails?: DeliveryDetails | null;
  orderItems?: OrderItem[] | null;
};

type PageState = "loading" | "ready" | "pending" | "failed" | "auth" | "missing";
const money = formatMoney;

export default function OrderSuccessPage() {
  const [order, setOrder] = useState<LastOrder | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");

  useEffect(() => {
    const requestedOrderId = new URLSearchParams(window.location.search).get("order");
    if (requestedOrderId) {
      setOrderId(requestedOrderId);
      return;
    }
    try {
      const raw = sessionStorage.getItem("epic-last-order");
      if (!raw) { setPageState("missing"); return; }
      setOrder(JSON.parse(raw) as LastOrder);
      setPageState("ready");
    } catch {
      setPageState("missing");
    }
  }, []);

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const checkOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
        if (!active) return;
        if (response.status === 401) { setPageState("auth"); return; }
        if (response.status === 404) { setPageState("missing"); return; }
        if (!response.ok) throw new Error("Could not load order");
        const currentOrder = await response.json() as LastOrder;
        if (!active) return;
        setOrder(currentOrder);
        if (currentOrder.paymentStatus === "PAID") {
          setPageState("ready");
          localStorage.removeItem("epic-cart");
          sessionStorage.removeItem("epic-last-order");
          return;
        }
        if (currentOrder.paymentStatus === "FAILED" || currentOrder.status === "CANCELLED") {
          setPageState("failed");
          return;
        }
        attempts += 1;
        if (attempts >= 30) setPageState("pending");
        timer = setTimeout(checkOrder, attempts >= 30 ? 5000 : 2000);
      } catch {
        if (!active) return;
        attempts += 1;
        if (attempts >= 30) setPageState("pending");
        timer = setTimeout(checkOrder, attempts >= 30 ? 5000 : 2000);
      }
    };

    setPageState("loading");
    void checkOrder();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [orderId]);

  if (pageState === "loading") {
    return (
      <main className="order-success-page" aria-busy="true" aria-live="polite">
        <SiteHeader />
        <section className="order-success-body"><div className="order-success-card">
          <div className="mx-auto h-14 w-14 animate-pulse rounded-full bg-slate-200" />
          <Skeleton className="mx-auto mt-5 h-7 w-56 max-w-full" />
          <Skeleton className="mx-auto mt-3 h-4 w-80 max-w-full" />
          <div className="mt-8 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
        </div></section>
      </main>
    );
  }

  if (pageState === "auth" || pageState === "missing" || pageState === "failed") {
    const failed = pageState === "failed";
    const authRequired = pageState === "auth";
    return (
      <main className="order-success-page">
        <SiteHeader />
        <section className="order-success-body"><div className="order-success-card">
          <div className="success-badge" style={{ background: failed ? "#dc2626" : "#64748b" }}>{failed ? <FiAlertCircle size={36} /> : <FiPackage size={36} />}</div>
          <h1>{failed ? "Payment was not completed" : authRequired ? "Sign in to view your order" : "Order not found"}</h1>
          <p className="order-success-sub">{failed ? "Your payment could not be confirmed. Your cart is still saved so you can try again." : authRequired ? "Please sign in with the account used at checkout to see your order details." : "We could not find this order. Please check your account or return to the store."}</p>
          <div className="order-success-actions">
            {authRequired ? <Link href={`/account?next=${encodeURIComponent(`/order-success?order=${orderId}`)}`} className="btn-primary">Sign in <FiChevronRight /></Link> : null}
            <Link href={failed ? "/checkout" : "/account"} className="btn-primary">{failed ? "Return to checkout" : "My Orders"} <FiChevronRight /></Link>
            <Link href="/" className="btn-ghost">Continue Shopping</Link>
          </div>
        </div></section>
      </main>
    );
  }

  const items = order?.orderItems ?? [];
  const details = order?.shippingDetails ?? {};
  const customerName = details.name?.trim() || "there";
  const paymentPending = pageState === "pending" || (order?.paymentMethod === "STRIPE" && order.paymentStatus !== "PAID");

  return (
    <main className="order-success-page">
      <SiteHeader />
      <section className="order-success-body">
        <div className="order-success-card">
          <div className="success-badge" style={paymentPending ? { background: "linear-gradient(135deg,#f59e0b,#d97706)", boxShadow: "0 14px 30px rgba(245,158,11,.28)" } : undefined}>
            {paymentPending ? <FiClock size={36} /> : <FiCheckCircle size={38} />}
          </div>
          <span className="eyebrow">{paymentPending ? "PAYMENT CONFIRMATION" : "THANK YOU"}</span>
          <h1>{paymentPending ? "We’re confirming your payment" : `Thank you, ${customerName}!`}</h1>
          <p className="order-success-sub">
            {paymentPending ? "Your order is back on our website. Stripe is confirming the payment; this page will update automatically." : <>Your order <strong className="order-id">#{order?.id?.slice(0, 8).toUpperCase() ?? ""}</strong> has been received. Our team will contact you soon about delivery.</>}
          </p>

          {order && (
            <div className="order-success-meta">
              <div className="meta-item"><FiClock /><span>Placed</span><strong>{order.createdAt ? new Date(order.createdAt).toLocaleString("en-GB") : "Just now"}</strong></div>
              <div className="meta-item"><FiCreditCard /><span>Payment</span><strong>{order.paymentMethod === "STRIPE" ? "Card (Stripe)" : order.paymentMethod ?? "Cash on delivery"}</strong></div>
              <div className="meta-item"><FiPackage /><span>Total</span><strong>{money(order.totalAmount)}</strong></div>
            </div>
          )}

          {order && <>
            <div className="os-box">
              <h4>Order Items</h4>
              {items.length ? <div className="os-items">{items.map((item, index) => <div key={item.productId ?? `${item.name}-${index}`} className="os-item"><span className="os-item-name">{item.name} {item.qty ? <em>× {item.qty}</em> : null}</span><strong>{money(Number(item.price) * Number(item.qty))}</strong></div>)}</div> : <p className="os-empty">Items not available.</p>}
              <div className="os-totals"><div><span>Subtotal</span><strong>{money(order.subtotal)}</strong></div>{Number(order.discountAmount) > 0 && <div style={{ color: "#059669" }}><span>Discount</span><strong>- {money(order.discountAmount ?? 0)}</strong></div>}<div><span>Shipping</span><strong>{money(order.shippingCharge)}</strong></div><div className="os-total"><span>Total</span><strong>{money(order.totalAmount)}</strong></div></div>
            </div>
            <div className="os-box"><h4>Delivery Details</h4><div className="os-contact"><span><FiUser /> {customerName}</span><span><FiPhone /> {details.phone ?? "—"}</span>{details.email ? <span><FiMail /> {details.email}</span> : null}<span><FiMapPin /> {[details.addressLine1, details.addressLine2, details.city, details.state, details.postalCode, details.country].filter(Boolean).join(", ") || "—"}</span></div></div>
          </>}

          <div className="order-success-note"><FiUser /><span>You can track your order anytime from your account.</span></div>
          <div className="order-success-actions"><Link href="/account" className="btn-primary">My Orders — Track Delivery <FiChevronRight /></Link><Link href="/" className="btn-ghost">Continue Shopping</Link></div>
        </div>
      </section>
    </main>
  );
}
