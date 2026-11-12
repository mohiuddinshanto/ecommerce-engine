"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function CheckoutSuccessPage() {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [status, setStatus] = useState("PENDING");
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");
  useEffect(() => {
    setOrderId(new URLSearchParams(window.location.search).get("order"));
  }, []);
  useEffect(() => {
    if (!orderId) return;
    let active = true;
    let attempts = 0;
    const poll = async () => {
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
        if (response.ok && active) {
          const order = await response.json();
          setStatus(order.status);
          setPaymentStatus(order.paymentStatus);
          if (order.paymentStatus !== "UNPAID" || attempts < 8) attempts += 1;
        }
      } catch {}
      if (active && paymentStatus !== "PAID" && attempts < 8) setTimeout(poll, 2000);
    };
    void poll();
    return () => { active = false; };
  }, [orderId]);
  return <main className="mx-auto max-w-xl px-6 py-20 text-center"><h1 className="text-3xl font-bold">Payment {paymentStatus === "PAID" ? "confirmed" : "received"}</h1><p className="mt-4">Order {orderId ?? "not found"}: {status} · {paymentStatus}</p><p className="mt-2 text-sm text-gray-500">We are checking for payment confirmation. This page updates automatically.</p><Link className="mt-8 inline-block underline" href="/account">View your orders</Link></main>;
}
