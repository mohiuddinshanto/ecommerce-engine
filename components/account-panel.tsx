"use client";
import { formatMoney } from "../api/lib/money";

import { Button, Input, Tab, Tabs } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AccountSkeleton } from "./skeletons";
import { productUrl } from "../lib/product-url";
import {
  FiArrowLeft,
  FiCalendar,
  FiEye,
  FiEyeOff,
  FiHeart,
  FiLock,
  FiLogOut,
  FiMail,
  FiPackage,
  FiShoppingBag,
  FiTrash2,
  FiUser,
} from "react-icons/fi";

const money = formatMoney;
const apiUrl = "";

type User = { id: string; name: string; email: string; role: string; emailVerified?: boolean };
type Order = { id: string; status: string; totalAmount: string; createdAt: string };
type WishlistItem = {
  id: string;
  product: {
    id: string;
    slug: string;
    name: string;
    price: string;
    salePrice: string | null;
    images: string[];
    category: { name: string; slug: string };
  };
};

const request = (path: string) => fetch(apiUrl + path);


function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

const ORDER_LABEL: Record<string, string> = {
  IN_COURIER: "In Courier",
};

function StatusChip({ status }: { status: string }) {
  const s = status.toLowerCase();
  const palette =
    s === "paid" || s === "completed" || s === "delivered"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/25"
      : s === "cancelled" || s === "failed" || s === "refunded"
        ? "bg-rose-500/10 text-rose-600 border-rose-500/25"
        : s === "pending"
          ? "bg-amber-500/10 text-amber-600 border-amber-500/25"
          : "bg-slate-500/10 text-slate-600 border-slate-400/25";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${palette}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {ORDER_LABEL[status] ?? status}
    </span>
  );
}

export function AccountPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [checking, setChecking] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  const [resending, setResending] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");

  async function resendVerification() {
    setResending(true);
    try {
      const response = await fetch(apiUrl + "/api/auth/resend-verification", { method: "POST" });
      if (!response.ok) throw new Error();
      toast.success("Verification email sent.");
    } catch {
      toast.error("Could not send the verification email.");
    } finally {
      setResending(false);
    }
  }

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(apiUrl + "/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      return toast.error(result.error ?? "Could not send reset link");
    }
    toast.success("If this email is registered, a reset link has been sent.");
    setShowForgot(false);
  }

  useEffect(() => {
    load().finally(() => setChecking(false));
  }, []);

  async function load() {
    const response = await request("/api/auth/me");
    if (!response.ok) return;
    const result = await response.json();
    setUser(result.user);

    const [history, wishRes] = await Promise.all([
      request("/api/account/orders"),
      request("/api/wishlist"),
    ]);

    if (history.ok) {
      const data = await history.json();
      if (Array.isArray(data)) setOrders(data);
    }

    if (wishRes.ok) {
      const wishData = await wishRes.json();
      if (Array.isArray(wishData)) setWishlist(wishData);
    }
  }

  async function removeFromWishlist(productId: string) {
    await fetch(`${apiUrl}/api/wishlist/${productId}`, { method: "POST" });
    setWishlist((prev) => prev.filter((item) => item.product.id !== productId));
    toast.success("Removed from your wishlist.");
  }

  async function submit(event: FormEvent<HTMLFormElement>, mode: "sign-in" | "sign-up") {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      email: form.get("email"),
      password: form.get("password"),
      ...(mode === "sign-up" ? { name: form.get("name") } : {}),
    };

    const response = await fetch(apiUrl + "/api/auth/" + mode, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) return toast.error(result.error ?? "Unable to continue");
    if (result.user?.role === "REVIEWER") {
      await fetch(apiUrl + "/api/auth/sign-out", { method: "POST" }).catch(() => {});
      return toast.error("This read-only demo account signs in at /admin.");
    }

    if (mode === "sign-in" || mode === "sign-up") {
      try {
        const local = JSON.parse(localStorage.getItem("epic-cart") ?? "[]") as Array<{ id: string; qty: number }>;
        const failed: typeof local = [];
        for (const item of local) {
          const [productId, variationId] = item.id.split("__");
          if (productId && Number.isInteger(item.qty) && item.qty > 0) {
            const merged = await fetch(apiUrl + "/api/cart/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, variationId: variationId || undefined, quantity: item.qty }) });
            if (!merged.ok) failed.push(item);
          }
        }
        if (failed.length) localStorage.setItem("epic-cart", JSON.stringify(failed));
        else localStorage.removeItem("epic-cart");
      } catch {}
    }

    await load();
    toast.success(mode === "sign-in" ? "Welcome back!" : "Account created successfully!");
    const next = new URLSearchParams(window.location.search).get("next");
    if (next?.startsWith("/")) window.location.href = next;
  }

  function signOut() {
    fetch(apiUrl + "/api/auth/sign-out", { method: "POST" }).catch(() => {});
    setUser(null);
    setOrders([]);
    setWishlist([]);
    toast.success("You have signed out.");
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const newPassword = form.get("newPassword");
    if (newPassword !== form.get("confirmPassword")) return toast.error("Enter the same new password twice.");
    const response = await fetch(apiUrl + "/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return toast.error(result.error ?? "Could not change your password.");
    formEl.reset();
    toast.success("Password changed. Other devices have been signed out.");
  }

  if (checking) {
    return <AccountSkeleton />;
  }

  if (!user) {
    return (
      <main className="account-auth relative min-h-[80vh] overflow-hidden px-6 py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-[-12%] h-96 w-96 rounded-full bg-gradient-to-br from-primary/15 to-cyan/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-15%] left-[-10%] h-80 w-80 rounded-full bg-gradient-to-tr from-indigo-500/10 to-cyan/10 blur-3xl"
        />

        <div className="relative mx-auto w-full max-w-[460px]">
          <div className="mb-7 flex items-center justify-between">
            <Link href="/" className="brand">
              EPIC<span>.</span>
            </Link>
            <Link href="/" className="back-link" style={{ margin: 0 }}>
              <FiArrowLeft /> Return to store
            </Link>
          </div>

          <div className="account-auth-card overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-xl shadow-slate-900/10 glass">
            <div className="account-auth-hero relative bg-gradient-to-br from-primary via-indigo-600 to-cyan px-8 py-9 text-white">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide backdrop-blur-sm">
                <FiUser size={12} /> Customer account
              </span>
              <h1 className="font-display mt-4 text-3xl font-extrabold tracking-tight">
                <span>Welcome.</span> Sign in to continue.
              </h1>
              <div aria-hidden className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
            </div>

            <div className="account-auth-content px-7 py-7 sm:px-9">
              {showForgot ? (
                <form onSubmit={requestReset} className="flex flex-col gap-4">
                  <p className="text-sm text-slate-500">
                    Enter your email and we will send you a reset link.
                  </p>
                  <Input name="email" type="email" label="Email" placeholder="you@example.com" isRequired startContent={<FiMail />} />
                  <Button type="submit" color="primary" size="lg" radius="full" className="mt-1 font-display text-sm font-bold tracking-wide">
                    Send link
                  </Button>
                  <button type="button" onClick={() => setShowForgot(false)} className="text-xs font-semibold text-slate-400 hover:text-primary">
                    Back
                  </button>
                </form>
              ) : (
                <>
                  <div className="account-auth-tabs" role="tablist" aria-label="Account">
                    <button type="button" role="tab" aria-selected={authMode === "sign-in"} onClick={() => setAuthMode("sign-in")}>Sign in</button>
                    <button type="button" role="tab" aria-selected={authMode === "sign-up"} onClick={() => setAuthMode("sign-up")}>Create account</button>
                  </div>
                  <AccountForm mode={authMode} submit={submit} />
                  {authMode === "sign-in" && (
                    <p className="mt-4 text-center text-xs text-slate-500">Reviewer demo access? <Link href="/admin" className="font-semibold text-primary hover:underline">Open admin sign-in</Link></p>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="mt-4 w-full text-center text-xs font-semibold text-slate-400 hover:text-primary"
                  >
                    Forgot password?
                  </button>
                </>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-xs tracking-widest text-slate-400">
            Customer&nbsp;account
          </p>
        </div>
      </main>
    );
  }

  const firstName = user.name.trim().split(/\s+/)[0] ?? "";

  return (
    <main className="mx-auto max-w-[1400px] px-[6vw] py-10">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="brand">
          {user.name}
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
          >
            <FiShoppingBag /> Continue shopping
          </Link>
          <Button size="sm" variant="light" color="danger" onPress={signOut} radius="full">
            <FiLogOut /> Sign out
          </Button>
        </div>
      </header>

      {user.emailVerified === false && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <span className="flex items-center gap-2">
            <FiMail size={16} /> Your email is not verified yet. Click the link in your inbox to verify it.
          </span>
          <Button size="sm" color="warning" variant="flat" radius="full" onPress={resendVerification} isLoading={resending}>
            Resend email
          </Button>
        </div>
      )}

      <section className="relative mb-10 overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 shadow-sm sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-primary/12 to-cyan/12 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-cyan font-display text-2xl font-extrabold text-white shadow-lg shadow-indigo-500/30">
            {initials(user.name)}
          </div>
          <div className="min-w-[220px] flex-1">
            <span className="eyebrow mb-2">Account dashboard</span>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Hello, {firstName} <span className="gradient-text">👋</span>
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
              <FiMail size={14} /> {user.email}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3 text-center">
              <div className="font-display text-2xl font-extrabold text-slate-900">{orders.length}</div>
              <div className="text-xs uppercase tracking-widest text-slate-400">Orders</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3 text-center">
              <div className="font-display text-2xl font-extrabold text-slate-900">{wishlist.length}</div>
              <div className="text-xs uppercase tracking-widest text-slate-400">Saved items</div>
            </div>
          </div>
        </div>
      </section>

      <Tabs aria-label="Customer Dashboard" color="primary" variant="underlined" size="lg">
        <Tab
          key="orders"
          title={
            <span className="flex items-center gap-2">
              <FiPackage /> Order history
            </span>
          }
        >
          <section className="pt-6">
            {orders.length ? (
              <div className="grid gap-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary/10 to-cyan/10 text-primary">
                        <FiCalendar size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </div>
                        <div className="text-sm text-slate-400">
                          {new Date(order.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <StatusChip status={order.status} />
                      <div className="font-display text-xl font-extrabold text-slate-900">
                        {money(order.totalAmount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-16 text-center">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
                  <FiPackage size={24} />
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900">No orders yet</h3>
                <p className="muted mt-1">Your orders will appear here after you place one.</p>
                <Link
                  href="/#categories"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40"
                >
                  Browse the collection →
                </Link>
              </div>
            )}
          </section>
        </Tab>

        <Tab
          key="wishlist"
          title={
            <span className="flex items-center gap-2">
              <FiHeart /> Saved items
            </span>
          }
        >
          <section className="pt-6">
            {!wishlist.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-16 text-center">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
                  <FiHeart size={24} />
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900">Nothing saved yet</h3>
                <p className="muted mt-1">Tap the heart on any product to save it here.</p>
                <Link
                  href="/#categories"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40"
                >
                  Browse products →
                </Link>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {wishlist.map((item) => (
                  <div
                    key={item.id}
                    className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-primary/25 hover:shadow-md"
                  >
                    <Link
                      href={productUrl(item.product.slug, item.product.name, item.product.id)}
                      className="relative block aspect-[4/3] overflow-hidden bg-slate-100"
                    >
                      <Image
                        src={
                          item.product.images[0] ||
                          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80"
                        }
                        alt={item.product.name}
                        fill
                        sizes="(max-width: 650px) 100vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </Link>
                    <div className="p-4">
                      <div className="text-xs font-medium text-slate-500">
                        {item.product.category.name}
                      </div>
                      <Link
                        href={productUrl(item.product.slug, item.product.name, item.product.id)}
                        className="mt-1 block text-sm font-semibold text-slate-900 hover:text-primary"
                      >
                        {item.product.name}
                      </Link>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="font-display text-lg font-extrabold text-slate-900">
                          {money(item.product.salePrice ?? item.product.price)}
                        </div>
                        <Button
                          size="sm"
                          color="danger"
                          variant="flat"
                          radius="full"
                          onPress={() => removeFromWishlist(item.product.id)}
                        >
                          <FiTrash2 /> Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </Tab>

        <Tab
          key="security"
          title={
            <span className="flex items-center gap-2">
              <FiLock /> Security
            </span>
          }
        >
          <section className="pt-6">
            <form
              onSubmit={changePassword}
              className="mx-auto flex max-w-md flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
            >
              <h3 className="font-display text-lg font-bold text-slate-900">Change password</h3>
              <p className="muted text-sm">Changing your password signs out other devices.</p>
              <Input name="currentPassword" type="password" label="Current password" isRequired startContent={<FiLock />} />
              <Input name="newPassword" type="password" label="New password" minLength={8} isRequired startContent={<FiLock />} />
              <Input name="confirmPassword" type="password" label="Confirm new password" minLength={8} isRequired startContent={<FiLock />} />
              <Button type="submit" color="primary" radius="full" className="mt-2 font-display text-sm font-bold tracking-wide">
                Save password
              </Button>
            </form>
          </section>
        </Tab>
      </Tabs>
    </main>
  );
}

function AccountForm({
  mode,
  submit,
}: {
  mode: "sign-in" | "sign-up";
  submit: (event: FormEvent<HTMLFormElement>, mode: "sign-in" | "sign-up") => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form
      onSubmit={(event) => submit(event, mode)}
      className="account-form flex flex-col gap-4"
    >
      {mode === "sign-up" && (
        <Input name="name" label="Full name" placeholder="Rahim Ahmed" isRequired startContent={<FiUser />} />
      )}
      <Input name="email" type="email" label="Email" placeholder="you@example.com" isRequired startContent={<FiMail />} />
      <Input
        name="password"
        type={showPassword ? "text" : "password"}
        label="Password"
        placeholder="••••••••"
        minLength={8}
        isRequired
        startContent={<FiLock />}
        endContent={
          <button
            type="button"
            className="account-password-toggle"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
          </button>
        }
      />

      <Button
        type="submit"
        color="primary"
        size="lg"
        radius="full"
        className="mt-2 font-display text-sm font-bold tracking-wide"
      >
        {mode === "sign-in" ? "Sign In" : "Create Account"}
      </Button>
    </form>
  );
}

