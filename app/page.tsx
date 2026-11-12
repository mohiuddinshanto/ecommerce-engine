import type { ComponentProps } from "react";
import { prisma } from "../api/lib/prisma";
import { Storefront, type HomePageConfig } from "../components/storefront";
import { fetchInternalJson } from "../lib/internal-fetch";

export const dynamic = "force-dynamic";

type StorefrontProps = NonNullable<ComponentProps<typeof Storefront>>;

export default async function Home() {
  const [products, categories, status, homeConfigResult] = await Promise.all([
    fetchInternalJson<NonNullable<StorefrontProps["initialProducts"]>>("/api/products?home=1"),
    fetchInternalJson<NonNullable<StorefrontProps["initialCategories"]>>("/api/categories"),
    fetchInternalJson<NonNullable<StorefrontProps["initialStatus"]>>("/api/store/status"),
    (async (): Promise<HomePageConfig | null> => {
      try {
        const config = await prisma.storeConfig.findUnique({
          where: { id: "store-config-singleton" },
          select: { homePageConfig: true },
        });
        return (config?.homePageConfig ?? null) as HomePageConfig | null;
      } catch {
        return null;
      }
    })(),
  ]);

  const initialHomeConfig = homeConfigResult;
  const initialLayout: "classic" | "catalog" =
    initialHomeConfig?.layout === "catalog" || status?.config?.homePageConfig?.layout === "catalog" ? "catalog" : "classic";

  return (
    <Storefront
      initialLayout={initialLayout}
      initialHomeConfig={initialHomeConfig}
      initialProducts={products ?? undefined}
      initialCategories={categories ?? undefined}
      initialStatus={status ?? undefined}
    />
  );
}