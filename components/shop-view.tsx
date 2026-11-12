"use client";
import { formatMoney } from "../api/lib/money";

import { ProductImage } from "./product-image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { waNumber } from "../lib/wa";
import { stripHtml } from "../lib/html";
import { productUrl } from "../lib/product-url";
import { getStoreStatus, type StoreStatusResult } from "../lib/store-status";
import {
  FiArrowLeft,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiFilter,
  FiGrid,
  FiHeart,
  FiList,
  FiMessageCircle,
  FiRefreshCw,
  FiSearch,
  FiShoppingBag,
  FiSliders,
  FiTag,
  FiX,
  FiZap,
} from "react-icons/fi";
import { CatalogCard } from "./catalog-home";
import { MiniProductCard } from "./storefront";
import { ProductGridSkeleton } from "./skeletons";

const apiUrl = "";
const SHOP_PAGE_SIZE = 24;
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

type Category = {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  parentId?: string | null;
  subCategories?: Category[];
};

type CartItem = {
  id: string;
  slug: string;
  name: string;
  images: string[];
  price: number;
  categoryId: string;
  categoryIds?: string[];
  qty: number;
  variationId?: string;
  sku?: string;
};

const money = formatMoney;

/* -------------------------------------------------------------------------- */
/* PRODUCT CARD COMPONENT                                                     */
/* -------------------------------------------------------------------------- */
function ShopProductCard({
  p,
  allowAddToCart,
  add,
  buyNow,
  whatsapp,
  isList,
  wishlisted,
  onWishlist,
}: {
  p: Product;
  allowAddToCart: boolean;
  add: (p: Product, variation?: Variation) => void;
  buyNow: (p: Product, variation?: Variation) => void;
  whatsapp: string | null;
  isList?: boolean;
  wishlisted?: boolean;
  onWishlist?: (id: string, e: React.MouseEvent) => void;
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

  const selectedVariation =
    isVariable && selectedSize
      ? (p.variations ?? []).find((v) =>
          v.attributes.some(
            (va) => /size/i.test(sizeAttr?.name ?? "") && va.value.value === selectedSize
          )
        )
      : null;

  const displayPrice = selectedVariation
    ? selectedVariation.salePrice && selectedVariation.salePrice < selectedVariation.price
      ? selectedVariation.salePrice
      : selectedVariation.price
    : hasSale ? salePrice! : price;

  const displayOriginal = selectedVariation
    ? selectedVariation.salePrice && selectedVariation.salePrice < selectedVariation.price
      ? selectedVariation.price
      : null
    : hasSale
    ? price
    : null;

  const handleAddToCart = () => {
    if (!allowAddToCart) return;
    if (isVariable) {
      if (selectedVariation) {
        if (selectedVariation.stock <= 0) {
          toast.error("This size is out of stock.");
          return;
        }
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
        if (selectedVariation.stock <= 0) {
          toast.error("This size is out of stock.");
          return;
        }
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
    ? `${whatsapp}?text=${encodeURIComponent(
        `Hello, I would like ${p.name}${selectedSize ? ` (Size: ${selectedSize})` : ""} (${money(displayPrice)}).`
      )}`
    : null;

  if (isList) {
    return (
      <div className="group flex flex-col sm:flex-row gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-300 hover:border-[var(--shop-brand-border)] hover:shadow-lg">
        <div className="relative aspect-[4/5] w-full sm:w-48 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
          <span className="absolute left-2.5 top-2.5 z-10 rounded bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-gray-800 shadow-sm backdrop-blur-sm">
            {p.category?.name}
          </span>
          {hasSale && (
            <span className="absolute right-2.5 top-2.5 z-10 rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
              {discountPercent}% off
            </span>
          )}
          <Link href={productUrl(p.slug, p.name, p.id)} className="block h-full w-full">
            <ProductImage
              src={img}
              alt={p.name}
              fill
              sizes="200px"
              className="object-cover object-top transition duration-500 group-hover:scale-105"
            />
          </Link>
          {onWishlist && (
            <button
              onClick={(e) => onWishlist(p.id, e)}
              className="absolute bottom-2.5 right-2.5 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-gray-600 shadow-md backdrop-blur-sm hover:text-rose-500"
            >
              <FiHeart size={15} fill={wishlisted ? "#ef4444" : "none"} className={wishlisted ? "text-rose-500" : ""} />
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between space-y-3">
          <div>
            <Link
              href={productUrl(p.slug, p.name, p.id)}
              className="mb-1 block text-lg font-bold leading-snug text-gray-900 transition hover:text-[var(--shop-brand)]"
            >
              {p.name}
            </Link>
            {p.description && (
              <p className="line-clamp-2 text-xs text-gray-500 leading-relaxed">{stripHtml(p.description)}</p>
            )}

            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-xl font-bold text-[var(--shop-brand)]">{money(displayPrice)}</span>
              {displayOriginal && (
                <span className="text-xs text-gray-500 line-through">{money(displayOriginal)}</span>
              )}
            </div>

            {sizes.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium text-gray-600">
                  Choose a size:
                  {selectedSize && <span className="ml-1 font-bold text-[var(--shop-brand)]">({selectedSize})</span>}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {sizes.map((size) => {
                    const sv = (p.variations ?? []).find((v) =>
                      v.attributes.some((va) => va.value.value === size)
                    );
                    const oos = sv ? sv.stock <= 0 : false;
                    const sel = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`min-w-[34px] rounded-md px-2 py-1 text-center text-xs font-semibold transition ${
                          oos
                            ? sel
                              ? "border-2 border-gray-400 bg-gray-300 text-gray-700 shadow-sm"
                              : "border border-dashed border-gray-300 bg-gray-50 text-gray-500"
                            : sel
                            ? "border-2 border-[var(--shop-brand)] bg-[var(--shop-brand)] text-white shadow-sm"
                            : "border border-gray-200 bg-gray-50 text-gray-700 hover:border-[var(--shop-brand)] hover:bg-[var(--shop-brand-soft)]"
                        }`}
                      >
                        {size}
                        {oos ? " ✕" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleBuyNow}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--shop-brand)] px-4 py-2.5 text-xs font-bold text-white shadow transition hover:bg-[var(--shop-brand-hover)] active:scale-95"
            >
              <span className="text-amber-400">⚡</span>
              <span>Buy now</span>
            </button>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!allowAddToCart}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${
                !allowAddToCart
                  ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <FiShoppingBag size={14} /> Add to cart
            </button>

            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--shop-brand-border)] bg-[var(--shop-brand-soft)] px-3 py-2.5 text-xs font-semibold text-[var(--shop-brand-text)] hover:bg-[var(--shop-brand-soft-strong)]"
              >
                <FiMessageCircle size={14} /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex w-full h-full min-w-0 flex-col justify-between rounded-2xl border border-gray-100 bg-white p-3 shadow-xs transition-all duration-300 hover:border-[var(--shop-brand-border)] hover:shadow-xl">
      <div>
        <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-xl bg-gray-100">
          <span className="absolute left-2.5 top-2.5 z-10 max-w-[70%] truncate rounded bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-gray-800 shadow-xs backdrop-blur-sm">
            {p.category?.name}
          </span>
          {hasSale && (
            <span className="absolute right-2.5 top-2.5 z-10 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs">
              {discountPercent}% off
            </span>
          )}
          <Link href={productUrl(p.slug, p.name, p.id)} className="block h-full w-full">
            <ProductImage
              src={img}
              alt={p.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover object-top transition duration-500 group-hover:scale-105"
            />
          </Link>
          {onWishlist && (
            <button
              onClick={(e) => onWishlist(p.id, e)}
              aria-label="Wishlist"
              className="absolute bottom-2.5 right-2.5 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-gray-600 shadow-md backdrop-blur-sm transition hover:text-rose-500"
            >
              <FiHeart size={15} fill={wishlisted ? "#ef4444" : "none"} className={wishlisted ? "text-rose-500" : ""} />
            </button>
          )}
        </div>

        <Link
              href={productUrl(p.slug, p.name, p.id)}
          className="mb-1 block text-sm sm:text-base font-bold leading-snug text-gray-900 line-clamp-2 min-h-[2.5rem] transition hover:text-[var(--shop-brand)]"
        >
          {p.name}
        </Link>

        <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-base sm:text-lg font-bold text-[var(--shop-brand)]">{money(displayPrice)}</span>
          {displayOriginal && (
            <span className="text-xs text-gray-500 line-through">{money(displayOriginal)}</span>
          )}
        </div>

        {sizes.length > 0 && (
          <div className="mb-3">
            <p className="mb-1 text-[11px] font-medium text-gray-600">
                  Size:
              {selectedSize && <span className="ml-1 font-bold text-[var(--shop-brand)]">({selectedSize})</span>}
            </p>
            <div className="flex flex-wrap items-center gap-1">
              {sizes.map((size) => {
                const sv = (p.variations ?? []).find((v) =>
                  v.attributes.some((va) => va.value.value === size)
                );
                const oos = sv ? sv.stock <= 0 : false;
                const sel = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[32px] rounded px-1.5 py-0.5 text-center text-[11px] font-semibold leading-tight transition ${
                      oos
                        ? sel
                          ? "border-2 border-gray-400 bg-gray-300 text-gray-700 shadow-sm"
                          : "border border-dashed border-gray-300 bg-gray-50 text-gray-500"
                        : sel
                        ? "border-2 border-[var(--shop-brand)] bg-[var(--shop-brand)] text-white shadow-sm"
                        : "border border-gray-200 bg-gray-50 text-gray-700 hover:border-[var(--shop-brand)] hover:bg-[var(--shop-brand-soft)]"
                    }`}
                  >
                    {size}
                    {oos ? " ✕" : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={handleBuyNow}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--shop-brand)] px-3 py-2.5 text-center text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-[var(--shop-brand-hover)] active:scale-95"
        >
          <span className="text-amber-400 flex-shrink-0">⚡</span>
          <span className="truncate">Buy now</span>
        </button>

        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!allowAddToCart}
            className={`flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
              !allowAddToCart
                ? "cursor-not-allowed bg-gray-100 text-gray-500"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <FiShoppingBag size={12} className="flex-shrink-0" />
            <span className="truncate text-[11px]">Add to cart</span>
          </button>

          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 rounded-lg border border-[var(--shop-brand-border)] bg-[var(--shop-brand-soft)] px-2 py-1.5 text-xs font-semibold text-[var(--shop-brand-text)] hover:bg-[var(--shop-brand-soft-strong)]"
            >
              <FiMessageCircle size={12} className="flex-shrink-0" />
              <span className="truncate text-[11px]">WhatsApp</span>
            </a>
          ) : (
            <span className="flex items-center justify-center gap-1 rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5 text-xs text-gray-400">
              <FiMessageCircle size={12} className="flex-shrink-0" />
              <span className="truncate text-[11px]">WhatsApp</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MAIN SHOP VIEW COMPONENT                                                   */
/* -------------------------------------------------------------------------- */
export type ShopViewProps = {
  initialLayout?: "classic" | "catalog";
  initialProducts?: Product[];
  initialCategories?: Category[];
  initialStatus?: StoreStatusResult;
};

function priceCap(list: Product[]): number {
  if (!list.length) return 0;
  const maxP = Math.max(...list.map((p) => Number(p.salePrice && Number(p.salePrice) < Number(p.price) ? p.salePrice : p.price)));
  return Math.ceil(maxP / 500) * 500 || 10000;
}

export function ShopView({ initialLayout = "classic", initialProducts, initialCategories, initialStatus }: ShopViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State initialization from URL query parameters
  const initialCategory = searchParams.get("category") ?? "all";
  const initialQuery = searchParams.get("q") ?? "";
  const initialSale = searchParams.get("sale") === "true";
  const initialCap = initialProducts ? priceCap(initialProducts) : 0;

  const [products, setProducts] = useState<Product[]>(initialProducts ?? []);
  const [categories, setCategories] = useState<Category[]>(initialCategories ?? []);
  const [loading, setLoading] = useState(!initialProducts);

  // Filters State
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(initialSale);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number>(initialCap || 100000);
  const [maxPriceLimit, setMaxPriceLimit] = useState<number>(initialCap || 10000);

  // Layout & Sort State
  const [sortBy, setSortBy] = useState<"newest" | "price-asc" | "price-desc" | "discount" | "name">("newest");
  const [layoutMode, setLayoutMode] = useState<"grid-4" | "grid-3" | "grid-2" | "list">("grid-3");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(SHOP_PAGE_SIZE);

  // Extra config
  const [allowAddToCart, setAllowAddToCart] = useState(initialStatus?.config?.featureFlags?.addToCart !== false);
  const [chatConfig, setChatConfig] = useState<{ whatsapp?: { enabled?: boolean; number?: string } } | null>(initialStatus?.config?.chatConfig ?? null);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [activeLayout, setActiveLayout] = useState<"classic" | "catalog">(() => {
    if (initialStatus?.config?.homePageConfig?.layout) return initialStatus.config.homePageConfig.layout;
    if (initialLayout) return initialLayout;
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("epic_home_config");
        if (saved) {
          const cfg = JSON.parse(saved);
          if (cfg?.layout) return cfg.layout;
        }
      } catch {}
    }
    return initialLayout;
  });

  const hasInitial = Boolean(initialProducts && initialCategories && initialStatus);

  // Fetch initial data
  useEffect(() => {
    if (hasInitial) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`${apiUrl}/api/products`).then((r) => r.json()),
      fetch(`${apiUrl}/api/categories`).then((r) => r.json()),
      getStoreStatus(),
    ])
      .then(([prods, cats, status]) => {
        const prodList: Product[] = Array.isArray(prods) ? prods : [];
        setProducts(prodList);
        setCategories(Array.isArray(cats) ? cats : []);

        // Calculate max price from products
        if (prodList.length > 0) {
          const limit = priceCap(prodList);
          setMaxPriceLimit(limit);
          setPriceMax(limit);
        }

        setAllowAddToCart(status?.config?.featureFlags?.addToCart !== false);
        setChatConfig(status?.config?.chatConfig);
        if (status?.config?.homePageConfig?.layout) {
          setActiveLayout(status.config.homePageConfig.layout);
          try {
            localStorage.setItem("epic_home_config", JSON.stringify(status.config.homePageConfig));
          } catch {}
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [hasInitial]);

  // Fetch wishlist (session cookie, if signed in)
  useEffect(() => {
    fetch(`${apiUrl}/api/wishlist`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Array<{ productId: string }>) => setWishlist(list.map((i) => i.productId)))
      .catch(() => {});
  }, []);

  const whatsapp =
    chatConfig?.whatsapp?.enabled && chatConfig.whatsapp.number
      ? `https://wa.me/${waNumber(chatConfig.whatsapp.number)}`
      : null;

  // Extract all available size options from products
  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      p.attributes?.forEach((attr) => {
        if (/size/i.test(attr.name)) {
          attr.values.forEach((v) => set.add(v.value));
        }
      });
      p.variations?.forEach((v) => {
        v.attributes.forEach((va) => {
          if (va.value?.value) set.add(va.value.value);
        });
      });
    });
    return Array.from(set);
  }, [products]);

  // Count items per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach((cat) => {
      counts[cat.slug] = products.filter(
        (p) => p.categoryId === cat.id || p.categoryLinks?.some((link) => link.categoryId === cat.id) || p.category?.slug === cat.slug
      ).length;
    });
    return counts;
  }, [categories, products]);

  // Cart actions
  function addToCart(p: Product, variation?: Variation) {
    const price = variation
      ? Number(variation.salePrice && variation.salePrice < variation.price ? variation.salePrice : variation.price)
      : Number(p.salePrice && Number(p.salePrice) < Number(p.price) ? p.salePrice : p.price);
    const sku = variation?.sku ?? p.slug;
    const variationId = variation?.id;
    const old = JSON.parse(localStorage.getItem("epic-cart") ?? "[]");
    const key = variationId ? `${p.id}__${variationId}` : p.id;
    const displayName = variation ? `${p.name} (${variation.name})` : p.name;
    const hit = old.find((i: CartItem) => i.id === key);
    const item: CartItem = {
      id: key,
      slug: p.slug,
      name: displayName,
      images: variation?.image ? [variation.image, ...p.images] : p.images,
      price,
      categoryId: p.categoryId,
      categoryIds: [...new Set([p.categoryId, ...(p.categoryLinks ?? []).map((link) => link.categoryId)])],
      qty: hit ? hit.qty + 1 : 1,
      variationId,
      sku,
    };
    localStorage.setItem(
      "epic-cart",
      JSON.stringify(hit ? old.map((i: CartItem) => (i.id === key ? item : i)) : [...old, item])
    );
    toast.success("Added to cart.");
  }

  function buyNowAction(p: Product, variation?: Variation) {
    addToCart(p, variation);
    window.location.href = "/checkout";
  }

  function handleWishlistToggle(id: string, e: React.MouseEvent) {
    e.preventDefault();
    const isWishlisted = wishlist.includes(id);
    fetch(`${apiUrl}/api/wishlist/${id}`, {
      method: "POST",
    }).then((response) => {
      if (response.status === 401) {
        toast.error("Please sign in first.");
        throw new Error("unauthorized");
      }
      if (!response.ok) throw new Error("Could not update wishlist");
      setWishlist((prev) => (isWishlisted ? prev.filter((i) => i !== id) : [...prev, id]));
    }).catch((error) => {
      if (error instanceof Error && error.message === "unauthorized") return;
      toast.error("Could not update wishlist");
    });
  }

  // Filter products based on active filter options
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesDesc = stripHtml(p.description).toLowerCase().includes(q);
        const matchesCat = p.category?.name.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }

      // 2. Category Filter
      if (selectedCategory !== "all") {
        const matchesCat =
          p.category?.slug === selectedCategory ||
          p.categoryId === selectedCategory ||
          categories.find((c) => c.slug === selectedCategory)?.id === p.categoryId ||
          Boolean(categories.find((c) => c.slug === selectedCategory && p.categoryLinks?.some((link) => link.categoryId === c.id)));
        if (!matchesCat) return false;
      }

      // 3. Price Filter
      const pPrice = Number(p.salePrice && Number(p.salePrice) < Number(p.price) ? p.salePrice : p.price);
      if (pPrice < priceMin || pPrice > priceMax) return false;

      // 4. In Stock Filter
      if (inStockOnly) {
        const hasStock =
          p.productType === "VARIABLE"
            ? (p.variations ?? []).some((v) => v.stock > 0)
            : true;
        if (!hasStock) return false;
      }

      // 5. On Sale Filter
      if (onSaleOnly) {
        const hasSale = Boolean(p.salePrice && Number(p.salePrice) < Number(p.price));
        if (!hasSale) return false;
      }

      // 6. Sizes Filter
      if (selectedSizes.length > 0) {
        const pSizes = (p.attributes ?? [])
          .filter((a) => /size/i.test(a.name))
          .flatMap((a) => a.values.map((v) => v.value));
        const varSizes = (p.variations ?? []).flatMap((v) =>
          v.attributes.map((va) => va.value?.value).filter(Boolean)
        );
        const allProductSizes = [...pSizes, ...varSizes];
        const matchesSize = selectedSizes.some((s) => allProductSizes.includes(s));
        if (!matchesSize) return false;
      }

      return true;
    });
  }, [
    products,
    categories,
    searchQuery,
    selectedCategory,
    priceMin,
    priceMax,
    inStockOnly,
    onSaleOnly,
    selectedSizes,
  ]);

  // Sort products based on selected sort option
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    if (sortBy === "price-asc") {
      list.sort((a, b) => {
        const pa = Number(a.salePrice && Number(a.salePrice) < Number(a.price) ? a.salePrice : a.price);
        const pb = Number(b.salePrice && Number(b.salePrice) < Number(b.price) ? b.salePrice : b.price);
        return pa - pb;
      });
    } else if (sortBy === "price-desc") {
      list.sort((a, b) => {
        const pa = Number(a.salePrice && Number(a.salePrice) < Number(a.price) ? a.salePrice : a.price);
        const pb = Number(b.salePrice && Number(b.salePrice) < Number(b.price) ? b.salePrice : b.price);
        return pb - pa;
      });
    } else if (sortBy === "discount") {
      list.sort((a, b) => {
        const getDisc = (p: Product) => {
          if (!p.salePrice || Number(p.salePrice) >= Number(p.price)) return 0;
          return Number(p.price) - Number(p.salePrice);
        };
        return getDisc(b) - getDisc(a);
      });
    } else if (sortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name, "bn"));
    }
    return list;
  }, [filteredProducts, sortBy]);

  useEffect(() => {
    setVisibleCount(SHOP_PAGE_SIZE);
  }, [searchQuery, selectedCategory, selectedSizes, priceMin, priceMax, inStockOnly, onSaleOnly, sortBy]);

  const visibleProducts = useMemo(
    () => sortedProducts.slice(0, visibleCount),
    [sortedProducts, visibleCount]
  );
  const hasMore = sortedProducts.length > visibleCount;

  function loadMore() {
    setVisibleCount((prev) => prev + SHOP_PAGE_SIZE);
  }

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setInStockOnly(false);
    setOnSaleOnly(false);
    setSelectedSizes([]);
    setPriceMin(0);
    setPriceMax(maxPriceLimit);
    setSortBy("newest");
  };

  // Toggle size selection
  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  // Active filters count for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedCategory !== "all") count++;
    if (inStockOnly) count++;
    if (onSaleOnly) count++;
    if (selectedSizes.length > 0) count += selectedSizes.length;
    if (priceMin > 0 || priceMax < maxPriceLimit) count++;
    return count;
  }, [searchQuery, selectedCategory, inStockOnly, onSaleOnly, selectedSizes, priceMin, priceMax, maxPriceLimit]);

  /* -------------------------------------------------------------------------- */
  /* RENDER SIDEBAR CONTENT                                                    */
  /* -------------------------------------------------------------------------- */
  const renderSidebarContent = () => (
    <div className="space-y-6">
      {/* Search Input */}
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Search</h3>
        <div className="relative">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/70 py-2.5 pl-9 pr-8 text-xs sm:text-sm text-gray-900 transition focus:border-[var(--shop-brand)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--shop-brand)]"
          />
          <FiSearch className="absolute left-3 top-3 text-gray-400" size={15} />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <FiX size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Category List */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Categories</h3>
          {selectedCategory !== "all" && (
            <button
              onClick={() => setSelectedCategory("all")}
              className="text-[11px] font-semibold text-[var(--shop-brand)] hover:underline"
            >
              View all
            </button>
          )}
        </div>
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition ${
              selectedCategory === "all"
                ? "bg-[var(--shop-brand)] text-white shadow-sm"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <span>All products</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${selectedCategory === "all" ? "bg-[var(--shop-brand-hover)] text-white" : "bg-gray-100 text-gray-500"}`}>
              {products.length}
            </span>
          </button>

          {categories.map((cat) => {
            const count = categoryCounts[cat.slug] ?? 0;
            const isSelected = selectedCategory === cat.slug || selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition ${
                  isSelected
                    ? "bg-[var(--shop-brand)] text-white shadow-sm font-bold"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="truncate">{cat.name}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isSelected ? "bg-[var(--shop-brand-hover)] text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Filter */}
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Price range</h3>

        {/* Range Text Inputs */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex-1">
            <span className="text-[10px] text-gray-400">Minimum</span>
            <input
              type="number"
              value={priceMin}
              onChange={(e) => setPriceMin(Math.max(0, Number(e.target.value)))}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-bold text-gray-800"
            />
          </div>
          <span className="mt-3 text-gray-400">-</span>
          <div className="flex-1">
            <span className="text-[10px] text-gray-400">Maximum</span>
            <input
              type="number"
              value={priceMax}
              onChange={(e) => setPriceMax(Math.min(maxPriceLimit, Number(e.target.value)))}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-bold text-gray-800"
            />
          </div>
        </div>

        {/* Range Slider */}
        <input
          type="range"
          min={0}
          max={maxPriceLimit}
          step={100}
          value={priceMax}
          onChange={(e) => setPriceMax(Number(e.target.value))}
          className="w-full accent-[var(--shop-brand)]"
        />

      </div>

      {/* Toggles: Stock & Discount */}
      <div className="space-y-3 pt-2 border-t border-gray-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Filter options</h3>

        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-2.5 hover:bg-gray-100/60">
          <span className="text-xs font-semibold text-gray-800">In-stock products only</span>
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="h-4 w-4 rounded accent-[var(--shop-brand)]"
          />
        </label>

        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-100 bg-rose-50/40 p-2.5 hover:bg-rose-50/70">
          <span className="text-xs font-semibold text-rose-900">On sale</span>
          <input
            type="checkbox"
            checked={onSaleOnly}
            onChange={(e) => setOnSaleOnly(e.target.checked)}
            className="h-4 w-4 rounded accent-rose-600"
          />
        </label>
      </div>

      {/* Size Options */}
      {availableSizes.length > 0 && (
        <div className="pt-2 border-t border-gray-100">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Size filter</h3>
            {selectedSizes.length > 0 && (
              <button
                onClick={() => setSelectedSizes([])}
                className="text-[11px] font-semibold text-rose-600 hover:underline"
              >
                Reset
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableSizes.map((size) => {
              const active = selectedSizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`min-w-[38px] rounded-lg px-2.5 py-1.5 text-center text-xs font-bold transition ${
                    active
                      ? "border-2 border-[var(--shop-brand)] bg-[var(--shop-brand)] text-white shadow-sm"
                      : "border border-gray-200 bg-white text-gray-700 hover:border-[var(--shop-brand)] hover:bg-[var(--shop-brand-soft)]"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Clear Filters Button */}
      {activeFiltersCount > 0 && (
        <button
          onClick={resetFilters}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 active:scale-98"
        >
          <FiRefreshCw size={13} />
          <span>Clear filters ({activeFiltersCount})</span>
        </button>
      )}
    </div>
  );

  return (
    <main
      className={`min-h-screen bg-gray-50/50 pb-16 ${
        activeLayout === "classic" ? "shop-theme-classic" : "shop-theme-catalog"
      }`}
    >
      {/* -------------------------------------------------------------------------- */}
      {/* SHOP HERO HEADER BANNER                                                    */}
      {/* -------------------------------------------------------------------------- */}
      {activeLayout === "classic" ? (
      <section className="border-b border-slate-100 bg-gradient-to-br from-white via-slate-50 to-white py-10 px-4">
        <div className="mx-auto max-w-7xl">
          <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Link href="/" className="hover:text-[var(--shop-brand)] transition">Home</Link>
            <span className="opacity-40">/</span>
            <span className="font-bold text-slate-900">Shop</span>
            {selectedCategory !== "all" && (
              <>
                <span className="opacity-40">/</span>
                <span className="font-semibold text-[var(--shop-brand)]">
                  {categories.find((c) => c.slug === selectedCategory)?.name ?? selectedCategory}
                </span>
              </>
            )}
          </nav>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="eyebrow">
                ALL PRODUCTS · ONE PLATFORM
              </span>
              <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900">
                Explore our collection
                <span className="gradient-text"> all in one place</span>
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-xl">
                Find clothing and accessories at great prices, delivered quickly to your door.
              </p>
            </div>

            <div className="w-full md:w-80">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search any product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 pl-10 text-xs sm:text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-[var(--shop-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--shop-brand)]"
                />
                <FiSearch className="absolute left-3.5 top-3 text-slate-400" size={16} />
              </div>
            </div>
          </div>
        </div>
      </section>
      ) : (
      <section className="bg-gradient-to-r from-[#031d14] via-[var(--shop-brand)] to-[#12573d] text-white py-10 px-4">
        <div className="mx-auto max-w-7xl">
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs font-medium text-emerald-200/90">
            <Link href="/" className="hover:text-amber-300 transition">Home</Link>
            <span className="opacity-40">/</span>
            <span className="text-amber-400 font-bold">Shop</span>
            {selectedCategory !== "all" && (
              <>
                <span className="opacity-40">/</span>
                <span className="capitalize text-white">
                  {categories.find((c) => c.slug === selectedCategory)?.name ?? selectedCategory}
                </span>
              </>
            )}
          </nav>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300 backdrop-blur-md mb-2">
                <FiShoppingBag size={13} /> Shop all products in one place
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                Explore our collection
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-emerald-100/90 max-w-xl">
                Find clothing and accessories at great prices, delivered quickly to your door.
              </p>
            </div>

            {/* Header Search Box */}
            <div className="w-full md:w-80">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search any product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-emerald-600/50 bg-white/10 px-4 py-2.5 pl-10 text-xs sm:text-sm text-white placeholder-emerald-200/60 backdrop-blur-md transition focus:bg-white focus:text-gray-900 focus:placeholder-gray-400 focus:outline-none"
                />
                <FiSearch className="absolute left-3.5 top-3 text-emerald-200" size={16} />
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* QUICK CATEGORY CHIPS SCROLLER                                             */}
      {/* -------------------------------------------------------------------------- */}
      <section className="border-b border-gray-200 bg-white shadow-xs">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                selectedCategory === "all"
                  ? "bg-[var(--shop-brand)] text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All products ({products.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.slug)}
                className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  selectedCategory === c.slug
                    ? "bg-[var(--shop-brand)] text-white shadow-sm font-bold"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {c.name} ({categoryCounts[c.slug] ?? 0})
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------------- */}
      {/* MAIN CONTAINER: SIDEBAR + PRODUCT GRID                                     */}
      {/* -------------------------------------------------------------------------- */}
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* DESKTOP SIDEBAR (Left column, 3 cols wide) */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
                <FiSliders className="text-[var(--shop-brand)]" />
                <span>Filters</span>
              </h2>
              {activeFiltersCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
            {renderSidebarContent()}
          </aside>

          {/* MAIN PRODUCT LIST SECTION (Right column, 9 cols wide) */}
          <section className="lg:col-span-9">
            {/* TOP TOOLBAR & CONTROLS */}
            <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              {/* Left summary & Mobile filter trigger button */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {selectedCategory === "all"
                      ? "All products"
                      : categories.find((c) => c.slug === selectedCategory)?.name ?? "Product list"}
                  </h2>
                  <p className="text-xs text-gray-500">
                    <span className="font-bold text-[var(--shop-brand)]">{sortedProducts.length}</span> products found
                  </p>
                </div>

                {/* Mobile Filter Button */}
                <button
                  onClick={() => setMobileFilterOpen(true)}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-[var(--shop-brand-soft)] px-3.5 py-2 text-xs font-bold text-[var(--shop-brand)] lg:hidden hover:bg-[var(--shop-brand-soft-strong)] active:scale-95"
                >
                  <FiFilter size={14} />
                  <span>Filter</span>
                  {activeFiltersCount > 0 && (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--shop-brand)] text-[10px] font-extrabold text-white">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Right Sort & Layout mode controls */}
              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-gray-100 sm:border-t-0">
                {/* Sort Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 hidden min-[400px]:inline">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="rounded-xl border border-gray-200 bg-gray-50 py-2 px-3 text-xs font-bold text-gray-800 transition focus:border-[var(--shop-brand)] focus:bg-white focus:outline-none"
                  >
                    <option value="newest">Newest</option>
                    <option value="price-asc">Price: low to high</option>
                    <option value="price-desc">Price: high to low</option>
                    <option value="discount">Largest discount</option>
                    <option value="name">Name (A to Z)</option>
                  </select>
                </div>

                {/* Grid Layout Switcher */}
                <div className="hidden min-[480px]:flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1">
                  <button
                    onClick={() => setLayoutMode("grid-4")}
                    title="4 Columns"
                    className={`hidden xl:block rounded-lg p-1.5 transition ${
                      layoutMode === "grid-4" ? "bg-white text-[var(--shop-brand)] shadow-xs" : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <FiGrid size={15} />
                  </button>
                  <button
                    onClick={() => setLayoutMode("grid-3")}
                    title="3 Columns"
                    className={`rounded-lg p-1.5 transition ${
                      layoutMode === "grid-3" ? "bg-white text-[var(--shop-brand)] shadow-xs" : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <FiGrid size={15} />
                  </button>
                  <button
                    onClick={() => setLayoutMode("grid-2")}
                    title="2 Columns"
                    className={`rounded-lg p-1.5 transition ${
                      layoutMode === "grid-2" ? "bg-white text-[var(--shop-brand)] shadow-xs" : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <FiGrid size={15} />
                  </button>
                  <button
                    onClick={() => setLayoutMode("list")}
                    title="List View"
                    className={`rounded-lg p-1.5 transition ${
                      layoutMode === "list" ? "bg-white text-[var(--shop-brand)] shadow-xs" : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <FiList size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* ACTIVE FILTER BADGES / TAGS */}
            {activeFiltersCount > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2 bg-[var(--shop-brand-soft)] rounded-xl p-3 border border-[var(--shop-brand-border)]">
                <span className="text-xs font-bold text-[var(--shop-brand-text-strong)] flex items-center gap-1">
                  <FiTag size={12} /> Active filters:
                </span>

                {searchQuery && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 shadow-xs border border-[var(--shop-brand-border)]">
                    Search: &quot;{searchQuery}&quot;
                    <button onClick={() => setSearchQuery("")} className="ml-0.5 text-gray-400 hover:text-rose-600">
                      <FiX size={12} />
                    </button>
                  </span>
                )}

                {selectedCategory !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 shadow-xs border border-[var(--shop-brand-border)]">
                    Category: {categories.find((c) => c.slug === selectedCategory)?.name ?? selectedCategory}
                    <button onClick={() => setSelectedCategory("all")} className="ml-0.5 text-gray-400 hover:text-rose-600">
                      <FiX size={12} />
                    </button>
                  </span>
                )}

                {(priceMin > 0 || priceMax < maxPriceLimit) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 shadow-xs border border-[var(--shop-brand-border)]">
                    Price: {money(priceMin)} - {money(priceMax)}
                    <button onClick={() => { setPriceMin(0); setPriceMax(maxPriceLimit); }} className="ml-0.5 text-gray-400 hover:text-rose-600">
                      <FiX size={12} />
                    </button>
                  </span>
                )}

                {inStockOnly && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 shadow-xs border border-[var(--shop-brand-border)]">
                    In stock
                    <button onClick={() => setInStockOnly(false)} className="ml-0.5 text-gray-400 hover:text-rose-600">
                      <FiX size={12} />
                    </button>
                  </span>
                )}

                {onSaleOnly && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-rose-800 shadow-xs border border-rose-200">
                    On sale
                    <button onClick={() => setOnSaleOnly(false)} className="ml-0.5 text-gray-400 hover:text-rose-600">
                      <FiX size={12} />
                    </button>
                  </span>
                )}

                {selectedSizes.map((size) => (
                  <span key={size} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 shadow-xs border border-[var(--shop-brand-border)]">
                    Size: {size}
                    <button onClick={() => toggleSize(size)} className="ml-0.5 text-gray-400 hover:text-rose-600">
                      <FiX size={12} />
                    </button>
                  </span>
                ))}

                <button
                  onClick={resetFilters}
                  className="ml-auto text-xs font-bold text-rose-600 hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* PRODUCT GRID DISPLAY */}
            {loading ? (
              <ProductGridSkeleton count={8} className="py-12 lg:grid-cols-4 xl:grid-cols-4" />
            ) : sortedProducts.length > 0 ? (
              <>
                <div
                  className={
                    layoutMode === "list"
                      ? "space-y-4"
                      : layoutMode === "grid-4"
                      ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4"
                      : layoutMode === "grid-2"
                      ? "grid grid-cols-1 gap-4 min-[480px]:grid-cols-2"
                      : "grid grid-cols-2 gap-3 sm:grid-cols-3"
                  }
                >
                  {visibleProducts.map((p) =>
                    layoutMode === "list" ? (
                      <ShopProductCard
                        key={p.id}
                        p={p}
                        allowAddToCart={allowAddToCart}
                        add={addToCart}
                        buyNow={buyNowAction}
                        whatsapp={whatsapp}
                        isList
                        wishlisted={wishlist.includes(p.id)}
                        onWishlist={handleWishlistToggle}
                      />
                    ) : activeLayout === "classic" ? (
                      <MiniProductCard
                        key={p.id}
                        p={p}
                        onAdd={() => addToCart(p)}
                        buyNow={() => buyNowAction(p)}
                        allowAddToCart={allowAddToCart}
                        wishlisted={wishlist.includes(p.id)}
                        onWishlist={handleWishlistToggle}
                        fill
                      />
                    ) : (
                      <CatalogCard
                        key={p.id}
                        p={p}
                        allowAddToCart={allowAddToCart}
                        add={addToCart}
                        buyNow={buyNowAction}
                        whatsapp={whatsapp}
                        fill
                      />
                    )
                  )}
                </div>
                {hasMore && (
                  <div className="mt-10 flex flex-col items-center gap-3">
                    <button
                      type="button"
                      onClick={loadMore}
                      className="inline-flex items-center gap-2 rounded-full bg-[var(--shop-brand)] px-8 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[var(--shop-brand-hover)] active:scale-95"
                    >
                      <FiRefreshCw size={14} />
                      <span>Show more ({sortedProducts.length - visibleCount} remaining)</span>
                    </button>
                    <span className="text-xs text-gray-400">
                      {visibleCount} / {sortedProducts.length} shown
                    </span>
                  </div>
                )}
              </>
            ) : (
              /* EMPTY NO RESULTS STATE */
              <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-xs">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--shop-brand-soft)] text-[var(--shop-brand)]">
                  <FiSearch size={28} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 sm:text-xl">
                  No products found
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
                  No products match your filters or search. Try adjusting your filters and searching again.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--shop-brand)] px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition hover:bg-[var(--shop-brand-hover)] active:scale-95"
                >
                  <FiRefreshCw size={14} />
                  <span>Reset all filters</span>
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* MOBILE FILTER SLIDE-OVER DRAWER MODAL                                      */}
      {/* -------------------------------------------------------------------------- */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileFilterOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="w-screen max-w-md bg-white p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
                  <div className="flex items-center gap-2">
                    <FiSliders className="text-[var(--shop-brand)]" size={18} />
                    <h2 className="text-lg font-bold text-gray-900">Choose filters</h2>
                  </div>
                  <button
                    onClick={() => setMobileFilterOpen(false)}
                    className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <FiX size={20} />
                  </button>
                </div>

                {renderSidebarContent()}
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100 sticky bottom-0 bg-white">
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--shop-brand)] py-3 text-sm font-bold text-white shadow-md active:scale-98"
                >
                  <FiCheck size={16} />
                  <span>View results ({sortedProducts.length} products)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
