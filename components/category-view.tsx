"use client";
import { formatMoney } from "../lib/money";
import { ProductImage } from "./product-image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { waNumber } from "../lib/wa";
import { stripHtml } from "../lib/html";
import { productUrl } from "../lib/product-url";
import { getStoreStatus, type StoreStatusResult } from "../lib/store-status";
import { ProductGridSkeleton, Skeleton } from "./skeletons";
import { FiArrowLeft, FiHeart, FiMessageCircle, FiShoppingBag, FiZap } from "react-icons/fi";

const apiUrl = "";
const FALLBACK_IMG = "/product-placeholder.svg";

type Product = {
  id: string;
  slug: string;
  name: string;
  price: string;
  salePrice: string | null;
  description?: string;
  images: string[];
  productType?: string;
  categoryId: string;
  categoryLinks?: { categoryId: string }[];
  category: { name: string; slug: string };
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
type CartItem = { id: string; slug: string; name: string; images: string[]; price: number; categoryId: string; categoryIds?: string[]; qty: number; variationId?: string; sku?: string };

const money = formatMoney;

function CatalogCard({
  p, allowAddToCart, add, buyNow, whatsapp,
}: {
  p: Product; allowAddToCart: boolean;
  add: (p: Product, variation?: Variation) => void;
  buyNow: (p: Product, variation?: Variation) => void;
  whatsapp: string | null;
}) {
  const img = p.images?.[0] || FALLBACK_IMG;
  const hasSale = Boolean(p.salePrice && Number(p.salePrice) < Number(p.price));
  const salePrice = hasSale ? Number(p.salePrice) : null;
  const price = Number(p.price);
  const discountPercent = hasSale ? Math.round(((price - salePrice!) / price) * 100) : 0;
  const isVariable = p.productType === "VARIABLE" && (p.variations?.length ?? 0) > 0;
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const sizeAttr = (p.attributes ?? []).find((a) => /size/i.test(a.name));
  const sizes = sizeAttr?.values.map((v) => v.value) ?? [];
  const selectedVariation = isVariable && selectedSize
    ? (p.variations ?? []).find((v) => v.attributes.some((va) => /size/i.test(sizeAttr?.name ?? "") && va.value.value === selectedSize))
    : null;
  const displayPrice = selectedVariation
    ? (selectedVariation.salePrice && selectedVariation.salePrice < selectedVariation.price) ? selectedVariation.salePrice : selectedVariation.price
    : (hasSale ? salePrice! : price);
  const displayOriginal = selectedVariation
    ? (selectedVariation.salePrice && selectedVariation.salePrice < selectedVariation.price) ? selectedVariation.price : null
    : (hasSale ? price : null);
  const handleAddToCart = () => {
    if (!allowAddToCart) return;
    if (isVariable) {
      if (selectedVariation) { if (selectedVariation.stock <= 0) { toast.error("This size is out of stock."); return; } add(p, selectedVariation); }
      else if (sizes.length > 0) toast.error("Please select a size first.");
      else add(p);
    } else add(p);
  };
  const handleBuyNow = () => {
    if (isVariable) {
      if (selectedVariation) { if (selectedVariation.stock <= 0) { toast.error("This size is out of stock."); return; } buyNow(p, selectedVariation); }
      else if (sizes.length > 0) toast.error("Please select a size first.");
      else buyNow(p);
    } else buyNow(p);
  };
  const waHref = whatsapp
    ? `${whatsapp}?text=${encodeURIComponent(`Hello, I would like ${p.name}${selectedSize ? ` (Size: ${selectedSize})` : ""} (${money(displayPrice)}).` )}`
    : null;
  return (
    <div className="flex w-full min-w-0 flex-col justify-between rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-all duration-300 hover:shadow-xl">
      <div>
        <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-xl bg-gray-100 group">
          <span className="absolute left-2.5 top-2.5 z-10 rounded bg-white/90 px-2.5 py-0.5 text-xs font-medium text-gray-800 shadow-sm backdrop-blur-sm">{p.category.name}</span>
          {hasSale && <span className="absolute right-2.5 top-2.5 z-10 rounded bg-rose-700 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">{discountPercent}% off</span>}
          <Link href={productUrl(p.slug, p.name, p.id)} className="block h-full w-full">
            <ProductImage src={img} alt={p.name} fill sizes="(max-width: 650px) 50vw, 290px" className="object-cover object-top transition duration-500 group-hover:scale-105" />
          </Link>
        </div>
        <Link href={productUrl(p.slug, p.name, p.id)} className="mb-1 block text-base font-bold leading-snug text-gray-900 line-clamp-2 hover:text-[var(--primary)]">{p.name}</Link>
        <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-lg font-bold text-gray-900">{money(displayPrice)}</span>
          {displayOriginal && <span className="text-xs text-gray-500 line-through">{money(displayOriginal)}</span>}
        </div>
        {sizes.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 text-sm font-medium text-gray-600">Choose a size:{selectedSize && <span className="ml-1 font-bold text-[var(--primary)]">({selectedSize})</span>}</p>
            <div className="flex flex-wrap items-center gap-1">
              {sizes.map((size) => {
                const sv = (p.variations ?? []).find((v) => v.attributes.some((va) => va.value.value === size));
                const oos = sv ? sv.stock <= 0 : false;
                const sel = selectedSize === size;
                return (
                  <button key={size} type="button" onClick={() => setSelectedSize(size)}
                    className={`min-w-[36px] rounded px-2 py-1 text-center text-xs font-semibold leading-tight transition ${oos ? (sel ? "border-2 border-gray-400 bg-gray-300 text-gray-700 shadow-sm" : "border border-dashed border-gray-300 bg-gray-50 text-gray-500") : sel ? "border-2 border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm" : "border border-gray-200 bg-gray-50 text-gray-700 hover:border-[var(--primary)] hover:bg-emerald-50"}`}>
                    {size}{oos ? " ✕" : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <button type="button" onClick={handleBuyNow} className="flex w-full items-center justify-center gap-1.5 whitespace-normal rounded-lg bg-[var(--primary)] px-2 py-2.5 text-center text-sm font-bold leading-tight text-white shadow transition hover:bg-[var(--primary-hover)] hover:shadow-md active:scale-[0.98]">
          <span className="text-sm text-amber-400">⚡</span><span>Buy now</span>
        </button>
        <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
          <button type="button" onClick={handleAddToCart} disabled={!allowAddToCart}
            className={`flex items-center justify-center gap-1 whitespace-normal rounded-lg px-2 py-2 text-sm font-semibold leading-tight transition ${!allowAddToCart ? "cursor-not-allowed bg-gray-100 text-gray-400" : "bg-gray-100 text-gray-800 hover:bg-gray-200"}`}>
            <FiShoppingBag size={13} /> Add to cart
          </button>
          {waHref ? (
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 whitespace-normal rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 text-sm font-semibold leading-tight text-emerald-800 transition hover:bg-emerald-100">
              <FiMessageCircle size={13} /> WhatsApp
            </a>
          ) : (
            <span className="flex items-center justify-center whitespace-normal rounded-lg border border-gray-100 bg-gray-50 px-2 py-2 text-sm leading-tight text-gray-400">
              <FiMessageCircle size={13} /> WhatsApp
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ClassicCard({
  p, allowAddToCart, onAdd, buyNow, wishlisted, onWishlist,
}: {
  p: Product; allowAddToCart: boolean;
  onAdd: () => void;
  buyNow: () => void;
  wishlisted: boolean;
  onWishlist: (id: string, e: React.MouseEvent) => void;
}) {
  const hasSale = Boolean(p.salePrice && Number(p.salePrice) < Number(p.price));
  const discountPercent = hasSale ? Math.round(((Number(p.price) - Number(p.salePrice)) / Number(p.price)) * 100) : 0;
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md w-full h-full">
      <Link href={productUrl(p.slug, p.name, p.id)} className="relative block aspect-[3/4] overflow-hidden bg-slate-100">
        <ProductImage src={p.images[0] || FALLBACK_IMG} alt={p.name} fill sizes="(max-width: 650px) 50vw, 280px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
        {hasSale && <span className="absolute left-3 top-3 rounded-full border border-rose-500/30 bg-rose-500/90 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white backdrop-blur-md">{discountPercent}% off</span>}
        <button onClick={(e) => onWishlist(p.id, e)} aria-label="Wishlist" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/60 bg-white/85 text-slate-500 backdrop-blur-md transition-all hover:text-rose-500" style={{ color: wishlisted ? "#ef4444" : "inherit" }}>
          <FiHeart size={16} fill={wishlisted ? "#ef4444" : "none"} />
        </button>
      </Link>
      <div className="space-y-1.5 p-3 sm:p-4">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-lg font-bold text-primary">{money(hasSale ? p.salePrice! : p.price)}</span>
          {hasSale && <span className="text-sm text-slate-400 line-through">{money(p.price)}</span>}
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-primary">{p.name}</h3>
        {p.description && <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">{stripHtml(p.description)}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
          <span className="text-xs font-medium text-slate-500">{p.category.name}</span>
          <button onClick={allowAddToCart ? onAdd : buyNow}
            className={`inline-flex items-center gap-1.5 whitespace-normal rounded-lg px-3 py-2 text-left text-xs font-bold transition-all active:scale-[0.98] ${allowAddToCart ? "bg-slate-100 text-slate-700 hover:bg-gradient-to-r hover:from-primary hover:to-indigo-600 hover:text-white" : "bg-gradient-to-r from-primary to-indigo-600 text-white shadow-sm hover:shadow-md"}`}>
            {allowAddToCart ? <><FiShoppingBag size={13} /> Quick Add</> : <><FiZap size={13} /> Order Now</>}
          </button>
        </div>
      </div>
    </article>
  );
}

type CategoryRecord = { slug: string; name: string };

export type CategoryViewProps = {
  slug: string;
  initialProducts?: Product[];
  initialCategories?: CategoryRecord[];
  initialStatus?: StoreStatusResult;
};

export function CategoryView({ slug, initialProducts, initialCategories, initialStatus }: CategoryViewProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts ?? []);
  const [categoryName, setCategoryName] = useState<string>(
    initialCategories?.find((c) => c.slug === slug)?.name ?? slug.replaceAll("-", " ")
  );
  const [loading, setLoading] = useState(!initialProducts);
  const [allowAddToCart, setAllowAddToCart] = useState(initialStatus?.config?.featureFlags?.addToCart !== false);
  const [layout, setLayout] = useState<"classic" | "catalog">(initialStatus?.config?.homePageConfig?.layout ?? "classic");
  const [chatConfig, setChatConfig] = useState<{ whatsapp?: { enabled?: boolean; number?: string } } | null>(initialStatus?.config?.chatConfig ?? null);
  const [wishlist, setWishlist] = useState<string[]>([]);

  const hasInitial = Boolean(initialProducts && initialCategories && initialStatus);

  useEffect(() => {
    if (hasInitial) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetch(`${apiUrl}/api/products?category=${encodeURIComponent(slug)}`).then(r => r.json()),
      fetch(`${apiUrl}/api/categories`).then(r => r.json()),
      getStoreStatus(),
    ]).then(([items, cats, status]) => {
      setProducts(items);
      const match = cats.find((c: { slug: string }) => c.slug === slug);
      if (match) setCategoryName(match.name);
      setAllowAddToCart(status?.config?.featureFlags?.addToCart !== false);
      setLayout(status?.config?.homePageConfig?.layout ?? "classic");
      setChatConfig(status?.config?.chatConfig);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug, hasInitial]);

  useEffect(() => {
    fetch(`${apiUrl}/api/wishlist`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Array<{ productId: string }>) => setWishlist(list.map((i) => i.productId)))
      .catch(() => {});
  }, []);

  const whatsapp = chatConfig?.whatsapp?.enabled && chatConfig.whatsapp.number ? `https://wa.me/${waNumber(chatConfig.whatsapp.number)}` : null;

  function addToCart(p: Product, variation?: Variation) {
    const price = variation
      ? Number(variation.salePrice && variation.salePrice < variation.price ? variation.salePrice : variation.price)
      : Number(p.salePrice && Number(p.salePrice) < Number(p.price) ? p.salePrice : p.price);
    const sku = variation?.sku ?? p.slug;
    const variationId = variation?.id;
    const old = JSON.parse(localStorage.getItem("epic-cart") ?? "[]");
    const key = variationId ? `${p.id}__${variationId}` : p.id;
    const hit = old.find((i: CartItem) => i.id === key);
    const item: CartItem = { id: key, slug: p.slug, name: p.name, images: p.images, price, categoryId: p.categoryId, categoryIds: [...new Set([p.categoryId, ...(p.categoryLinks ?? []).map((link) => link.categoryId)])], qty: hit ? hit.qty + 1 : 1, variationId, sku };
    localStorage.setItem("epic-cart", JSON.stringify(hit ? old.map((i: CartItem) => i.id === key ? item : i) : [...old, item]));
    toast.success("Added to your cart.");
  }

  function buyNowAction(p: Product, variation?: Variation) {
    addToCart(p, variation);
    window.location.href = "/checkout";
  }

  function handleClassicAdd(p: Product) {
    if (p.productType === "VARIABLE") { window.location.href = productUrl(p.slug, p.name, p.id); return; }
    addToCart(p);
  }

  function handleWishlistToggle(id: string, e: React.MouseEvent) {
    e.preventDefault();
    const isWishlisted = wishlist.includes(id);
    fetch(`${apiUrl}/api/wishlist/${id}`, {
      method: "POST",
    }).then((response) => {
      if (response.status === 401) {
    toast.error("Please sign in.");
        throw new Error("unauthorized");
      }
      if (!response.ok) throw new Error("Could not update wishlist");
      setWishlist((prev) => isWishlisted ? prev.filter((i) => i !== id) : [...prev, id]);
    }).catch((error) => {
      if (error instanceof Error && error.message === "unauthorized") return;
      toast.error("Could not update wishlist");
    });
  }

  if (loading) {
    return (
      <main className="min-h-[70vh] bg-white" aria-busy="true" aria-live="polite">
        <div className="mx-auto max-w-[1400px] px-[6vw] pt-8">
          <Skeleton className="h-4 w-40" />
          <div className="mt-10 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-72 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="pb-16 pt-10">
            <ProductGridSkeleton count={8} className="lg:grid-cols-4" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center justify-between gap-3 px-[6vw] pt-8 max-w-[1400px] mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 font-mono text-[0.85rem] font-medium text-slate-500 hover:text-primary transition-colors">
          <FiArrowLeft /> Collection
        </Link>
        <span className="text-xs tracking-widest text-slate-400">
          Home <span className="mx-1 text-slate-300">/</span> Shop <span className="mx-1 text-slate-300">/</span>{" "}
          <span className="text-primary">{categoryName}</span>
        </span>
      </nav>

      <section className="relative overflow-hidden px-[6vw] pt-10 pb-6 max-w-[1400px] mx-auto">
        <div aria-hidden className="pointer-events-none absolute -top-32 right-[-10%] h-80 w-80 rounded-full bg-gradient-to-br from-primary/15 to-cyan/15 blur-3xl" />
        <div className="relative">
          <span className="eyebrow">COLLECTION</span>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">{categoryName}</h1>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-mono text-sm font-semibold text-slate-500 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-gradient-to-br from-primary to-cyan" />
              {products.length} {products.length === 1 ? "item" : "items"}
            </span>
          </div>
          <p className="muted mt-3 max-w-lg">Explore every product in this collection — handpicked quality, honest prices.</p>
        </div>
      </section>

      <section className={`pt-4 ${layout === "catalog" ? "px-4" : "px-[6vw]"}`}>
        {products.length ? (
          <div className={layout === "catalog" ? "grid grid-cols-2 gap-2.5 min-[480px]:gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 max-w-7xl mx-auto" : "product-grid"}>
            {layout === "catalog"
              ? products.map((p) => (
                  <CatalogCard key={p.id} p={p} allowAddToCart={allowAddToCart} add={addToCart} buyNow={buyNowAction} whatsapp={whatsapp} />
                ))
              : products.map((p) => (
                  <ClassicCard key={p.id} p={p} allowAddToCart={allowAddToCart} onAdd={() => handleClassicAdd(p)} buyNow={() => { handleClassicAdd(p); window.location.href = "/checkout"; }} wishlisted={wishlist.includes(p.id)} onWishlist={handleWishlistToggle} />
                ))
            }
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-8 py-20 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm">
              <FiShoppingBag size={22} />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900">No products in this category yet</h3>
            <p className="muted mt-1">We are restocking soon. Check back later.</p>
            <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40">
              Browse all products <FiArrowLeft className="rotate-180" />
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
