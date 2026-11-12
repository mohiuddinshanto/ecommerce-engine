export default function ProductLoading() {
  return (
    <main className="min-h-[70vh] bg-white" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-[1400px] px-[6vw] py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-3xl bg-slate-200" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-6 w-1/3 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-24 w-full animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-12 w-48 animate-pulse rounded-full bg-slate-200" />
          </div>
        </div>
      </div>
    </main>
  );
}
