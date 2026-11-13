"use client";
import { formatMoney } from "../../api/lib/money";

import { Button, Input } from "@heroui/react";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { CheckoutSkeleton } from "../../components/skeletons";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiCreditCard,
  FiLock,
  FiMail,
  FiMapPin,
  FiPhone,
  FiShield,
  FiTag,
  FiUser,
} from "react-icons/fi";

const money = formatMoney;
const apiUrl = "";

type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  categoryId: string;
  categoryIds?: string[];
  images?: string[];
  variationId?: string;
  sku?: string;
};

type Method = { id: "COD" | "STRIPE"; label: string; enabled: boolean; note?: string };

type CheckoutField = { enabled: boolean; required: boolean; label: string; placeholder: string };
type CheckoutForm = Record<string, CheckoutField>;

type ShippingConfig = {
  defaultCharge?: number;
  freeAbove?: number | null;
  zones?: { name?: string; charge?: number; countries?: string[]; regions?: string[]; cities?: string[]; postalCodes?: string[] }[];
  options?: { id?: string; name?: string; charge?: number }[];
};

const FALLBACK_SHIPPING = Number(process.env.NEXT_PUBLIC_DEFAULT_SHIPPING_CHARGE || 80);

const DEFAULT_CHECKOUT_FORM: CheckoutForm = {
  name: { enabled: true, required: true, label: "Full name", placeholder: "Rahim Ahmed" },
  phone: { enabled: true, required: true, label: "Phone number", placeholder: "+1 555 0100" },
  email: { enabled: true, required: false, label: "Email address (optional)", placeholder: "you@example.com" },
  addressLine1: { enabled: true, required: true, label: "Address line 1", placeholder: "Street address" },
  addressLine2: { enabled: true, required: false, label: "Address line 2", placeholder: "Apartment, suite, unit (optional)" },
  city: { enabled: true, required: true, label: "City", placeholder: "City" },
  state: { enabled: true, required: true, label: "State / Region", placeholder: "State or region" },
  postalCode: { enabled: true, required: true, label: "Postal code", placeholder: "Postal code" },
  country: { enabled: true, required: true, label: "Country", placeholder: "Country" },
};

const FIELD_META: Record<string, { icon?: ReactNode; full?: boolean }> = {
  name: { icon: <FiUser className="text-gray-400" /> },
  phone: { icon: <FiPhone className="text-gray-400" /> },
  email: { icon: <FiMail className="text-gray-400" /> },
  address: { icon: <FiMapPin className="text-gray-400" />, full: true },
  addressLine1: { full: true },
  addressLine2: { full: true },
};


function computeShipping(subtotal: number, config: ShippingConfig | null, details: Record<string, string>): number {
  if (!subtotal) return 0;
  const freeAbove = config?.freeAbove;
  if (typeof freeAbove === "number" && freeAbove > 0 && subtotal >= freeAbove) return 0;
  const location = [details.country, details.state, details.city, details.postalCode].map((value) => (value ?? "").trim().toLowerCase());
  const match = (config?.zones ?? []).find((zone) =>
    [zone.countries, zone.regions, zone.cities, zone.postalCodes].some((entries) =>
      (entries ?? []).some((entry) => location.includes(entry.trim().toLowerCase())),
    ),
  );
  const charge = match?.charge ?? config?.defaultCharge;
  return typeof charge === "number" && charge >= 0 ? charge : FALLBACK_SHIPPING;
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponId, setCouponId] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [form, setForm] = useState<CheckoutForm>(DEFAULT_CHECKOUT_FORM);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [shippingConfig, setShippingConfig] = useState<ShippingConfig | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedShipping, setSelectedShipping] = useState("");
  const [shippingDetails, setShippingDetails] = useState<Record<string, string>>({ country: "" });
  const [checkoutSessionId, setCheckoutSessionId] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const abandonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shippingOptions = shippingConfig?.options ?? [];
  const shipping = shippingOptions.length
    ? (shippingOptions.find((option, index) => String(option.id ?? index) === selectedShipping)?.charge ?? 0)
    : computeShipping(subtotal, shippingConfig, shippingDetails);
  const totalAmount = Math.max(0, subtotal - discountAmount + shipping);

  useEffect(() => {
    let sessionId = sessionStorage.getItem("epic-checkout-session");
    if (!sessionId) { sessionId = crypto.randomUUID(); sessionStorage.setItem("epic-checkout-session", sessionId); }
    setCheckoutSessionId(sessionId);
    const loadCart = async () => {
      try {
        const auth = await fetch("/api/auth/me");
        if (auth.ok) {
          setAuthenticated(true);
          const local = JSON.parse(localStorage.getItem("epic-cart") ?? "[]") as Array<{ id: string; qty: number }>;
          const failed: typeof local = [];
          for (const item of local) {
            const [productId, variationId] = item.id.split("__");
            if (productId && Number.isInteger(item.qty) && item.qty > 0) {
              const merged = await fetch("/api/cart/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, variationId: variationId || undefined, quantity: item.qty }) });
              if (!merged.ok) failed.push(item);
            }
          }
          if (failed.length) localStorage.setItem("epic-cart", JSON.stringify(failed));
          else localStorage.removeItem("epic-cart");
          const response = await fetch("/api/cart");
          const data = await response.json();
          setCart((data.items ?? []).map((item: CartItem & { productId: string; images?: string[]; categoryIds?: string[] }) => ({ ...item, id: item.variationId ? `${item.productId}__${item.variationId}` : item.productId, images: item.images ?? [] })));
        } else {
          setCart(JSON.parse(localStorage.getItem("epic-cart") ?? "[]"));
        }
      } catch {}
    };
    void loadCart();

    fetch(apiUrl + "/api/store/checkout-options")
      .then((response) => response.json())
      .then((data) => {
        const fetchedMethods = data.methods ?? [];
        if (fetchedMethods.length) {
          setMethods(fetchedMethods);
          setSelectedMethod(fetchedMethods.find((method: Method) => method.enabled)?.id ?? "");
        } else {
          setMethods([]);
          setSelectedMethod("");
        }
        const savedForm = data.form ?? {};
        const mergedForm = Object.fromEntries(
          Object.keys(DEFAULT_CHECKOUT_FORM).map((key) => [
            key,
            { ...DEFAULT_CHECKOUT_FORM[key], ...(savedForm[key] ?? {}) },
          ]),
        );
        if (Object.keys(mergedForm).length) setForm(mergedForm);
        const nextShippingConfig = data.shippingConfig ?? null;
        setShippingConfig(nextShippingConfig);
        const nextOptions = nextShippingConfig?.options ?? [];
        if (nextOptions.length) setSelectedShipping(String(nextOptions[0].id ?? 0));
      })
      .catch(() => {
        setMethods([]);
        setSelectedMethod("");
      })
      .finally(() => setOptionsLoading(false));
  }, []);

  function recordCheckout(event: React.ChangeEvent<HTMLFormElement>) {
    if (!checkoutSessionId || !cart.length) return;
    const fd = new FormData(event.currentTarget);
    const details = Object.fromEntries(fd.entries());
    if (abandonTimer.current) clearTimeout(abandonTimer.current);
    abandonTimer.current = setTimeout(() => {
      fetch(apiUrl + "/api/checkout/abandoned", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
        body: JSON.stringify({ sessionId: checkoutSessionId, name: details.name, phone: details.phone, email: details.email, address: details.addressLine1, items: cart.map(({ name, qty, price }) => ({ name, qty, price })), total: totalAmount }) }).catch(() => {});
    }, 700);
  }

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const categoryIds = [...new Set(cart.flatMap((i) => i.categoryIds ?? [i.categoryId]))];
      const res = await fetch(apiUrl + "/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, subtotal, categoryIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Invalid coupon");

      setDiscountAmount(data.discount);
      setCouponId(data.id);
      toast.success(`Coupon applied! You saved ${money(data.discount)}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Coupon invalid");
      setDiscountAmount(0);
      setCouponId(null);
    } finally {
      setValidatingCoupon(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart.length) {
      toast.error("Your bag is empty");
      return;
    }
    if (!authenticated) {
      window.location.href = "/account?next=%2Fcheckout";
      return;
    }
    const enabledFields = Object.entries(form).filter(([, field]) => field.enabled);
    if (!enabledFields.length) {
      toast.error("Checkout form is not loaded. Please refresh and try again.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const nextErrors: Record<string, string> = {};
    for (const [key, field] of enabledFields) {
      const value = String(formData.get(key) ?? "").trim();
      if (field.required && !value) nextErrors[key] = `${field.label} is required.`;
      else if (key === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) nextErrors[key] = "Enter a valid email address.";
      else if (key === "phone" && value) {
        const digits = value.replace(/\D/g, "");
        if (!/^[+\d().\s-]+$/.test(value) || digits.length < 7 || digits.length > 15) nextErrors[key] = "Enter a valid phone number.";
      }
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const firstInvalid = Object.keys(nextErrors)[0];
      document.querySelector<HTMLInputElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    setSaving(true);
    const fd = formData;

    try {
      const response = await fetch(apiUrl + (selectedMethod === "STRIPE" ? "/api/checkout/stripe" : "/api/orders"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkoutSessionId,
          paymentMethod: selectedMethod,
          subtotal,
          shippingCharge: shipping,
          discountAmount: discountAmount || undefined,
          couponId: couponId || undefined,
          totalAmount,
          shippingDetails: {
            ...Object.fromEntries(
            enabledFields
              .map(([key]) => [key, fd.get(key)]),
            ),
            ...(shippingOptions.length ? { shippingOptionId: selectedShipping } : {}),
          },
          orderItems: cart.map((item) => ({
            productId: item.variationId ? item.id.split("__")[0] : item.id,
            name: item.name,
            qty: item.qty,
            price: item.price,
            categoryId: item.categoryId,
            variationId: item.variationId,
            sku: item.sku,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? data.error ?? "Order creation failed");

      if (selectedMethod === "STRIPE") {
        if (!data.url) throw new Error("Stripe checkout URL was not returned");
        window.location.href = data.url;
        return;
      }

      localStorage.removeItem("epic-cart");
      setCart([]);
      sessionStorage.setItem("epic-last-order", JSON.stringify(data));
      toast.success("Your order was placed successfully!");
      window.location.href = "/order-success";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not place the order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="checkout-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" className="brand">
          EPIC<span>.</span>
        </Link>
        <Link href="/" className="back-link" style={{ margin: 0 }}>
          <FiArrowLeft /> Return to Store
        </Link>
      </div>

      {optionsLoading ? (
        <CheckoutSkeleton />
      ) : (
      <div className="checkout-grid">
        {/* Left Column: Shipping & Payment Form */}
        <div className="checkout-card">
          <span className="eyebrow">
            <FiLock /> SECURE CHECKOUT
          </span>
          <h2>Shipping & Payment Details</h2>

          <form noValidate onSubmit={submit} onChange={recordCheckout} style={{ display: "grid", gap: "24px" }}>
            <p className="text-xs text-gray-500" role="note">If you leave checkout before placing your order, the contact details and cart you entered may be kept for up to 30 days so the store can follow up. This checkout record is removed automatically after 30 days.</p>
            <div className="form-grid">
              {Object.entries(form)
                .filter(([, field]) => field.enabled)
                .map(([key, field]) => (
                  <Input
                    key={key}
                    className={FIELD_META[key]?.full ? "full" : undefined}
                    {...(key === "email" ? { type: "email" } : {})}
                    name={key}
                    label={field.label}
                    placeholder={field.placeholder}
                    isRequired={Boolean(field.required)}
                    isInvalid={Boolean(fieldErrors[key])}
                    errorMessage={fieldErrors[key]}
                    onChange={() => {
                      if (fieldErrors[key]) setFieldErrors((current) => { const next = { ...current }; delete next[key]; return next; });
                    }}
                    startContent={FIELD_META[key]?.icon}
                    {...(["country", "state", "city", "postalCode"].includes(key) ? { value: shippingDetails[key] ?? "", onValueChange: (value: string) => setShippingDetails((current) => ({ ...current, [key]: value })) } : {})}
                  />
                ))}
            </div>

            {shippingOptions.length > 0 && (
              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "10px" }}>Shipping Method</label>
                <div className="payment-methods-grid">
                  {shippingOptions.map((option, index) => {
                    const id = String(option.id ?? index);
                    return <div key={id} className={`payment-card ${selectedShipping === id ? "selected" : ""}`} onClick={() => setSelectedShipping(id)}>
                      <FiMapPin /><span>{option.name} — {money(option.charge ?? 0)}</span>
                    </div>;
                  })}
                </div>
              </div>
            )}

            {/* Payment Method Selector */}
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "10px" }}>
                Select Payment Method
              </label>
              <div className="payment-methods-grid">
                {methods.map((method) => (
                  <div
                    key={method.id}
                    className={`payment-card ${selectedMethod === method.id ? "selected" : ""} ${method.enabled ? "" : "opacity-60 cursor-not-allowed"}`}
                    onClick={() => method.enabled && setSelectedMethod(method.id)}
                    aria-disabled={!method.enabled}
                  >
                    <FiCreditCard />
                    <span>{method.label}{method.note && <small className="block text-xs text-gray-500">{method.note}</small>}</span>
                  </div>
                ))}
              </div>
              {!methods.length && <p className="mt-3 text-sm text-rose-600">No payment methods are currently available. Please contact the store.</p>}
            </div>

            <Button
              type="submit"
              color="primary"
              size="lg"
              fullWidth
              isLoading={saving}
              isDisabled={!cart.length || !methods.length || !selectedMethod}
              className="font-bold shadow-lg mt-4"
            >
              Place Order — {money(totalAmount)}
            </Button>
          </form>
        </div>

        {/* Right Column: Order Summary Sidebar */}
        <aside className="order-summary">
          <h2>Order Summary</h2>

          {cart.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>Your bag is empty.</p>
          ) : (
            <div style={{ display: "grid", gap: "14px", marginBottom: "20px" }}>
              {cart.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.92rem",
                  }}
                >
                  <div>
                    <strong style={{ display: "block" }}>{item.name}</strong>
                    <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Qty: {item.qty}</span>
                  </div>
                  <span style={{ fontWeight: 700 }}>{money(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Coupon Code Field */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <Input
              placeholder="Promo / Coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              startContent={<FiTag />}
            />
            <Button
              variant="flat"
              color="primary"
              isLoading={validatingCoupon}
              onPress={applyCoupon}
              isDisabled={!couponCode.trim()}
            >
              Apply
            </Button>
          </div>

          <div className="summary-row">
            <span>Subtotal</span>
            <strong>{money(subtotal)}</strong>
          </div>

          {discountAmount > 0 && (
            <div className="summary-row" style={{ color: "#059669" }}>
              <span>Discount</span>
              <strong>- {money(discountAmount)}</strong>
            </div>
          )}

          <div className="summary-row">
            <span>{shippingOptions.length ? (shippingOptions.find((option, index) => String(option.id ?? index) === selectedShipping)?.name ?? "Shipping") : "Nationwide Delivery"}</span>
            <strong>{money(shipping)}</strong>
          </div>

          <div className="summary-row total">
            <span>Total Amount</span>
            <strong style={{ color: "var(--primary)" }}>{money(totalAmount)}</strong>
          </div>

          <div
            style={{
              marginTop: "24px",
              padding: "14px",
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "0.8rem",
              color: "var(--muted)",
            }}
          >
            <FiShield style={{ color: "#059669", fontSize: "1.3rem" }} />
            <span>Encrypted checkout. Your personal data is protected.</span>
          </div>
        </aside>
      </div>
      )}
    </main>
  );
}
