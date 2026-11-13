"use client";
import { formatMoney } from "../api/lib/money";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ProductImage } from "./product-image";
import { productUrl } from "../lib/product-url";
import toast from "react-hot-toast";
import { FiChevronLeft, FiChevronRight, FiShoppingBag, FiArrowRight, FiCheck, FiTruck, FiRefreshCw, FiShield, FiMessageCircle, FiClock, FiStar, FiHeadphones } from "react-icons/fi";
import type { IconType } from "react-icons";

const ICON_MAP: Record<string, IconType> = {
  shield: FiShield,
  truck: FiTruck,
  refresh: FiRefreshCw,
  check: FiCheck,
  clock: FiClock,
  star: FiStar,
  headset: FiHeadphones,
  chat: FiMessageCircle,
};
import { CarouselSlider } from "./carousel-slider";

const money = formatMoney;

const FALLBACK =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80";

type Product = {
  id: string;
  slug: string;
  name: string;
  price: string;
  salePrice: string | null;
  description?: string;
  images: string[];
  categoryId: string;
  categoryLinks?: { categoryId: string }[];
  productType?: string;
  category: { id?: string; name: string; slug: string };
  attributes?: { id: string; name: string; values: { id: string; value: string }[] }[];
  variations?: {
    id: string;
    name: string;
    sku: string | null;
    price: number;
    salePrice: number | null;
    stock: number;
    image: string | null;
    attributes: { attributeId: string; valueId: string; value: { value: string } }[];
  }[];
};

type Variation = NonNullable<Product["variations"]>[number];

type Category = { id: string; name: string; slug: string; image?: string | null; parentId?: string | null; createdAt?: string; subCategories?: Category[] };

type HeroSlide = {
  id: string;
  image: string;
  badge: string | null;
  title: string | null;
  accent: string | null;
  cardLabel?: string | null;
  cardText?: string | null;
  cardLink?: string | null;
  subtitle: string | null;
  buttonLabel: string | null;
  buttonLink: string | null;
  secondaryLabel: string | null;
  secondaryLink: string | null;
};

const scrollToId = (link: string) => document.getElementById(link.replace(/^#/, ""))?.scrollIntoView({ behavior: "smooth" });

const CTA = ({ label, href, primary }: { label: string; href?: string; primary?: boolean }) => {
  const text = label || (primary ? "Shop now" : "View collection");
  const base = primary
    ? "inline-flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold px-6 py-3 rounded-full text-sm transition shadow-lg shadow-black/10 hover:shadow-xl active:scale-[.98]"
    : "inline-flex items-center gap-2 border border-white/25 bg-white/10 hover:bg-white/15 text-white font-semibold px-5 py-3 rounded-full text-sm transition backdrop-blur-sm active:scale-[.98]";
  if (href) {
    if (href.startsWith("#")) return <button className={base} onClick={() => scrollToId(href)}>{text} <FiArrowRight size={14} /></button>;
    const isExternal = /^https?:/.test(href);
    return <Link href={href} className={base} target={isExternal ? "_blank" : undefined}>{text} <FiArrowRight size={14} /></Link>;
  }
  return <button className={base} onClick={() => scrollToId("#shop")}>{text} <FiArrowRight size={14} /></button>;
};

export function CatalogCard({
  p,
  allowAddToCart,
  add,
  buyNow,
  whatsapp,
  fill,
}: {
  p: Product;
  allowAddToCart: boolean;
  add: (p: Product, variation?: Variation) => void;
  buyNow: (p: Product, variation?: Variation) => void;
  whatsapp: string | null;
  fill?: boolean;
}) {
  const img = p.images?.[0] || FALLBACK;
  const hasSale = Boolean(p.salePrice && Number(p.salePrice) < Number(p.price));
  const salePrice = hasSale ? Number(p.salePrice) : null;
  const price = Number(p.price);
  const discountPercent = hasSale ? Math.round(((price - salePrice!) / price) * 100) : 0;
  const isVariable = p.productType === "VARIABLE" && (p.variations?.length ?? 0) > 0;
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const sizeAttr = (p.attributes ?? []).find((a) => /size/i.test(a.name));
  const sizes = sizeAttr?.values.map((v) => v.value) ?? [];

  const selectedVariation = isVariable && selectedSize
    ? (p.variations ?? []).find((v) =>
        v.attributes.some(
          (va) => /size/i.test(sizeAttr?.name ?? "") && va.value.value === selectedSize
        )
      )
    : null;

  const displayPrice = selectedVariation
    ? (selectedVariation.salePrice && selectedVariation.salePrice < selectedVariation.price)
      ? selectedVariation.salePrice
      : selectedVariation.price
    : (salePrice ?? price);
  const displayOriginal = selectedVariation
    ? (selectedVariation.salePrice && selectedVariation.salePrice < selectedVariation.price)
      ? selectedVariation.price
      : null
    : (hasSale ? price : null);

  const handleAddToCart = () => {
    if (!allowAddToCart) return;
    if (isVariable) {
      if (selectedVariation) {
        if (selectedVariation.stock <= 0) { toast.error("This size is out of stock."); return; }
        add(p, selectedVariation);
      } else if (sizes.length > 0) {
        toast.error("Please select a size first.");
      } else {
        add(p);
      }
    } else {
      add(p);
    }
  };

  const handleBuyNow = () => {
    if (isVariable) {
      if (selectedVariation) {
        if (selectedVariation.stock <= 0) { toast.error("This size is out of stock."); return; }
        buyNow(p, selectedVariation);
      } else if (sizes.length > 0) {
        toast.error("Please select a size first.");
      } else {
        buyNow(p);
      }
    } else {
      buyNow(p);
    }
  };

  const waHref = whatsapp
    ? `${whatsapp}?text=${encodeURIComponent(`Hello, I would like ${p.name}${selectedSize ? ` (Size: ${selectedSize})` : ""} (${money(displayPrice)}).` )}`
    : null;

  return (
    <div className={`flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-2.5 shadow-sm transition-transform duration-300 hover:shadow-xl sm:p-3 ${fill ? "h-full w-full" : "w-[270px] min-w-[270px] sm:w-[290px] sm:min-w-[290px] max-w-[290px]"}`}>
      <div>
        <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-xl bg-gray-100 group">
          <span className="absolute left-2.5 top-2.5 z-10 rounded bg-white/90 px-2.5 py-0.5 text-xs font-medium text-gray-800 shadow-sm backdrop-blur-sm">
            {p.category.name}
          </span>
          {hasSale && (
            <span className="absolute right-2.5 top-2.5 z-10 rounded bg-rose-700 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
              {discountPercent}% off
            </span>
          )}
          <Link href={productUrl(p.slug, p.name, p.id)} className="block h-full w-full">
            <ProductImage
              src={img}
              alt={p.name}
              fill
              sizes="290px"
              className="object-cover object-top transition duration-500 group-hover:scale-105"
            />
          </Link>
        </div>
        <Link href={productUrl(p.slug, p.name, p.id)} className="mb-1 block text-[15px] font-bold leading-snug text-gray-900 line-clamp-2 hover:text-[var(--primary)] sm:text-base">
          {p.name}
        </Link>
        <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-base font-bold text-gray-900 sm:text-lg">{money(displayPrice)}</span>
          {displayOriginal && <span className="text-xs text-gray-500 line-through">{money(displayOriginal)}</span>}
        </div>

        {sizes.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-medium text-gray-600 sm:text-sm">
              Choose a size:
              {selectedSize && <span className="ml-1 font-bold text-[var(--primary)]">({selectedSize})</span>}
            </p>
            <div className="flex flex-wrap items-center gap-1">
              {sizes.map((size) => {
                const sizeVariation = (p.variations ?? []).find((v) =>
                  v.attributes.some((va) => va.value.value === size)
                );
                const outOfStock = sizeVariation ? sizeVariation.stock <= 0 : false;
                const isSelected = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[32px] rounded px-1.5 py-1 text-center text-xs font-semibold leading-tight transition sm:min-w-[36px] sm:px-2
                      ${outOfStock
                        ? isSelected
                          ? "border-2 border-gray-400 bg-gray-300 text-gray-700 shadow-sm"
                          : "border border-dashed border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400"
                        : isSelected
                          ? "border-2 border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm"
                          : "border border-gray-200 bg-gray-50 text-gray-700 hover:border-[var(--primary)] hover:bg-emerald-50"
                      }`}
                  >
                    {size}{outOfStock ? " ✕" : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <button
          type="button"
          onClick={handleBuyNow}
          className="flex min-h-10 w-full items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-[var(--primary)] px-1.5 py-2 text-center text-[10px] font-bold leading-tight text-white shadow transition hover:bg-[var(--primary-hover)] hover:shadow-md active:scale-[0.98] min-[400px]:px-2 min-[400px]:text-xs sm:min-h-11 sm:px-3 sm:text-sm"
        >
          <span className="text-sm text-amber-400">⚡</span>
          <span>Buy now</span>
        </button>
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!allowAddToCart}
            aria-label="Add to cart"
            title="Add to cart"
            className={`flex min-h-10 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-1 py-2 text-[0px] font-semibold leading-tight transition min-[480px]:px-2 min-[480px]:text-xs ${
              !allowAddToCart
                ? "cursor-not-allowed bg-gray-100 text-gray-500"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            <FiShoppingBag size={13} /> Add to cart
          </button>
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contact us on WhatsApp"
              title="Contact us on WhatsApp"
              className="flex min-h-10 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-1 py-2 text-[0px] font-semibold leading-tight text-emerald-800 transition hover:bg-emerald-100 min-[480px]:px-2 min-[480px]:text-xs"
            >
              <FiMessageCircle size={13} /> WhatsApp
            </a>
          ) : (
            <span aria-label="WhatsApp unavailable" className="flex min-h-10 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-gray-100 bg-gray-50 px-1 py-2 text-[0px] leading-tight text-gray-400 min-[480px]:px-2 min-[480px]:text-xs">
              <FiMessageCircle size={13} /> WhatsApp
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

type PerView = { mobile: number; tablet: number; desktop: number };

type HomeSectionDef = {
  id: string;
  title?: string;
  categoryIds: string[];
  mode: "carousel" | "grid" | "responsive" | "infinite";
  productLimit?: number | null;
  auto: boolean;
  seconds: number;
  perView: PerView;
  pagination: boolean;
  loop: boolean;
  showViewAll: boolean;
};

export type HomepageCategoriesSettings = {
  mode: "manual" | "automatic";
  defaultProductLimit: number | null;
  defaultDisplayStyle: "grid" | "slider" | "loop";
  defaultAuto: boolean;
  defaultLoop: boolean;
  defaultSeconds: number;
  defaultPagination: boolean;
  defaultPerView: PerView;
  defaultOrder: "alphabetical" | "newest";
  categories: { categoryId: string; visible: boolean; productLimit?: number | null; displayStyle?: "grid" | "slider" | "loop"; auto?: boolean; loop?: boolean; seconds?: number; pagination?: boolean; perView?: PerView }[];
};

export type PromoBannerDef = {
  enabled?: boolean;
  badge?: string;
  title?: string;
  accent?: string;
  subtitle?: string;
  buttonLabel?: string;
  buttonLink?: string;
  image?: string;
};

export type TrustBadgeDef = {
  enabled?: boolean;
  icon?: string;
  title?: string;
  subtitle?: string;
};

export type CategoryShowcase = {
  maxCategories?: number;
  selectionMode?: "automatic" | "manual";
  categoryIds?: string[];
  mode?: "grid" | "carousel" | "loop";
  auto?: boolean;
  loop?: boolean;
  seconds?: number;
  pagination?: boolean;
  perView?: { mobile: number; tablet: number; desktop: number };
  eyebrow?: string;
  title?: string;
  accent?: string;
  countLabel?: string;
};

export function CatalogHome({
  products,
  categories,
  heroSlides,
  heroSeconds,
  allowAddToCart,
  whatsapp,
  add,
  buyNow,
  sections,
  promoBanners,
  trustBadges,
  categoryShowcase,
  popularProducts,
  homepageCategories,
  sectionVisibility,
}: {
  products: Product[];
  categories: Category[];
  heroSlides: HeroSlide[];
  heroSeconds?: number;
  allowAddToCart: boolean;
  whatsapp: string | null;
  add: (p: Product, variation?: Variation) => void;
  buyNow: (p: Product, variation?: Variation) => void;
  sections?: HomeSectionDef[];
  promoBanners?: PromoBannerDef[];
  trustBadges?: TrustBadgeDef[];
  categoryShowcase?: CategoryShowcase;
  popularProducts?: { eyebrow?: string; title?: string; limit?: number; mode?: "slider" | "grid"; auto?: boolean };
  homepageCategories?: HomepageCategoriesSettings;
  sectionVisibility?: Partial<Record<"hero" | "categories" | "products" | "collections" | "trust" | "promos" | "announcement", boolean>>;
}) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const maxCategories = Math.max(1, Math.min(50, Math.floor(categoryShowcase?.maxCategories ?? 8)));

  const selectionMode = categoryShowcase?.selectionMode ?? (categoryShowcase?.categoryIds ? "manual" : "automatic");
  const selectedCategoryIds = categoryShowcase?.categoryIds ?? [];
  const showcaseCategories = selectionMode === "manual"
    ? categories.filter((category) => selectedCategoryIds.includes(category.id))
    : categories;
  const catCounts = showcaseCategories.map((c) => ({
    ...c,
    count: products.filter((p) => p.categoryId === c.id || p.categoryLinks?.some((link) => link.categoryId === c.id)).length,
  }));
  const tabCats = catCounts;
  const filteredProducts =
    activeTab === "all" ? products : products.filter((p) => p.categoryId === activeTab || p.categoryLinks?.some((link) => link.categoryId === activeTab));

  const categorySliders = tabCats.slice(0, maxCategories).map((c) => ({
    ...c,
    items: products.filter((p) => p.categoryId === c.id || p.categoryLinks?.some((link) => link.categoryId === c.id)),
  }));

  const defaultHomepageCategories: HomepageCategoriesSettings = {
    mode: "automatic" as const,
    defaultProductLimit: 8,
    defaultDisplayStyle: "slider" as const,
    defaultAuto: false,
    defaultLoop: false,
    defaultSeconds: 3,
    defaultPagination: false,
    defaultPerView: { mobile: 2, tablet: 4, desktop: 6 },
    defaultOrder: "alphabetical" as const,
    categories: [],
  };
  const effectiveHomepageCategories = homepageCategories
    ? {
        ...defaultHomepageCategories,
        ...homepageCategories,
        defaultPerView: { ...defaultHomepageCategories.defaultPerView, ...(homepageCategories.defaultPerView ?? {}) },
        categories: homepageCategories.categories ?? [],
      }
    : !sections?.length ? defaultHomepageCategories : null;

  const managedSections = effectiveHomepageCategories ? (() => {
    const settings = effectiveHomepageCategories;
    const entries = new Map(settings.categories.map((entry) => [entry.categoryId, entry]));
    const ordered = [...categories].sort((a, b) => settings.mode === "manual"
      ? (settings.categories.findIndex((entry) => entry.categoryId === a.id) < 0 ? Number.MAX_SAFE_INTEGER : settings.categories.findIndex((entry) => entry.categoryId === a.id))
        - (settings.categories.findIndex((entry) => entry.categoryId === b.id) < 0 ? Number.MAX_SAFE_INTEGER : settings.categories.findIndex((entry) => entry.categoryId === b.id))
        || a.name.localeCompare(b.name)
      : settings.defaultOrder === "newest"
        ? Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? "")
        : a.name.localeCompare(b.name));
    return ordered.flatMap((category) => {
      const categoryProducts = products.filter((product) => product.categoryId === category.id || product.categoryLinks?.some((link) => link.categoryId === category.id));
      const entry = entries.get(category.id);
      const visible = entry?.visible ?? settings.mode === "automatic";
      if (!visible || categoryProducts.length === 0) return [];
      const limit = settings.mode === "automatic" || entry?.productLimit === undefined ? settings.defaultProductLimit : entry.productLimit;
      const items = limit === null ? categoryProducts : categoryProducts.slice(0, Math.max(1, Math.min(50, Math.floor(limit ?? 8))));
      const displayStyle = settings.mode === "automatic" ? settings.defaultDisplayStyle : entry?.displayStyle ?? settings.defaultDisplayStyle;
      const isLoop = displayStyle === "loop";
      const auto = settings.mode === "automatic" ? settings.defaultAuto : entry?.auto ?? settings.defaultAuto;
      const loop = settings.mode === "automatic" ? settings.defaultLoop : entry?.loop ?? settings.defaultLoop;
      const seconds = settings.mode === "automatic" ? settings.defaultSeconds : entry?.seconds ?? settings.defaultSeconds;
      const pagination = settings.mode === "automatic" ? settings.defaultPagination : entry?.pagination ?? settings.defaultPagination;
      const perView = settings.mode === "automatic" ? settings.defaultPerView : { ...settings.defaultPerView, ...(entry?.perView ?? {}) };
      return [{
        id: `home-category-${category.id}`,
        title: category.name,
        categoryIds: [category.id],
        mode: displayStyle === "grid" ? "grid" as const : isLoop ? "infinite" as const : "carousel" as const,
        productLimit: limit,
        auto: isLoop || auto,
        seconds,
        perView,
        pagination,
        loop: isLoop || loop,
        showViewAll: true,
        items,
        slug: category.slug,
        displayName: category.name,
      }];
    });
  })() : null;

  const configuredSections = (sections ?? [])
    .map((s) => {
      if (!s.categoryIds.length) return null;
      const allItems = products.filter((p) => s.categoryIds.some((categoryId) => categoryId === p.categoryId || p.categoryLinks?.some((link) => link.categoryId === categoryId)));
      const limit = s.productLimit === null ? null : Math.max(1, Math.min(50, Math.floor(s.productLimit ?? 8)));
      const items = limit === null ? allItems : allItems.slice(0, limit);
      if (!items.length) return null;
      const cat = categories.find((c) => c.id === s.categoryIds[0]);
      return { ...s, items, slug: cat?.slug ?? null, displayName: cat?.name ?? s.title ?? "Collection" };
    })
    .filter(Boolean) as (HomeSectionDef & { items: Product[]; slug: string | null; displayName: string })[];

  const sectionList = managedSections ?? (configuredSections.length
    ? configuredSections
    : categorySliders.map((c) => ({
        id: c.id,
        title: c.name,
        categoryIds: [c.id],
        mode: "carousel" as const,
        productLimit: 8,
        auto: true,
        seconds: 4,
        perView: { mobile: 1.5, tablet: 2.5, desktop: 3 },
        pagination: true,
        loop: true,
        showViewAll: true,
        items: c.items,
        slug: c.slug,
        displayName: c.name,
      })));

  const img = (p: Product) => p.images?.[0] || FALLBACK;

  const promos: (Required<Pick<PromoBannerDef, "enabled" | "badge" | "title" | "accent" | "subtitle" | "buttonLabel" | "buttonLink" | "image">> & { theme: "amber" | "emerald"; linkSide: "left" | "right" })[] = [
    {
      enabled: true,
      badge: "Featured collection",
      title: "Made for the season",
      accent: "Everyday style",
      subtitle: "Thoughtful designs selected for you.",
      buttonLabel: "Explore collection →",
      buttonLink: "/shop",
      image: products[0]?.images[0] || FALLBACK,
      theme: "amber",
      linkSide: "left",
    },
    {
      enabled: true,
      badge: "Curated pairings",
      title: "The essentials set",
      accent: "Bundle and save",
      subtitle: "A considered collection at a special price.",
      buttonLabel: "Shop the set →",
      buttonLink: "/shop",
      image: products[1]?.images[0] || products[0]?.images[0] || FALLBACK,
      theme: "emerald",
      linkSide: "right",
    },
  ];

  const mergedPromos = promos.map((def, i) => {
    const c = promoBanners?.[i] ?? {};
    const left = def.linkSide === "left";
    const themed =
      def.theme === "amber"
        ? {
            card: "border border-amber-200 bg-gradient-to-r from-amber-100 to-amber-50",
            badge: "bg-amber-200/70 text-amber-900",
            accent: "text-[var(--primary)]",
          }
        : {
            card: "border border-emerald-200 bg-gradient-to-r from-emerald-100/70 to-emerald-50",
            badge: "bg-emerald-200/70 text-emerald-900",
            accent: "text-amber-700",
          };
    return {
      enabled: c.enabled ?? def.enabled,
      badge: c.badge ?? def.badge,
      title: c.title ?? def.title,
      accent: c.accent ?? def.accent,
      subtitle: c.subtitle ?? def.subtitle,
      buttonLabel: c.buttonLabel ?? def.buttonLabel,
      buttonLink: c.buttonLink ?? def.buttonLink,
      image: c.image ?? def.image,
      theme: themed,
      left,
    };
  });

  const visiblePromos = mergedPromos.filter((p) => p.enabled);

  return (
    <>
      {/* HERO */}
      {sectionVisibility?.hero !== false && <section className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 md:py-8">
        <div className="overflow-hidden rounded-[28px] shadow-2xl shadow-slate-900/10">
          <CarouselSlider
            items={heroSlides.map((s) => (
              <div key={s.id} className="relative grid min-h-[500px] overflow-hidden bg-[#172521] text-white md:min-h-[520px] md:grid-cols-[1.02fr_.98fr]">
                <div className="pointer-events-none absolute -left-24 -top-36 h-[440px] w-[440px] rounded-full border border-white/[0.07]" />
                <div className="pointer-events-none absolute -left-10 -top-20 h-[300px] w-[300px] rounded-full border border-white/[0.06]" />
                <div className="relative z-10 flex flex-col justify-center px-6 py-10 sm:px-10 md:px-14 lg:px-16">
                  {s.badge && <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[.18em] text-white/75"><span className="h-1.5 w-1.5 rounded-full bg-[var(--primary-light)]" />{s.badge}</p>}
                  <h1 className="max-w-[680px] text-4xl font-extrabold leading-[1.04] tracking-[-.045em] sm:text-5xl lg:text-[4.4rem]">
                    {s.title || "For every moment"}
                    {s.accent && <><br /><span className="text-[var(--primary-light)]">{s.accent}</span></>}
                  </h1>
                  {s.subtitle && <p className="mt-5 max-w-xl text-sm leading-7 text-white/65 sm:text-base">{s.subtitle.split("|").map((part) => part.trim()).filter(Boolean).join("  ·  ")}</p>}
                  <div className="mt-8 flex flex-wrap gap-3">
                    <CTA label={s.buttonLabel ?? ""} href={s.buttonLink ?? "#shop"} primary />
                    <CTA label={s.secondaryLabel ?? ""} href={s.secondaryLink ?? "#categories"} />
                  </div>
                  <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-white/55">
                    <span className="inline-flex items-center gap-2"><FiShield className="text-[var(--primary-light)]" />Secure checkout</span>
                    <span className="inline-flex items-center gap-2"><FiTruck className="text-[var(--primary-light)]" />Reliable delivery</span>
                  </div>
                </div>
                <div className="relative mx-5 mb-5 min-h-[240px] overflow-hidden rounded-[22px] bg-[#f1f0ec] sm:mx-8 md:my-8 md:ml-0 md:mr-8 md:min-h-0">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,#ffffff_0%,#f1f0ec_72%)]" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image} alt="" fetchPriority="high" decoding="async" className="relative h-full min-h-[260px] w-full object-contain p-3 sm:min-h-[340px] md:absolute md:inset-0 md:min-h-0 md:p-5" />
                  {s.cardLink ? (
                    <Link href={s.cardLink} className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-lg shadow-slate-900/5 backdrop-blur-md transition hover:bg-white sm:bottom-6 sm:left-6 sm:right-6">
                      <span className="min-w-0"><span className="block text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">{s.cardLabel || "Curated for you"}</span><span className="mt-0.5 line-clamp-2 block text-sm font-bold leading-snug text-slate-800">{s.cardText || [s.title, s.accent].filter(Boolean).join(" ") || "Discover something special"}</span></span>
                      <span className="ml-3 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-white"><FiArrowRight size={16} /></span>
                    </Link>
                  ) : (
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-lg shadow-slate-900/5 backdrop-blur-md sm:bottom-6 sm:left-6 sm:right-6">
                      <span className="min-w-0"><span className="block text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">{s.cardLabel || "Curated for you"}</span><span className="mt-0.5 line-clamp-2 block text-sm font-bold leading-snug text-slate-800">{s.cardText || [s.title, s.accent].filter(Boolean).join(" ") || "Discover something special"}</span></span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            seconds={heroSeconds ?? 5}
            auto={heroSlides.length > 1}
            loop={heroSlides.length > 1}
            perView={{ mobile: 1, tablet: 1, desktop: 1 }}
            pagination={heroSlides.length > 1}
            spaceBetween={0}
            ariaLabel="Hero banner carousel"
          />
        </div>
      </section>}

      {/* CATEGORIES */}
      {sectionVisibility?.categories !== false && (() => {
        const mode = categoryShowcase?.mode ?? "grid";
        const eyebrow = categoryShowcase?.eyebrow?.trim();
        const title = categoryShowcase?.title?.trim();
        const accent = categoryShowcase?.accent?.trim();
        const card = (c: (typeof catCounts)[number]) => (
          <Link
            key={c.id}
            href={`/categories/${c.slug}`}
            className="group relative block overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[var(--primary)]/30 hover:shadow-xl hover:shadow-slate-900/10"
          >
            <div className="relative aspect-[4/4.7] overflow-hidden bg-slate-100">
              <Image
                src={c.image ?? img(products.find((p) => p.categoryId === c.id || p.categoryLinks?.some((link) => link.categoryId === c.id)) ?? { images: [] } as any)}
                alt=""
                fill
                sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 16vw"
                className="object-cover transition duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-black/0" />
              <span className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 text-left sm:bottom-4 sm:left-4 sm:right-4">
                <span className="min-w-0"><span className="block truncate text-sm font-bold text-white sm:text-base">{c.name}</span><span className="mt-0.5 block text-[11px] font-medium text-white/70">{c.count} items</span></span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/35 bg-white/15 text-white backdrop-blur transition group-hover:bg-white group-hover:text-slate-900"><FiArrowRight size={14} /></span>
              </span>
            </div>
          </Link>
        );
        return (
          <section id="categories" className="mx-auto max-w-[1360px] px-4 py-9 sm:px-6 md:py-12">
            <div className="mb-5 flex items-end justify-between gap-3 sm:mb-7">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <FiShoppingBag size={18} />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--primary)]">{eyebrow || "Find your style"}</p>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                    {title || "Shop by category"}
                    {accent && <span className="text-[var(--primary)]"> {accent}</span>}
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-500">A few good places to start exploring.</p>
                </div>
              </div>
              <Link href="/shop" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--primary)] hover:underline">
                View all <span>→</span>
              </Link>
            </div>
            {mode === "grid" ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
                {catCounts.slice(0, maxCategories).map(card)}
              </div>
            ) : (
              <CarouselSlider
                key={`cat-${mode}`}
                items={catCounts.map(card)}
                seconds={categoryShowcase?.seconds ?? 3}
                auto={mode === "loop" ? true : (categoryShowcase?.auto ?? false)}
                loop={mode === "loop" ? true : (categoryShowcase?.loop ?? false)}
                perView={categoryShowcase?.perView ?? { mobile: 2, tablet: 4, desktop: 6 }}
                pagination={categoryShowcase?.pagination ?? false}
                spaceBetween={12}
                ariaLabel="Shop by category"
              />
            )}
          </section>
        );
      })()}

      {/* POPULAR PRODUCTS */}
      {sectionVisibility?.products !== false && <section id="shop" className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-1 text-sm font-semibold text-amber-700">{popularProducts?.eyebrow ?? "Customer favorites"}</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">{popularProducts?.title ?? "Shop our bestsellers"}</h2>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
            <button
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${activeTab === "all" ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}`}
              onClick={() => setActiveTab("all")}
            >
              View all
            </button>
            {tabCats.map((c) => (
              <button
                key={c.id}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${activeTab === c.id ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}`}
                onClick={() => setActiveTab(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
        {popularProducts?.mode === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.slice(0, popularProducts.limit ?? 8).map((p) => (
              <CatalogCard key={p.id} p={p} add={add} buyNow={buyNow} allowAddToCart={allowAddToCart} whatsapp={whatsapp} fill />
            ))}
          </div>
        ) : (
          <CarouselSlider
            items={filteredProducts.slice(0, popularProducts?.limit ?? 8).map((p) => (
              <CatalogCard key={p.id} p={p} add={add} buyNow={buyNow} allowAddToCart={allowAddToCart} whatsapp={whatsapp} fill />
            ))}
            seconds={5}
            auto={popularProducts?.auto !== false}
            loop
            perView={{ mobile: 1.5, tablet: 2.5, desktop: 4 }}
            pagination
            spaceBetween={12}
            ariaLabel="Popular products"
          />
        )}
      </section>}

      {/* CATEGORY SLIDERS */}
      {sectionVisibility?.collections !== false && sectionList.map((c) => (
        <section key={c.id} className="home-deferred mx-auto max-w-7xl px-4 py-8">
          <div className="mb-5 flex items-end justify-between border-b border-gray-100 pb-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                <span className="text-sm font-bold text-emerald-800">{c.displayName} collection</span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">{c.displayName}</h2>
            </div>
            {c.slug && (
              <Link href={`/categories/${c.slug}`} className="mr-2 text-xs font-semibold text-[var(--primary)] hover:underline sm:text-sm">
                View all →
              </Link>
            )}
          </div>
          {c.mode === "grid" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {c.items.map((p) => <CatalogCard key={p.id} p={p} add={add} buyNow={buyNow} allowAddToCart={allowAddToCart} whatsapp={whatsapp} fill />)}
            </div>
          ) : c.mode === "responsive" ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:hidden">{c.items.map((p) => <CatalogCard key={p.id} p={p} add={add} buyNow={buyNow} allowAddToCart={allowAddToCart} whatsapp={whatsapp} fill />)}</div>
              <div className="hidden md:block"><CarouselSlider
                items={c.items.map((p) => <CatalogCard key={p.id} p={p} add={add} buyNow={buyNow} allowAddToCart={allowAddToCart} whatsapp={whatsapp} fill />)}
                seconds={c.seconds ?? 4} auto={c.auto ?? true} loop={c.loop ?? true} perView={c.perView ?? { mobile: 1.5, tablet: 2.5, desktop: 3 }} pagination={c.pagination ?? true} spaceBetween={12} ariaLabel={`${c.displayName} collection`}
              /></div>
            </>
          ) : (
            <CarouselSlider
              items={c.items.map((p) => <CatalogCard key={p.id} p={p} add={add} buyNow={buyNow} allowAddToCart={allowAddToCart} whatsapp={whatsapp} fill />)}
              seconds={c.seconds ?? 4}
              auto={c.mode === "infinite" ? true : c.auto ?? true}
              loop={c.mode === "infinite" ? true : c.loop ?? true}
              perView={c.perView ?? { mobile: 1.5, tablet: 2.5, desktop: 3 }}
              pagination={c.pagination ?? true}
              spaceBetween={12}
              ariaLabel={`${c.displayName} collection`}
            />
          )}
        </section>
      ))}

      {/* TRUST */}
      {sectionVisibility?.trust !== false && (() => {
        const defaults: { key: string; icon: string; title: string; subtitle: string }[] = [
          { key: "shield", icon: "shield", title: "Quality products", subtitle: "Carefully selected for everyday use" },
          { key: "truck", icon: "truck", title: "Reliable delivery", subtitle: "Fast and secure shipping" },
          { key: "refresh", icon: "refresh", title: "Easy returns", subtitle: "Simple returns within 7 days" },
          { key: "check", icon: "check", title: "Secure payments", subtitle: "Cash on delivery or card" },
        ];
        const merged = defaults.map((d, i) => {
          const c = trustBadges?.[i] ?? {};
          return {
            enabled: c.enabled !== false,
            icon: c.icon || d.icon,
            title: c.title || d.title,
            subtitle: c.subtitle || d.subtitle,
          };
        });
        const visible = merged.filter((b) => b.enabled);
        if (!visible.length) return null;
        return (
          <section className="mx-auto max-w-7xl px-4 py-4">
            <div className="grid grid-cols-1 gap-6 rounded-xl border border-emerald-100 bg-emerald-50/70 p-5 sm:grid-cols-2 lg:grid-cols-4">
              {visible.map((t) => {
                const Ic = ICON_MAP[t.icon] ?? FiShield;
                return (
                  <div key={t.title} className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white">
                      <Ic size={22} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{t.title}</h3>
                      <p className="text-xs text-gray-500">{t.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* PROMO */}
      {sectionVisibility?.promos !== false && visiblePromos.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {visiblePromos.map((p, i) => (
              <div
                key={i}
                className={`relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl ${p.theme.card} p-6 shadow-sm sm:p-8`}
              >
                {p.left ? (
                  <>
                    <div className="z-10 flex-1 space-y-2 min-w-0">
                      <span className={`rounded px-2 py-0.5 text-sm font-semibold ${p.theme.badge}`}>{p.badge}</span>
                      <h3 className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
                        {p.title} <br /><span className={p.theme.accent}>{p.accent}</span>
                      </h3>
                      <p className="text-sm text-gray-600">{p.subtitle}</p>
                      <div className="pt-2">
                        <Link href={p.buttonLink || "#shop"} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]">
                          {p.buttonLabel}
                        </Link>
                      </div>
                    </div>
                    <div className="relative h-40 w-28 shrink-0 sm:h-48 sm:w-44">
                      <Image
                        src={p.image}
                        alt={`Promo ${i + 1}`}
                        fill
                        sizes="180px"
                        className="rounded-xl object-cover shadow-md"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="relative h-40 w-28 shrink-0 sm:h-48 sm:w-44">
                      <Image
                        src={p.image}
                        alt={`Promo ${i + 1}`}
                        fill
                        sizes="180px"
                        className="rounded-xl object-cover shadow-md"
                      />
                    </div>
                    <div className="z-10 flex-1 space-y-2 text-right min-w-0">
                      <span className={`rounded px-2 py-0.5 text-sm font-semibold ${p.theme.badge}`}>{p.badge}</span>
                      <h3 className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
                        {p.title} <br /><span className={p.theme.accent}>{p.accent}</span>
                      </h3>
                      <p className="text-sm text-gray-600">{p.subtitle}</p>
                      <div className="flex justify-end pt-2">
                        <Link href={p.buttonLink || "#shop"} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]">
                          {p.buttonLabel}
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
