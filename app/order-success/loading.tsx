import { Skeleton } from "../../components/skeletons";

export default function OrderSuccessLoading() {
  return (
    <main className="order-success-page" aria-busy="true" aria-live="polite">
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
