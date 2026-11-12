import { CategoryView, type CategoryViewProps } from "../../../components/category-view";
import { SiteFooter } from "../../../components/store-footer";
import { fetchInternalJson } from "../../../lib/internal-fetch";

export const dynamic = "force-dynamic";

type Products = NonNullable<CategoryViewProps["initialProducts"]>;
type Categories = NonNullable<CategoryViewProps["initialCategories"]>;
type Status = NonNullable<CategoryViewProps["initialStatus"]>;

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [products, categories, status] = await Promise.all([
    fetchInternalJson<Products>(`/api/products?category=${encodeURIComponent(slug)}`),
    fetchInternalJson<Categories>("/api/categories"),
    fetchInternalJson<Status>("/api/store/status"),
  ]);
  return (
    <>
      <CategoryView
        key={slug}
        slug={slug}
        initialProducts={products ?? undefined}
        initialCategories={categories ?? undefined}
        initialStatus={status ?? undefined}
      />
      <SiteFooter initialStatus={status} initialCategories={categories} />
    </>
  );
}