"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FiArrowRight, FiGrid, FiHome, FiShoppingBag, FiUser } from "react-icons/fi";
import { getStoreStatus } from "../lib/store-status";

const money = (value: number) => "৳ " + (Number(value) || 0).toLocaleString("en-BD");

function readCart(): { count: number; total: number } {
  try {
    const items = JSON.parse(localStorage.getItem("epic-cart") ?? "[]") as Array<{ qty?: number; price?: number }>;
    return {
      count: items.reduce((s, i) => s + (Number(i.qty) || 1), 0),
      total: items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0),
    };
  } catch {
    return { count: 0, total: 0 };
  }
}

export function StoreBottomNav() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let alive = true;
    getStoreStatus()
      .then((s) => {
        if (alive) {
          setEnabled(s?.config?.featureFlags?.bottomNav !== false);
          setReady(true);
        }
      })
      .catch(() => {
        if (alive) {
          setEnabled(true);
          setReady(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const update = () => {
      const c = readCart();
      setCount(c.count);
      setTotal(c.total);
    };
    update();
    const id = window.setInterval(update, 1500);
    window.addEventListener("storage", update);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("storage", update);
    };
  }, []);

  const hiddenRoute = pathname?.startsWith("/admin") || pathname?.startsWith("/onboarding");
  const showBar = ready && !hiddenRoute && enabled;

  useEffect(() => {
    const cls = "has-store-bottom-nav";
    if (showBar) document.body.classList.add(cls);
    else document.body.classList.remove(cls);
    return () => document.body.classList.remove(cls);
  }, [showBar]);

  if (!showBar) return null;

  return (
    <>
      {count > 0 && (
        <Link
          href="/checkout"
          prefetch
          className="fixed bottom-[76px] right-3 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/30 active:scale-[0.98] md:hidden"
        >
          <FiShoppingBag size={14} /> ব্যাগ দেখুন · {money(total)}{" "}
          <FiArrowRight size={14} />
        </Link>
      )}
      <nav
        className="store-bottom-nav fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-lg px-1 pt-1.5 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] md:hidden"
        style={{ paddingBottom: "calc(4px + env(safe-area-inset-bottom, 0px))" }}
        aria-label="Quick navigation"
      >
        <div className="grid grid-cols-4">
          <Link
            href="/"
            prefetch
            className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] font-semibold ${pathname === "/" ? "text-[var(--primary)]" : "text-slate-500"}`}
          >
            <FiHome className="text-base" /> হোম
          </Link>
          <Link
            href="/shop"
            prefetch
            className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] font-semibold ${pathname === "/shop" ? "text-[var(--primary)]" : "text-slate-500"}`}
          >
            <FiGrid className="text-base" /> শপ
          </Link>
          <Link href="/checkout" prefetch className="relative flex flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] font-semibold text-slate-500">
            <span className="relative">
              <FiShoppingBag className="text-base" />
              {count > 0 && (
                <span className="absolute -right-2 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-[var(--primary)] text-[9px] font-bold text-white">
                  {count}
                </span>
              )}
            </span>
            ব্যাগ
          </Link>
          <Link href="/account" prefetch className="flex flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] font-semibold text-slate-500">
            <FiUser className="text-base" /> প্রোফাইল
          </Link>
        </div>
      </nav>
    </>
  );
}