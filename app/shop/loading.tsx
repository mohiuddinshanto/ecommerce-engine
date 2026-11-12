import { ProductGridSkeleton, Skeleton } from "../../components/skeletons";

export default function ShopLoading() {
  return (
    <main className="min-h-[70vh] bg-slate-50" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-[1400px] px-[6vw] py-8">
        <Skeleton className="h-8 w-48" />
        <div className="mb-6 mt-4 flex gap-3">
          <Skeleton className="h-10 w-40 rounded-full" />
          <Skeleton className="h-10 w-40 rounded-full" />
          <Skeleton className="h-10 w-40 rounded-full" />
        </div>
        <ProductGridSkeleton count={9} className="lg:grid-cols-4" />
      </div>
    </main>
  );
}
