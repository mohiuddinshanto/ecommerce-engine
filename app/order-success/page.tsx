"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiCheckCircle, FiChevronRight, FiClock, FiCreditCard, FiMail, FiMapPin, FiPackage, FiPhone, FiUser } from "react-icons/fi";
import { SiteHeader } from "../../components/site-header";
import { Skeleton } from "../../components/skeletons";

type OrderItem = {
  name?: string;
  qty?: number;
  price?: number;
  productId?: string;
  variationId?: string;
};

type DeliveryDetails = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  district?: string;
  division?: string;
};

type LastOrder = {
  id?: string;
  createdAt?: string;
  paymentMethod?: string;
  subtotal?: number;
  shippingCharge?: number;
  discountAmount?: number | null;
  totalAmount?: number;
  shippingDetails?: DeliveryDetails | null;
  orderItems?: OrderItem[] | null;
};

const money = (value?: number) => "৳ " + (Number(value) || 0).toLocaleString("en-BD");

export default function OrderSuccessPage() {
  const [order, setOrder] = useState<LastOrder | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("epic-last-order");
      if (raw) setOrder(JSON.parse(raw));
    } catch {
      /* ignore */
    } finally {
      setReady(true);
    }
  }, []);

  if (!ready) {
    return (
      <main className="order-success-page" aria-busy="true" aria-live="polite">
        <SiteHeader />
        <section className="order-success-body">
          <div className="order-success-card">
            <div className="mx-auto h-14 w-14 animate-pulse rounded-full bg-slate-200" />
            <Skeleton className="mx-auto mt-5 h-7 w-56 max-w-full" />
            <Skeleton className="mx-auto mt-3 h-4 w-80 max-w-full" />
            <div className="mt-8 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </section>
      </main>
    );
  }

  const items = order?.orderItems ?? [];
  const details = order?.shippingDetails ?? {};
  const customerName = details.name?.trim() || "there";

  return (
    <main className="order-success-page">
      <SiteHeader />

      <section className="order-success-body">
        <div className="order-success-card">
          <div className="success-badge">
            <FiCheckCircle size={38} />
          </div>
          <span className="eyebrow">THANK YOU</span>
          <h1>ধন্যবাদ, {customerName}!</h1>
          <p className="order-success-sub">
            আপনার অর্ডার{' '}
            <strong className="order-id">#{order?.id?.slice(0, 8).toUpperCase() ?? ""}</strong>{' '}
            সফলভাবে রিসিভ করা হয়েছে। আমাদের টিম শিগগিরই ডেলিভারির জন্য আপনার সাথে যোগাযোগ করবে।
          </p>

          {order && (
            <div className="order-success-meta">
              <div className="meta-item">
                <FiClock />
                <span>Placed</span>
                <strong>{order.createdAt ? new Date(order.createdAt).toLocaleString("en-GB") : "Just now"}</strong>
              </div>
              <div className="meta-item">
                <FiCreditCard />
                <span>Payment</span>
                <strong>{order.paymentMethod ?? "Cash on delivery"}</strong>
              </div>
              <div className="meta-item">
                <FiPackage />
                <span>Total</span>
                <strong>{money(order.totalAmount)}</strong>
              </div>
            </div>
          )}

          <div className="os-box">
            <h4>Order Items</h4>
            {items.length ? (
              <div className="os-items">
                {items.map((item, index) => (
                  <div key={item.productId ?? `${item.name}-${index}`} className="os-item">
                    <span className="os-item-name">
                      {item.name} {item.qty ? <em>× {item.qty}</em> : null}
                    </span>
                    <strong>{money(Number(item.price) * Number(item.qty))}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="os-empty">Items not available.</p>
            )}
            <div className="os-totals">
              <div>
                <span>Subtotal</span>
                <strong>{money(order?.subtotal)}</strong>
              </div>
              {Number(order?.discountAmount) > 0 && (
                <div style={{ color: "#059669" }}>
                  <span>Discount</span>
                  <strong>- {money(order?.discountAmount ?? 0)}</strong>
                </div>
              )}
              <div>
                <span>Shipping</span>
                <strong>{money(order?.shippingCharge)}</strong>
              </div>
              <div className="os-total">
                <span>Total</span>
                <strong>{money(order?.totalAmount)}</strong>
              </div>
            </div>
          </div>

          <div className="os-box">
            <h4>Delivery Details</h4>
            <div className="os-contact">
              <span><FiUser /> {customerName}</span>
              <span><FiPhone /> {details.phone ?? "—"}</span>
              {details.email ? <span><FiMail /> {details.email}</span> : null}
              <span><FiMapPin /> {[details.address, details.district, details.division].filter(Boolean).join(", ") || "—"}</span>
            </div>
          </div>

          <div className="order-success-note">
            <FiUser />
            <span>আপনার অর্ডার যেকোনো সময় প্রোফাইল থেকে ট্র্যাক করতে পারবেন।</span>
          </div>

          <div className="order-success-actions">
            <Link href="/account" className="btn-primary">
              My Orders — Track Delivery <FiChevronRight />
            </Link>
            <Link href="/" className="btn-ghost">
              Continue Shopping
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}