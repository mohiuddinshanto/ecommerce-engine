"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
        <p className="text-5xl">⚠️</p>
        <h1 className="mt-4 text-xl font-bold text-slate-900">কিছু একটা ভুল হয়েছে</h1>
        <p className="mt-2 text-sm text-slate-500">পেজটি লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-[var(--color-primary,#4f46e5)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            আবার চেষ্টা করুন
          </button>
          <Link
            href="/"
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            হোমে ফিরুন
          </Link>
        </div>
      </div>
    </main>
  );
}
