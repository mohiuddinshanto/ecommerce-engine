import type { Metadata } from "next";
import { headers } from "next/headers";
import { cache } from "react";
import { prisma } from "../../../api/lib/prisma";
import { ProductView, type Product } from "../../../components/product-view";
import { SiteFooter } from "../../../components/store-footer";
import { fetchInternalJson } from "../../../lib/internal-fetch";
import { stripHtml } from "../../../lib/html";
import { productUrl } from "../../../lib/product-url";

export const dynamic = "force-dynamic";

type Status = { config?: Record<string, any> | null } | null;
type Categories = { name: string; slug: string; parentId?: string | null }[];

const loadProduct = cache(async (slug: string, productId?: string): Promise<Product | null> => {
  const include = {
    category: { select: { id: true, name: true, slug: true } },
    categoryLinks: { select: { categoryId: true, category: { select: { id: true, name: true, slug: true } } } },
    imagesDetails: { orderBy: { sortOrder: "asc" as const } },
    attributes: { include: { values: true }, orderBy: { createdAt: "asc" as const } },
    variations: {
      where: { status: "active" },
      include: { attributes: { include: { attribute: { select: { id: true, name: true } }, value: true } } },
      orderBy: { createdAt: "asc" as const },
    },
    reviews: { where: { isApproved: true }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" as const } },
  };
  const candidates = new Set([slug]);
  let decoded = slug;
  for (let pass = 0; pass < 2; pass++) {
    try { decoded = decodeURIComponent(decoded); candidates.add(decoded); } catch { break; }
  }
  for (const candidate of [...candidates]) {
    try { candidates.add(encodeURIComponent(candidate)); } catch {}
  }
  let found = productId ? await prisma.product.findUnique({ where: { id: productId }, include }) : null;
  for (const candidate of candidates) {
    if (found) break;
    found = await prisma.product.findUnique({ where: { slug: candidate }, include });
  }
  if (!found) {
    found = await prisma.product.findFirst({ where: { name: { equals: decoded }, isActive: true }, include, orderBy: { createdAt: "desc" } });
  }
  return found?.isActive ? found as unknown as Product : null;
});

async function requestOrigin() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim() || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() || (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ productId?: string | string[] }> }): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const productId = Array.isArray(query.productId) ? query.productId[0] : query.productId;
  const [product, status, origin] = await Promise.all([
    loadProduct(slug, productId),
    fetchInternalJson<Status>("/api/store/status"),
    requestOrigin(),
  ]);
  if (!product) return { title: "Product not found", robots: { index: false, follow: false } };

  const storeName = String(status?.config?.storeName || "Online Store");
  const title = product.seoTitle?.trim() || `${product.name} | ${storeName}`;
  const description = product.seoDescription?.trim() || stripHtml(product.description).replace(/\s+/g, " ").slice(0, 155) || `Shop ${product.name} from ${storeName}.`;
  const url = new URL(productUrl(product.slug, product.name, product.id), origin);
  const image = product.images?.[0];

  return {
    metadataBase: new URL(origin),
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: storeName,
      ...(image ? { images: [{ url: image, alt: product.name }] } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ productId?: string | string[] }> }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const productId = Array.isArray(query.productId) ? query.productId[0] : query.productId;
  const [data, status, categories] = await Promise.all([
    loadProduct(slug, productId),
    fetchInternalJson<Status>("/api/store/status"),
    fetchInternalJson<Categories>("/api/categories"),
  ]);
  const origin = await requestOrigin();
  const storeName = String(status?.config?.storeName || "Online Store");
  const productSchema = data ? {
    "@context": "https://schema.org",
    "@type": "Product",
    name: data.name,
    description: data.seoDescription?.trim() || stripHtml(data.description).replace(/\s+/g, " ").slice(0, 500),
    sku: data.sku || undefined,
    category: data.category.name,
    image: data.images.map((image) => new URL(image, origin).toString()),
    url: new URL(productUrl(data.slug, data.name, data.id), origin).toString(),
    brand: { "@type": "Brand", name: storeName },
    offers: {
      "@type": "Offer",
      url: new URL(productUrl(data.slug, data.name, data.id), origin).toString(),
      priceCurrency: "BDT",
      price: data.salePrice && Number(data.salePrice) < Number(data.price) ? data.salePrice : data.price,
      availability: data.manageStock === false || data.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(data.reviews?.length ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: data.reviews.reduce((sum, review) => sum + review.rating, 0) / data.reviews.length,
        reviewCount: data.reviews.length,
      },
    } : {}),
  } : null;
  return (
    <>
      {productSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema).replace(/</g, "\\u003c") }} />}
      <ProductView
        key={data?.id ?? slug}
        slug={data?.slug ?? slug}
        initialProduct={data}
        contactOptions={{
          callEnabled: status?.config?.featureFlags?.productCallButton === true,
          whatsappEnabled: status?.config?.featureFlags?.productWhatsappButton === true,
          phone: status?.config?.chatConfig?.phone,
          whatsapp: status?.config?.chatConfig?.whatsapp?.number,
          template: status?.config?.chatConfig?.whatsapp?.template,
        }}
      />
      <SiteFooter initialStatus={status} initialCategories={categories} />
    </>
  );
}
