import { Suspense } from "react";
import { prisma } from "../../api/lib/prisma";
import { ShopView, type ShopViewProps } from "../../components/shop-view";
import { SiteFooter } from "../../components/store-footer";
import { fetchInternalJson } from "../../lib/internal-fetch";
import ShopLoading from "./loading";

export const dynamic = "force-dynamic";

type Products = NonNullable<ShopViewProps["initialProducts"]>;
type Categories = NonNullable<ShopViewProps["initialCategories"]>;
type Status = NonNullable<ShopViewProps["initialStatus"]>;

export default async function ShopPage() {
  let initialLayout: "classic" | "catalog" = "classic";

  const [products, categories, status] = await Promise.all([
    fetchInternalJson<Products>("/api/products"),
    fetchInternalJson<Categories>("/api/categories"),
    fetchInternalJson<Status>("/api/store/status"),
    (async () => {
      try {
        const config = await prisma.storeConfig.findUnique({
          where: { id: "store-config-singleton" },
          select: { homePageConfig: true },
        });
        const homeConfig = config?.homePageConfig as { layout?: "classic" | "catalog" } | null;
        if (homeConfig?.layout === "catalog") initialLayout = "catalog";
      } catch {
        /* fallback to classic */
      }
    })(),
  ]);

  if (status?.config?.homePageConfig?.layout === "catalog") initialLayout = "catalog";

  return (
    <>
      <Suspense fallback={<ShopLoading />}>
        <ShopView
          initialLayout={initialLayout}
          initialProducts={products ?? undefined}
          initialCategories={categories ?? undefined}
          initialStatus={status ?? undefined}
        />
      </Suspense>
      <SiteFooter initialStatus={status} initialCategories={categories} />
    </>
  );
}