import type { CSSProperties } from "react";

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cx("animate-pulse rounded-md bg-slate-200", className)} style={style} />;
}

export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cx("overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm", className)}>
      <div className="aspect-[3/4] animate-pulse bg-slate-200" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cx("grid grid-cols-2 gap-3 sm:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <main className="mx-auto max-w-[1400px] px-[6vw] py-10" aria-busy="true" aria-live="polite">
      <Skeleton className="h-4 w-40" />
      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="aspect-square animate-pulse rounded-3xl bg-slate-200" />
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 w-16 animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-40" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-12 w-32 rounded-full" />
            <Skeleton className="h-12 w-32 rounded-full" />
          </div>
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    </main>
  );
}

export function ListRowSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        {Array.from({ length: Math.max(0, lines - 1) }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-1/3" />
        ))}
      </div>
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
      <div className="flex gap-4 border-b border-gray-100 bg-gray-50 px-5 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-gray-50 px-5 py-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cx("h-4 flex-1", c === 0 && "max-w-[40%]")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5">
          <Skeleton className="mb-3 h-10 w-10 rounded-xl" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px] px-[6vw] py-8" aria-busy="true" aria-live="polite">
      <div className="mb-10 h-52 w-full animate-pulse rounded-3xl bg-slate-200 sm:h-72" />
      <div className="mb-5 flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-24" />
      </div>
      <ProductGridSkeleton count={8} className="lg:grid-cols-4" />
    </div>
  );
}

export function AccountSkeleton() {
  return (
    <main className="mx-auto max-w-[1400px] px-[6vw] py-10" aria-busy="true" aria-live="polite">
      <div className="mb-10 flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <Skeleton className="mb-6 h-10 w-72 max-w-full rounded-full" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ListRowSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}

export function CheckoutSkeleton() {
  return (
    <div className="checkout-grid" aria-busy="true" aria-live="polite">
      <div className="checkout-card">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-3 h-7 w-64" />
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-6 h-12 w-full rounded-xl" />
      </div>
      <aside className="order-summary">
        <Skeleton className="h-6 w-40" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-6 h-11 w-full rounded-xl" />
        <Skeleton className="mt-6 h-12 w-full rounded-xl" />
      </aside>
    </div>
  );
}

export function AdminSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-6" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <StatCardSkeleton />
        <TableSkeleton rows={5} cols={4} />
      </div>
    </div>
  );
}
