"use client";
import { formatMoney } from "../api/lib/money";

import { ProductImage } from "./product-image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CarouselSlider } from "./carousel-slider";
import { productUrl } from "../lib/product-url";

const FALLBACK_IMG = "/product-placeholder.svg";

type RelatedProduct = {
  id: string;
  slug: string;
  name: string;
  price: string;
  salePrice: string | null;
  images: string[];
  category: { name: string; slug: string };
};

const money = formatMoney;

function RelatedCard({ p }: { p: RelatedProduct }) {
  const hasSale = Boolean(p.salePrice && Number(p.salePrice) < Number(p.price));
  const discountPercent = hasSale ? Math.round(((Number(p.price) - Number(p.salePrice)) / Number(p.price)) * 100) : 0;
  return (
    <article className="group h-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
      <Link href={productUrl(p.slug, p.name, p.id)} className="relative block aspect-[3/4] overflow-hidden bg-slate-100">
        <ProductImage
          src={p.images[0] || FALLBACK_IMG}
          alt={p.name}
          fill
          sizes="(max-width: 640px) 60vw, 280px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {hasSale && (
          <span className="absolute left-3 top-3 rounded-full border border-rose-500/30 bg-rose-500/90 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white backdrop-blur-md">
            {discountPercent}% off
          </span>
        )}
      </Link>
      <div className="space-y-1.5 p-4">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-lg font-bold text-primary">{money(hasSale ? p.salePrice! : p.price)}</span>
          {hasSale && <span className="text-sm text-slate-400 line-through">{money(p.price)}</span>}
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-primary">{p.name}</h3>
        <span className="block text-xs font-medium text-slate-500">{p.category.name}</span>
      </div>
    </article>
  );
}

export function RelatedProducts({ productId, categorySlug }: { productId: string; categorySlug: string }) {
  const [items, setItems] = useState<RelatedProduct[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`/api/products?category=${encodeURIComponent(categorySlug)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: RelatedProduct[]) => {
        if (!active || !Array.isArray(data)) return;
        setItems(data.filter((p) => p.id !== productId).slice(0, 12));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [productId, categorySlug]);

  if (items.length === 0) return null;

  return (
    <section style={{ marginTop: "60px", paddingTop: "40px", borderTop: "1px solid var(--border)" }}>
      <div style={{ marginBottom: "20px" }}>
        <span className="eyebrow">You may also like</span>
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "1.8rem", margin: "4px 0 0" }}>Related products</h2>
      </div>
      <CarouselSlider
        items={items.map((p) => <RelatedCard key={p.id} p={p} />)}
        seconds={5}
        auto={false}
        perView={{ mobile: 1.3, tablet: 2.3, desktop: 4 }}
        pagination={false}
        loop={false}
        spaceBetween={16}
        ariaLabel="Related products"
      />
    </section>
  );
}
