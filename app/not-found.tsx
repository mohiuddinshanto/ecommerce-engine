import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
        <p className="text-6xl font-extrabold text-[var(--color-primary,#4f46e5)]">৪০৪</p>
        <h1 className="mt-4 text-xl font-bold text-slate-900">পেজটি খুঁজে পাওয়া যায়নি</h1>
        <p className="mt-2 text-sm text-slate-500">আপনি যে পেজটি খুঁজছেন সেটি নেই বা সরিয়ে ফেলা হয়েছে।</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-[var(--color-primary,#4f46e5)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            হোমে ফিরুন
          </Link>
          <Link
            href="/shop"
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            শপ দেখুন
          </Link>
        </div>
      </div>
    </main>
  );
}
