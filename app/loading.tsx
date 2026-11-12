export default function Loading() {
  return (
    <main className="min-h-[70vh] bg-slate-50" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-[1400px] px-[6vw] py-8">
        <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="aspect-[3/4] animate-pulse bg-slate-200" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
