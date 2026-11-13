"use client";
import { formatMoney } from "../api/lib/money";

import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Input, Select, SelectItem, Switch, Textarea } from "@heroui/react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AdminSkeleton } from "./skeletons";
import { RichTextEditor } from "./rich-text";
import { productUrl } from "../lib/product-url";
import { FiArrowDown, FiArrowUp, FiBox, FiCheck, FiChevronDown, FiCopy, FiEdit2, FiEye, FiEyeOff, FiExternalLink, FiImage, FiLayers, FiLoader, FiMail, FiMenu, FiPhone, FiPlus, FiPrinter, FiRefreshCw, FiSend, FiShuffle, FiStar, FiTag, FiTrash2, FiTruck, FiUpload, FiUser, FiX } from "react-icons/fi";

const apiUrl = "";
const reviewerDemo = { email: "reviewer@epic-store.example.com", password: "EpicReview-2026!" };

type PromoBannerDef = {
  enabled?: boolean;
  badge?: string;
  title?: string;
  accent?: string;
  subtitle?: string;
  buttonLabel?: string;
  buttonLink?: string;
  image?: string;
};

type TrustBadgeDef = {
  enabled?: boolean;
  icon?: string;
  title?: string;
  subtitle?: string;
};

type HomePageConfigShape = {
  sections: HomeSectionDef[];
  homepageCategories?: HomepageCategoriesSettings;
  layout?: "classic" | "catalog";
  sectionVisibility?: Partial<Record<"hero" | "categories" | "products" | "collections" | "trust" | "promos" | "announcement", boolean>>;
  categories?: CategoryDisplay & { eyebrow?: string; title?: string; accent?: string; countLabel?: string };
  popularProducts?: { eyebrow?: string; title?: string; limit?: number; mode?: "slider" | "grid"; auto?: boolean };
  promoBanners?: PromoBannerDef[];
  trustBadges?: TrustBadgeDef[];
  testimonials?: {
    enabled?: boolean;
    eyebrow?: string;
    title?: string;
    accent?: string;
    subtitle?: string;
    items?: { init?: string; image?: string; name?: string; role?: string; quote?: string; rating?: number }[];
  };
  footer?: {
    enabled?: boolean;
    brand?: string;
    logo?: string | null;
    slogan?: string;
    social?: { facebook?: string; youtube?: string; instagram?: string; whatsapp?: string; phone?: string };
    showCategories?: boolean;
    categoryTitle?: string;
    categoryLimit?: number;
    categories?: { label?: string; url?: string }[];
    contactTitle?: string;
    contact?: { address?: string; phone?: string; email?: string };
    copyright?: string;
    credit?: string;
    links?: { label?: string; url?: string }[];
  };
};

type HomepageCategoryEntry = {
  categoryId: string;
  visible: boolean;
  productLimit?: number | null;
  displayStyle?: "grid" | "slider" | "loop";
  auto?: boolean;
  loop?: boolean;
  seconds?: number;
  pagination?: boolean;
  perView?: { mobile: number; tablet: number; desktop: number };
};

type HomepageCategoriesSettings = {
  mode: "manual" | "automatic";
  defaultProductLimit: number | null;
  defaultDisplayStyle: "grid" | "slider" | "loop";
  defaultAuto: boolean;
  defaultLoop: boolean;
  defaultSeconds: number;
  defaultPagination: boolean;
  defaultPerView: { mobile: number; tablet: number; desktop: number };
  defaultOrder: "alphabetical" | "newest";
  categories: HomepageCategoryEntry[];
};

type Config = {
  storeName: string;
  logoUrl?: string | null;
  adminAdvanced: boolean;
  reviewerDemo?: boolean;
  currency: string;
  themeSettings?: { primaryColor?: string; secondaryColor?: string; font?: string };
  featureFlags: { cod: boolean; reviews: boolean; wishlist: boolean; coupons: boolean; addToCart: boolean; checkoutEmail: boolean; bottomNav: boolean; productCallButton?: boolean; productWhatsappButton?: boolean };
  paymentConfig?: {
    bkash?: { enabled: boolean; mode?: string; callbackUrl?: string; appKey?: string; appSecret?: string; username?: string; password?: string };
    nagad?: { enabled: boolean; mode?: string; callbackUrl?: string; merchantId?: string; merchantNumber?: string; privateKey?: string };
    sslcommerz?: { enabled: boolean; mode?: string; callbackUrl?: string; sandbox?: boolean; storeId?: string; storePassword?: string };
  };
  emailConfig?: { host: string; port: number; user: string; pass: string; fromEmail: string };
  checkoutForm?: Record<string, { enabled?: boolean; required?: boolean; label?: string; placeholder?: string }> | null;
  shippingConfig?: {
    defaultCharge?: number;
    options?: { id?: string; name?: string; charge?: number }[];
  };
  courierConfig?: {
    steadfast?: { enabled: boolean; apiKey?: string; secretKey?: string };
    pathao?: { enabled: boolean; clientId?: string; clientSecret?: string; clientEmail?: string };
    redx?: { enabled: boolean; apiKey?: string };
  };
  aiConfig?: { provider: string; apiKey: string; systemPromptOverride?: string };
  emailConfigured: boolean;
  courierConfigured: boolean;
  storageConfigured: boolean;
  stripeConfigured: boolean;
  stripeTestMode: boolean;
  storageConfig?: {
    provider: "local" | "hostinger-object-storage";
    folderPath?: string;
    publicBaseUrl?: string;
    endpoint?: string;
    region?: string;
    bucket?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
  enableIpLimit: boolean;
  cooldownMinutes: number;
  marketingPixels?: { googleAnalyticsId?: string; metaPixelId?: string; tiktokPixelId?: string; gtmId?: string };
  chatConfig?: { enabled?: boolean; whatsapp?: { enabled?: boolean; number?: string; template?: string }; messenger?: { enabled?: boolean; url?: string }; phone?: string };
  homePageConfig?: HomePageConfigShape;
  heroBannerConfig?: HeroBannerConfig | null;
  navigationConfig?: { menus: { id: string; label: string; location: string; items: MenuItem[] }[] };
};

type HomeSectionDef = {
  id: string;
  title?: string;
  categoryIds: string[];
  mode: "carousel" | "grid" | "responsive" | "infinite";
  productLimit?: number;
  auto: boolean;
  seconds: number;
  perView: { mobile: number; tablet: number; desktop: number };
  pagination: boolean;
  loop: boolean;
  showViewAll: boolean;
};

type HeroBannerConfig = {
  enabled?: boolean;
  image?: string | null;
  badge?: string | null;
  title?: string | null;
  accent?: string | null;
  cardLabel?: string | null;
  cardText?: string | null;
  cardLink?: string | null;
  subtitle?: string | null;
  buttonLabel?: string | null;
  buttonLink?: string | null;
  secondaryLabel?: string | null;
  secondaryLink?: string | null;
  announceEnabled?: boolean;
  announceText?: string | null;
  announceBadge?: string | null;
  announceLinkLabel?: string | null;
  announceLink?: string | null;
  seconds?: number;
  trendingPill?: {
    enabled?: boolean;
    topText?: string | null;
    bottomText?: string | null;
  };
  slides?: {
    id: string;
    image?: string | null;
    badge?: string | null;
    title?: string | null;
    accent?: string | null;
    cardLabel?: string | null;
    cardText?: string | null;
    cardLink?: string | null;
    subtitle?: string | null;
    buttonLabel?: string | null;
    buttonLink?: string | null;
    secondaryLabel?: string | null;
    secondaryLink?: string | null;
  }[];
};

type ProductImageDetail = {
  id: string;
  url: string;
  altText: string | null;
  title: string | null;
  sortOrder: number;
  isFeatured: boolean;
};

type AttributeValue = { id: string; value: string; colorSwatch?: string | null; image?: string | null };

type ProductAttribute = { id: string; name: string; values: AttributeValue[] };

type VariationAttributeLink = {
  id?: string;
  attributeId: string;
  attribute?: { id: string; name: string };
  valueId: string;
  value?: AttributeValue;
};

type Variation = {
  id: string;
  name: string;
  sku: string | null;
  price: string;
  salePrice: string | null;
  stock: number;
  manageStock: boolean;
  weight: string | null;
  image: string | null;
  gallery: string[] | null;
  description: string | null;
  status: "active" | "disabled";
  isDefault: boolean;
  attributes: VariationAttributeLink[];
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string | null;
  categoryId: string;
  categoryLinks?: { categoryId: string }[];
  price: string;
  salePrice: string | null;
  stock: number;
  manageStock?: boolean;
  sku?: string | null;
  productType?: "SIMPLE" | "VARIABLE";
  images: string[];
  imagesDetails?: ProductImageDetail[];
  attributes?: ProductAttribute[];
  variations?: (Variation & { id: string })[];
  defaultVariationId?: string | null;
  variants?: { id: string; name: string; values: { id: string; value: string; image?: string }[] }[];
  variationImages?: Record<string, string>;
  isActive: boolean;
  showOnHome: boolean;
  category: { name: string };
};

type Order = {
  id: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  paymentStatus: string;
  paymentMethod: string;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  customerId: string | null;
  shippingDetails: { name?: string; phone?: string; email?: string; addressLine1?: string; addressLine2?: string; city?: string; state?: string; postalCode?: string; country?: string; shippingOptionName?: string; sfStatus?: string; sfSyncedAt?: string; sfConsignmentId?: string; sfTrackingCode?: string } | null;
  orderItems?: { name: string; qty: number; price: number; sku?: string }[];
  subtotal?: string;
  shippingCharge?: string;
  discountAmount?: string | null;
  coupon?: { code: string } | null;
  courierName?: string;
  courierTrackingId?: string;
};

type Category = { id: string; name: string; slug: string; image?: string | null; parentId?: string | null; subCategories?: Category[]; _count?: { products?: number } };
type MenuItem = { id: string; label: string; type: "category" | "custom"; categoryId?: string; href?: string; children: MenuItem[] };
type Coupon = { id: string; code: string; type: string; value: string; minSpend?: string; usedCount: number; isActive: boolean };
type Review = { id: string; rating: number; comment?: string; isApproved: boolean; product: { name: string }; user: { name: string; email: string } };
type StaffUser = { id: string; name: string; email: string; staffType: string; allowedCategories?: string };

const money = formatMoney;

// The session now travels in an httpOnly cookie. The second argument is kept
// (and ignored) so the hundreds of existing call sites stay unchanged.
const api = (path: string, _token?: string, init?: RequestInit) =>
  fetch(apiUrl + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber/10 text-amber",
  CONFIRMED: "bg-primary/10 text-primary",
  IN_COURIER: "bg-indigo-500/10 text-indigo-500",
  SHIPPED: "bg-blue-500/10 text-blue-500",
  DELIVERED: "bg-emerald/10 text-emerald",
  CANCELLED: "bg-rose-100 dark:bg-rose-500/10 text-rose-500",
};

const statusPill = (status: string) => STATUS_COLORS[status] ?? "bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-slate-400";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  IN_COURIER: "In Courier",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

type Section = "overview" | "products" | "media" | "categories" | "orders" | "customers" | "coupons" | "reviews" | "staff" | "home" | "banner" | "menu" | "marketing" | "features" | "payments" | "settings" | "delivery" | "checkout" | "storage";

const NAV: { key: Section; label: string; icon: string }[] = [
  { key: "overview", label: "Overview", icon: "◈" },
  { key: "products", label: "Products", icon: "▦" },
  { key: "media", label: "Media Library", icon: "▧" },
  { key: "categories", label: "Categories", icon: "▤" },
  { key: "orders", label: "Orders", icon: "⊞" },
  { key: "customers", label: "Customers", icon: "CU" },
  { key: "coupons", label: "Coupons", icon: "℅" },
  { key: "reviews", label: "Reviews", icon: "★" },
  { key: "staff", label: "Staff Team", icon: "◉" },
  { key: "home", label: "Homepage Settings", icon: "⌂" },
  { key: "banner", label: "Hero Banner", icon: "▰" },
  { key: "menu", label: "Menu Builder", icon: "☰" },
  { key: "marketing", label: "Pixels & Chat", icon: "⬡" },
  { key: "features", label: "Store Features", icon: "⊕" },
  { key: "payments", label: "Payments", icon: "¢" },
  { key: "settings", label: "Settings", icon: "ST" },
  { key: "delivery", label: "Delivery", icon: "◫" },
  { key: "checkout", label: "Checkout Form", icon: "▤" },
  { key: "storage", label: "Storage", icon: "▣" },
];

const title = (section: Section) => NAV.find((n) => n.key === section)?.label ?? "";
const BASIC_SECTIONS: Section[] = ["overview", "products", "categories", "orders", "customers", "coupons", "payments", "settings"];

// STAFF sub-role split. ADMIN (or legacy staff with no staffType) sees every
// section; each manager only sees the sections its API permissions allow.
const STAFF_SECTIONS: Record<string, Section[]> = {
  ORDER_MANAGER: ["overview", "orders", "delivery", "reviews"],
  PRODUCT_MANAGER: ["overview", "products", "media", "reviews"],
};

const categoryOptions = (categories: Category[]) =>
  categories
    .filter((c) => !c.parentId)
    .flatMap((c) => [c, ...(c.subCategories ?? categories.filter((s) => s.parentId === c.id))]);

const slugFromName = (name: string) =>
  name.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/(^-|-$)/g, "");

export function AdminPanel() {
  const [token, setToken] = useState("");
  const [config, setConfig] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<Section>(() => {
    if (typeof window === "undefined") return "overview";
    try {
      const saved = localStorage.getItem("epic-admin-section");
      return saved && NAV.some((n) => n.key === saved) ? (saved as Section) : "overview";
    } catch {
      return "overview";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("epic-admin-section", section);
    } catch {}
  }, [section]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const loginForm = useRef<HTMLFormElement>(null);
  const [staffScope, setStaffScope] = useState<{ role: string; staffType: string | null } | null>(null);

  const visibleNav = useMemo(() => {
    if (staffScope?.role === "REVIEWER") return NAV.filter((item) => item.key === "overview");
    const available = NAV.filter((item) => config?.adminAdvanced || BASIC_SECTIONS.includes(item.key));
    if (!staffScope || staffScope.role === "ADMIN") return available;
    const allowed = staffScope.staffType ? STAFF_SECTIONS[staffScope.staffType] : null;
    if (!allowed) return available;
    return available.filter((n) => allowed.includes(n.key));
  }, [staffScope, config?.adminAdvanced]);

  useEffect(() => {
    if (staffScope && !visibleNav.some((n) => n.key === section)) setSection("overview");
  }, [staffScope, visibleNav, section]);

  useEffect(() => {
    setChecking(true);
    load().finally(() => setChecking(false));
  }, []);

  async function load() {
    const response = await api("/api/admin/config");
    if (!response.ok) {
      setToken("");
      return;
    }
    setToken("session");
    setConfig(await response.json());
    try {
      const me = await api("/api/auth/me");
      if (me.ok) {
        const data = await me.json();
        setStaffScope({ role: data.user?.role ?? "", staffType: data.user?.staffType ?? null });
      }
    } catch {
      /* role scoping is best-effort; the API still enforces permissions */
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(apiUrl + "/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    const data = await response.json();
    if (!response.ok || (data.user?.role !== "ADMIN" && data.user?.role !== "STAFF" && data.user?.role !== "REVIEWER"))
      return toast.error("Admin or Staff account required");
    setToken("session");
    load();
  }

  async function save(payload: object) {
    setSaving(true);
    try {
      const response = await api("/api/admin/config", token, { method: "PATCH", body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setConfig(data);
      if (data.homePageConfig) {
        try {
          localStorage.setItem("epic_home_config", JSON.stringify(data.homePageConfig));
        } catch {}
      }
      toast.success("Settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return <AdminSkeleton />;
  }

  if (!token || !config) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#09090f] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/6 p-8 shadow-xl">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-cyan flex items-center justify-center text-white font-display font-bold text-2xl shadow-lg shadow-primary/30 mb-4">
              A
            </div>
            <h1 className="font-display font-bold text-2xl text-gray-900 dark:text-white">Control Dashboard</h1>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              Sign in with your admin account or use the read-only reviewer demo below.
            </p>
          </div>

          <form ref={loginForm} onSubmit={login} className="flex flex-col gap-4">
            <Input isRequired name="email" type="email" label="Email" placeholder="admin@store.com" value={loginEmail} onValueChange={setLoginEmail} />
            <Input isRequired name="password" type={showPassword ? "text" : "password"} label="Password" placeholder="••••••••"
              endContent={
                <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword((v) => !v)} className="cursor-pointer text-gray-400 hover:text-primary transition-colors">
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              } />
            <Button
              type="submit"
              className="h-11 bg-gradient-to-r from-primary to-indigo-500 text-white font-display font-bold rounded-xl shadow-lg shadow-primary/30 hover:opacity-90 transition-opacity"
            >
              Open Control Dashboard
            </Button>
          </form>
          <aside className="mt-6 rounded-2xl border border-primary/15 bg-primary/5 p-4" aria-label="Read-only reviewer credentials">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Reviewer demo access</h2>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">Read only</span>
            </div>
            <p className="mt-2 break-all text-xs text-gray-600 dark:text-slate-300">Email: {reviewerDemo.email}</p>
            <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">Password: {reviewerDemo.password}</p>
            <p className="mt-2 text-[11px] leading-5 text-gray-500 dark:text-slate-400">Shows a sample overview. Live orders, customer details, settings, and store changes are not accessible.</p>
            <button type="button" onClick={() => { setLoginEmail(reviewerDemo.email); const input = loginForm.current?.querySelector<HTMLInputElement>('input[name="password"]'); if (input) input.value = reviewerDemo.password; }} className="mt-3 text-xs font-bold text-primary hover:underline">
              Fill reviewer sign-in
            </button>
          </aside>
        </div>
      </div>
    );
  }

  const flags = config.featureFlags;

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-[#09090f]">
      {/* MOBILE BACKDROP */}
      {mobileSidebar && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileSidebar(false)} />
      )}

      {/* SIDEBAR */}
      <aside
        className={`w-72 max-w-[82vw] shrink-0 flex flex-col bg-white dark:bg-[#0d0d1a] border-r border-gray-200 dark:border-white/5 overflow-hidden transition-transform duration-300 ${
          mobileSidebar ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-50 lg:static lg:z-auto lg:translate-x-0 ${collapsed ? "lg:w-16" : "lg:w-60"}`}
      >
        <div className="h-16 flex items-center gap-3 px-4 border-b border-gray-200 dark:border-white/5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-cyan flex items-center justify-center text-white font-display font-bold text-sm shrink-0 shadow-lg shadow-primary/20">
            A
          </div>
          <div className={`flex-1 min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
            <p className="font-display font-bold text-gray-900 dark:text-white text-sm leading-tight truncate">{config.storeName}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500">{staffScope?.role === "REVIEWER" ? "Read-only reviewer demo" : "Admin Control Panel"}</p>
          </div>
          <button
            onClick={() => setMobileSidebar(false)}
            className="icon-square-btn lg:hidden w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
            aria-label="Close menu"
          >
            <FiX size={16} />
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {visibleNav.map((item) => (
            <Link
              key={item.key}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setSection(item.key);
                setMobileSidebar(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                section === item.key
                  ? "bg-primary/10 text-primary"
                  : "text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              <span className={`text-base shrink-0 transition-transform group-hover:scale-110 ${section === item.key ? "text-primary" : ""}`}>
                {item.icon}
              </span>
              <span className={`text-sm font-medium truncate ${collapsed ? "lg:hidden" : ""}`}>{item.label}</span>
              {section === item.key && (
                <span className={`ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0 ${collapsed ? "lg:hidden" : ""}`} />
              )}
            </Link>
          ))}
        </nav>

        <div className="m-2 border-t border-gray-100 dark:border-white/6 pt-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-sm border border-gray-200 dark:border-white/8"
          >
            <span className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}>◁</span>
            <span className={`text-xs ${collapsed ? "lg:hidden" : ""}`}>Collapse</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP BAR */}
        <div className="h-16 flex items-center justify-between px-4 sm:px-6 bg-white dark:bg-[#0d0d1a]/80 glass border-b border-gray-200 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileSidebar(true)}
              className="icon-square-btn lg:hidden w-9 h-9 shrink-0 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/8 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
              aria-label="Open menu"
            >
              <FiMenu size={16} />
            </button>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-base sm:text-lg text-gray-900 dark:text-white capitalize truncate">{title(section)}</h1>
              <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{config.storeName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="flat"
              color="danger"
              onPress={() => {
                fetch(apiUrl + "/api/auth/sign-out", { method: "POST" }).catch(() => {});
                setToken("");
              }}
            >
              Sign out
            </Button>
            <div className="hidden sm:flex items-center gap-2 bg-gray-100 dark:bg-white/5 rounded-xl px-3 py-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-primary flex items-center justify-center text-white text-[10px] font-bold">
                A
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-slate-300">{staffScope?.role === "REVIEWER" ? "Reviewer" : "Admin"}</span>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 pb-20 sm:p-6 sm:pb-6">
          {config.reviewerDemo && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">Read-only demo dashboard · all figures shown here are sample data.</div>}
          {section === "overview" && <AdminOverview token={token} onNavigate={setSection} courierConfigured={config.courierConfigured} isReviewer={staffScope?.role === "REVIEWER"} />}
          {section === "products" && <AdminProducts token={token} />}
          {section === "media" && <MediaLibrary token={token} />}
          {section === "categories" && <AdminCategories token={token} config={config} save={save} saving={saving} />}
          {section === "orders" && <AdminOrders token={token} config={config} isAdmin={staffScope?.role === "ADMIN"} />}
          {section === "customers" && <AdminCustomers token={token} />}
          {section === "coupons" && <AdminCoupons token={token} />}
          {section === "settings" && <AdminSettings config={config} save={save} saving={saving} />}
          {section === "reviews" && <AdminReviews token={token} />}
          {section === "staff" && <AdminStaff token={token} />}
          {section === "home" && <HomeLayoutSettings config={config} save={save} saving={saving} token={token} />}
          {section === "banner" && <BannerSettings config={config} save={save} saving={saving} token={token} />}
          {section === "menu" && <MenuBuilder config={config} save={save} saving={saving} />}
          {section === "marketing" && <MarketingChatSettings config={config} save={save} saving={saving} />}
          {section === "features" && <FeatureSettings config={config} save={save} saving={saving} />}
{section === "payments" && <PaymentSettings config={config} save={save} saving={saving} />}
        {section === "delivery" && <DeliverySettings config={config} save={save} saving={saving} token={token} />}
          {section === "checkout" && <CheckoutFormSettings config={config} save={save} saving={saving} />}
          {section === "storage" && <StorageSettings save={save} saving={saving} configured={config.storageConfigured} storage={config.storageConfig} />}
        </div>
      </div>

      {/* MOBILE QUICK NAV */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 dark:border-white/6 bg-white/95 dark:bg-[#0d0d1a]/95 backdrop-blur px-1 py-1.5">
        <div className="grid grid-cols-5 gap-1">
          {[
            { key: "overview", label: "Home", icon: "◈" },
            { key: "orders", label: "Orders", icon: "⊞" },
            { key: "products", label: "Products", icon: "▦" },
            { key: "home", label: "Layout", icon: "⌂" },
          ]
            .filter((item) => visibleNav.some((n) => n.key === item.key))
            .map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setSection(item.key as Section);
                setMobileSidebar(false);
              }}
              className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
                section === item.key ? "text-primary bg-primary/10" : "text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </button>
          ))}
          <button
            onClick={() => setMobileSidebar(true)}
            className="flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[10px] font-semibold text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300"
          >
            <span className="text-base leading-none">☰</span>
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==================== CUSTOMERS ==================== */
function AdminCustomers({ token }: { token: string }) {
  const [customers, setCustomers] = useState<{ id: string; name: string; email: string; createdAt: string; _count: { orders: number } }[]>([]);
  useEffect(() => { api("/api/admin/customers", token).then((r) => r.json()).then((rows) => Array.isArray(rows) && setCustomers(rows)).catch(() => {}); }, [token]);
  return <section className="rounded-2xl border border-gray-100 dark:border-white/6 bg-white dark:bg-white/4 p-5"><h2 className="text-xl font-bold mb-4">Customers</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{["Name", "Email", "Orders", "Joined"].map((label) => <th key={label} className="text-left p-3 text-xs text-gray-400">{label}</th>)}</tr></thead><tbody>{customers.map((customer) => <tr key={customer.id} className="border-t border-gray-100 dark:border-white/8"><td className="p-3">{customer.name}</td><td className="p-3">{customer.email}</td><td className="p-3">{customer._count.orders}</td><td className="p-3">{new Date(customer.createdAt).toLocaleDateString("en-US")}</td></tr>)}</tbody></table></div>{!customers.length && <p className="text-sm text-gray-400">No customers found.</p>}</section>;
}

function AdminSettings({ config, save, saving }: { config: Config; save: (payload: object) => void; saving: boolean }) {
  const [storeName, setStoreName] = useState(config.storeName);
  const [logoUrl, setLogoUrl] = useState(config.logoUrl ?? "");
  const [shippingCharge, setShippingCharge] = useState(String(config.shippingConfig?.defaultCharge ?? 8));
  return <section className="max-w-2xl rounded-2xl border border-gray-100 dark:border-white/6 bg-white dark:bg-white/4 p-5 space-y-5"><div><h2 className="text-xl font-bold">Store settings</h2><p className="mt-1 text-sm text-gray-400">Basic storefront settings.</p></div><Input label="Store name" value={storeName} onValueChange={setStoreName} /><Input label="Store logo URL" type="url" value={logoUrl} onValueChange={setLogoUrl} placeholder="https://example.com/logo.png" description="Upload an image in Media Library and paste its public URL here. Leave blank to remove the header logo." /><Input label="Currency" value={config.currency || "USD"} isReadOnly /><Input label="Default shipping charge" type="number" min="0" step="0.01" value={shippingCharge} onValueChange={setShippingCharge} /><Button isLoading={saving} onPress={() => save({ storeName, logoUrl: logoUrl.trim() || null, shippingConfig: { defaultCharge: Math.max(0, Number(shippingCharge) || 0) } })}>Save settings</Button></section>;
}

/* ==================== OVERVIEW ==================== */
function ReviewerOverview({ data }: { data: { customers: number; lowStock: { id: string; name: string; stock: number }[]; statusCounts: Record<string, number>; payment: Record<string, { count: number; amount: number }>; today: { count: number; gross: number }; pending: { count: number; amount: number }; salesTrend: { day: string; paid: number; gross: number }[] } | null }) {
  const cards = [["Today's orders", data?.today.count ?? 0], ["Today's sales", money(data?.today.gross ?? 0)], ["Pending orders", data?.pending.count ?? 0], ["Paid revenue", money(data?.payment?.PAID?.amount ?? 0)], ["Sample customers", data?.customers ?? 0]];
  const max = Math.max(1, ...(data?.salesTrend ?? []).map((row) => row.paid));
  return <div className="space-y-5"><header><h2 className="text-xl font-bold">Sample store overview</h2><p className="text-sm text-gray-400">A safe preview of the dashboard using sample figures.</p></header><div className="grid grid-cols-2 xl:grid-cols-5 gap-3">{cards.map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-gray-100 dark:border-white/6 bg-white dark:bg-white/4 p-4"><p className="text-xs text-gray-400">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}</div><div className="grid xl:grid-cols-2 gap-4"><section className="rounded-2xl border border-gray-100 dark:border-white/6 bg-white dark:bg-white/4 p-5"><h3 className="font-bold mb-4">Sample paid sales trend</h3><div className="flex h-36 items-end gap-1">{(data?.salesTrend ?? []).map((row) => <div key={row.day} title={`${new Date(row.day).toLocaleDateString("en-US")}: ${money(row.paid)}`} className="flex-1 rounded-t bg-primary/70" style={{ height: `${Math.max(3, row.paid / max * 100)}%` }} />)}</div></section><section className="rounded-2xl border border-gray-100 dark:border-white/6 bg-white dark:bg-white/4 p-5"><h3 className="font-bold mb-3">Sample order status</h3>{Object.entries(data?.statusCounts ?? {}).map(([status, count]) => <p key={status} className="flex justify-between py-2 text-sm"><span>{STATUS_LABEL[status] ?? status}</span><span>{count}</span></p>)}</section></div><section className="rounded-2xl border border-gray-100 dark:border-white/6 bg-white dark:bg-white/4 p-5"><h3 className="font-bold mb-3">Sample inventory alert</h3>{(data?.lowStock ?? []).map((product) => <p key={product.id} className="flex justify-between py-1 text-sm"><span>{product.name}</span><strong>{product.stock} left</strong></p>)}</section></div>;
}

function AdminOverview({ token, onNavigate, courierConfigured, isReviewer = false }: { token: string; onNavigate: (section: Section) => void; courierConfigured: boolean; isReviewer?: boolean }) {
  const [data, setData] = useState<{ recentOrders: Order[]; customers: number; lowStock: { id: string; name: string; stock: number }[]; statusCounts: Record<string, number>; payment: Record<string, { count: number; amount: number }>; today: { count: number; gross: number }; pending: { count: number; amount: number }; salesTrend: { day: string; paid: number; gross: number }[] } | null>(null);
  const [range, setRange] = useState<7 | 30>(7);
  useEffect(() => { api(`/api/admin/dashboard?days=${range}`, token).then((response) => response.json()).then(setData).catch(() => {}); }, [token, range]);
  const orders = data?.recentOrders ?? [];
  const unpaid = data?.payment?.UNPAID?.amount ?? 0;
  const statuses = ["PENDING", "CONFIRMED", ...(courierConfigured ? ["IN_COURIER"] : []), "SHIPPED", "DELIVERED", "CANCELLED"];
  const topProducts: Record<string, number> = {};
  orders.forEach((order) => (order.orderItems ?? []).forEach((item) => { topProducts[item.name] = (topProducts[item.name] ?? 0) + item.qty; }));
  const trend = data?.salesTrend ?? [];
  const max = Math.max(1, ...trend.map((row) => row.paid));
  if (isReviewer) return <ReviewerOverview data={data} />;
  const cards = [["Today's orders", data?.today.count ?? 0], ["Today's sales", money(data?.today.gross ?? 0)], ["Pending orders", data?.pending.count ?? 0], ["Paid revenue", money(data?.payment?.PAID?.amount ?? 0)], ["Unpaid / COD outstanding", money(unpaid)]];
  return <div className="space-y-5"><header className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Store overview</h2><p className="text-sm text-gray-400">Sales, orders, and inventory at a glance.</p></div><div className="flex gap-2"><Button size="sm" onPress={() => onNavigate("products")}>Add product</Button><Button size="sm" variant="flat" onPress={() => onNavigate("orders")}>View orders</Button></div></header><div className="grid grid-cols-2 xl:grid-cols-5 gap-3">{cards.map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-gray-100 dark:border-white/6 bg-white dark:bg-white/4 p-4"><p className="text-xs text-gray-400">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}</div><div className="grid xl:grid-cols-2 gap-4"><section className="rounded-2xl border border-gray-100 dark:border-white/6 bg-white dark:bg-white/4 p-5"><div className="flex justify-between items-center mb-4"><h3 className="font-bold">Paid sales trend</h3><div className="flex gap-1">{([7, 30] as const).map((days) => <Button key={days} size="sm" variant={range === days ? "solid" : "light"} onPress={() => setRange(days)}>{days} days</Button>)}</div></div><div className="flex h-36 items-end gap-1">{trend.map((row) => <div key={row.day} title={`${new Date(row.day).toLocaleDateString("en-US")}: ${money(row.paid)}`} className="flex-1 rounded-t bg-primary/70" style={{ height: `${Math.max(3, row.paid / max * 100)}%` }} />)}</div></section><section className="rounded-2xl border border-gray-100 dark:border-white/6 bg-white dark:bg-white/4 p-5"><h3 className="font-bold mb-4">Order status breakdown</h3>{statuses.map((status) => { const count = data?.statusCounts[status] ?? 0; return <div key={status} className="flex justify-between py-2 text-sm"><span>{STATUS_LABEL[status] ?? status}</span><span>{count}</span></div>; })}</section></div><div className="grid md:grid-cols-2 gap-4"><section className="rounded-2xl border border-gray-100 dark:border-white/6 bg-white dark:bg-white/4 p-5"><h3 className="font-bold mb-3">Low-stock alerts</h3>{(data?.lowStock ?? []).slice(0, 8).map((product) => <p key={product.id} className="flex justify-between py-1 text-sm"><span>{product.name}</span><strong>{product.stock}</strong></p>)}{!data?.lowStock.length && <p className="text-sm text-gray-400">No low-stock products.</p>}</section><section className="rounded-2xl border border-gray-100 dark:border-white/6 bg-white dark:bg-white/4 p-5"><h3 className="font-bold mb-3">Top products</h3>{Object.entries(topProducts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, quantity]) => <p key={name} className="flex justify-between py-1 text-sm"><span>{name}</span><strong>{quantity} sold</strong></p>)}{!Object.keys(topProducts).length && <p className="text-sm text-gray-400">No product orders yet.</p>}</section></div></div>;
}

/* ==================== MENU BUILDER ==================== */
function MenuBuilder({ config, save, saving }: { config: Config; save: (payload: object) => Promise<void>; saving: boolean }) {
  const navConfig = config.navigationConfig ?? { menus: [] };
  const menu = navConfig.menus[0] ?? { id: "primary", label: "Primary", location: "header", items: [] as MenuItem[] };
  const [title, setTitle] = useState(menu.label);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pendingCat, setPendingCat] = useState("");

  const hasSavedMenu = (navConfig.menus?.[0]?.items?.length ?? 0) > 0;

  useEffect(() => {
    if (hasSavedMenu) {
      setItems(navConfig.menus[0].items);
    }
  }, [hasSavedMenu, navConfig]);

  const loadCats = () => {
    fetch(`${apiUrl}/api/categories`)
      .then((r) => r.json())
      .then((res) => {
        if (!Array.isArray(res)) return;
        setCategories(res);
        if (!hasSavedMenu && res.length) {
          setItems(
            res.slice(0, 4).map((c) => ({ id: `mi-${Date.now()}-${c.id}`, label: c.name, type: "category" as const, categoryId: c.id, children: [] }))
          );
        }
      })
      .catch(() => {});
  };
  useEffect(loadCats, []);

  const dispatch = (fn: (old: MenuItem[]) => MenuItem[]) => setItems(fn);

  const addCategory = (parentId: string, catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    const node: MenuItem = { id: `mi-${Date.now()}`, label: cat.name, type: "category", categoryId: cat.id, children: [] };
    dispatch((tree) => {
      const carry = JSON.parse(JSON.stringify(tree)) as MenuItem[];
      if (!parentId) {
        carry.push(node);
        return carry;
      }
      const walk = (list: MenuItem[]) => {
        for (const n of list) {
          if (n.id === parentId) {
            n.children = [...n.children, node];
            return true;
          }
          if (walk(n.children)) return true;
        }
        return false;
      };
      walk(carry);
      return carry;
    });
  };

  const addCustom = (parentId: string) => {
    dispatch((tree) => {
      const node: MenuItem = { id: `mi-${Date.now()}`, label: "New link", type: "custom", href: "#", children: [] };
      const carry = JSON.parse(JSON.stringify(tree)) as MenuItem[];
      if (!parentId) {
        carry.push(node);
        return carry;
      }
      const walk = (list: MenuItem[]) => {
        for (const n of list) {
          if (n.id === parentId) {
            n.children = [...n.children, node];
            return true;
          }
          if (walk(n.children)) return true;
        }
        return false;
      };
      walk(carry);
      return carry;
    });
  };

  const updateLabel = (id: string, label: string) =>
    setItems((tree) => {
      const walk = (list: MenuItem[]) => {
        for (const n of list) {
          if (n.id === id) {
            n.label = label;
            if (n.type === "custom" && !n.href?.startsWith("/")) n.href = label.replace(/[^a-z0-9/-]+/gi, "-").toLowerCase();
            return;
          }
          walk(n.children);
        }
      };
      const carry = JSON.parse(JSON.stringify(tree)) as MenuItem[];
      walk(carry);
      return carry;
    });

  const updateHref = (id: string, href: string) =>
    setItems((tree) => {
      const walk = (list: MenuItem[]) => {
        for (const n of list) {
          if (n.id === id) {
            n.href = href;
            return;
          }
          walk(n.children);
        }
      };
      const carry = JSON.parse(JSON.stringify(tree)) as MenuItem[];
      walk(carry);
      return carry;
    });

  const removeItem = (id: string) =>
    setItems((tree) => {
      const prune = (list: MenuItem[]): MenuItem[] => list.filter((n) => n.id !== id).map((n) => ({ ...n, children: prune(n.children) }));
      return prune(tree);
    });

  const move = (id: string, dir: -1 | 1) =>
    setItems((tree) => {
      const carry = JSON.parse(JSON.stringify(tree)) as MenuItem[];
      const walk = (list: MenuItem[]) => {
        const idx = list.findIndex((n) => n.id === id);
        if (idx >= 0) {
          const target = idx + dir;
          if (target >= 0 && target < list.length) {
            const [it] = list.splice(idx, 1);
            list.splice(target, 0, it);
          }
          return true;
        }
        for (const n of list) if (n.children.length && walk(n.children)) return true;
        return false;
      };
      walk(carry);
      return carry;
    });

  const indent = (id: string, dir: -1 | 1) =>
    setItems((tree) => {
      const carry = JSON.parse(JSON.stringify(tree)) as MenuItem[];
      const walk = (list: MenuItem[], parentList: MenuItem[] | null, parent: MenuItem | null): boolean => {
        for (let i = 0; i < list.length; i++) {
          const n = list[i];
          if (n.id === id) {
            if (dir === 1) {
              const prev = list[i - 1];
              if (prev) {
                list.splice(i, 1);
                prev.children = [...prev.children, n];
              }
            } else {
              if (parent && parentList) {
                const pIdx = parentList.indexOf(parent);
                const [it] = list.splice(i, 1);
                parentList.splice(pIdx + 1, 0, it);
              }
            }
            return true;
          }
          if (walk(n.children, list, n)) return true;
        }
        return false;
      };
      walk(carry, null, null);
      return carry;
    });

  const renderItem = (n: MenuItem, depth: number) => (
    <li key={n.id} className="py-1">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/8 bg-white dark:bg-white/4 px-2 py-1.5" style={{ marginLeft: depth * 22 }}>
        <span className="w-6 text-right font-mono text-xs text-gray-300">{depth}</span>
        <Input
          size="sm"
          aria-label="Menu item label"
          value={n.label}
          onValueChange={(v) => updateLabel(n.id, v)}
          className="w-44"
        />
        {n.type === "custom" && (
          <Input
            size="sm"
            aria-label="Menu item link"
            value={n.href ?? ""}
            onValueChange={(v) => updateHref(n.id, v)}
            placeholder="/link"
            className="w-36"
          />
        )}
        {n.type === "category" && (
          <span className="rounded bg-primary/10 px-2 py-1 text-[0.7rem] font-semibold text-primary">Category</span>
        )}
        <div className="flex items-center gap-0.5">
          <button type="button" title="Indent (sub)" onClick={() => indent(n.id, 1)} className="icon-square-btn w-7 h-7 rounded-md bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-primary/10 hover:text-primary text-xs font-bold">→</button>
          <button type="button" title="Outdent" onClick={() => indent(n.id, -1)} className="icon-square-btn w-7 h-7 rounded-md bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-primary/10 hover:text-primary text-xs font-bold">←</button>
          <button type="button" title="Move up" onClick={() => move(n.id, -1)} className="icon-square-btn w-7 h-7 rounded-md bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-primary/10 hover:text-primary text-xs font-bold">↑</button>
          <button type="button" title="Move down" onClick={() => move(n.id, 1)} className="icon-square-btn w-7 h-7 rounded-md bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-primary/10 hover:text-primary text-xs font-bold">↓</button>
          <button type="button" title="Delete" onClick={() => removeItem(n.id)} className="icon-square-btn w-7 h-7 rounded-md bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white text-xs font-bold">×</button>
        </div>
      </div>
      {n.children.length > 0 && <ul className="mt-1 space-y-1">{n.children.map((c) => renderItem(c, depth + 1))}</ul>}
    </li>
  );

  const saveMenu = () => {
    save({
      navigationConfig: { menus: [{ id: menu.id, label: title, location: menu.location, items }] },
    } as object);
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h3 className="font-display font-bold text-gray-900 dark:text-white">Menu Builder</h3>
        <p className="text-sm text-gray-400 dark:text-slate-500">
          Build a multi-level navigation menu. Nested sub-menus show as dropdowns in the header.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 bg-white dark:bg-white/4 rounded-xl border border-gray-200 dark:border-white/8 p-4">
        <Input label="Menu title" value={title} onValueChange={setTitle} className="max-w-xs" />
        <Select
          label="Add a category"
          placeholder="Pick category…"
          className="max-w-xs"
          selectedKeys={pendingCat ? [pendingCat] : []}
          onSelectionChange={(keys) => setPendingCat(Array.from(keys)[0] as string || "")}
        >
          {categories.map((c) => (
            <SelectItem key={c.id} textValue={c.name}>{c.name}</SelectItem>
          ))}
        </Select>
        <button onClick={() => {
          if (pendingCat) {
            addCategory("", pendingCat);
            setPendingCat("");
          }
        }} className="h-10 px-4 bg-gray-100 dark:bg-white/6 text-gray-700 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-primary/10 hover:text-primary transition-colors">
          Add
        </button>
        <button onClick={() => addCustom("")} className="h-10 px-4 bg-gray-100 dark:bg-white/6 text-gray-700 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-primary/10 hover:text-primary transition-colors">
          + Custom link
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-slate-500 rounded-xl border border-dashed border-gray-200 dark:border-white/8 p-8 text-center">
          No menu items yet. Start by adding a category or a custom link above.
        </p>
      ) : (
        <>
          {!hasSavedMenu && (
            <p className="text-xs text-gray-400 dark:text-slate-500">
              These links appear in the storefront header automatically. Edit them and select Save Menu.
            </p>
          )}
          <ul className="space-y-1">{items.map((n) => renderItem(n, 0))}</ul>
        </>
      )}

      <div className="flex items-center gap-3">
        <Button color="primary" onPress={saveMenu} isLoading={saving} className="font-bold">
          Save Menu
        </Button>
        <span className="text-xs text-gray-400">Use → to nest an item under the one above it.</span>
      </div>
    </div>
  );
}

/* ==================== PRODUCTS ==================== */
function AdminProducts({ token }: { token: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerLoading, setMediaPickerLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState<{ url: string; filename: string; altText?: string | null }[]>([]);
  const [gallery, setGallery] = useState<{ id?: string; url: string; preview?: string; altText?: string; title?: string; isFeatured: boolean }[]>([]);
  const [productType, setProductType] = useState<"SIMPLE" | "VARIABLE">("SIMPLE");
  const [sameVariationPrice, setSameVariationPrice] = useState(false);
  const [manageStockQty, setManageStockQty] = useState(true);
  const [manualOutOfStock, setManualOutOfStock] = useState(false);
  const [sku, setSku] = useState("");
  const [productName, setProductName] = useState("");
  const [productSlug, setProductSlug] = useState("");
  const [productSlugEdited, setProductSlugEdited] = useState(false);
  const [basePrice, setBasePrice] = useState("");
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [defaultVariationId, setDefaultVariationId] = useState<string | null>(null);
  const [selectedVars, setSelectedVars] = useState<Set<string>>(new Set());
  const [expandedVar, setExpandedVar] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [generating, setGenerating] = useState(false);

  const variationKey = (v: Variation) =>
    [...v.attributes]
      .sort((a, b) => a.attributeId.localeCompare(b.attributeId))
      .map((a) => `${a.attributeId}:${a.valueId}`)
      .join("|");

  const load = () =>
    Promise.all([
      api("/api/admin/products", token).then((r) => r.json()),
      api("/api/admin/categories", token).then((r) => r.json()),
    ])
      .then(([p, c]) => {
        if (Array.isArray(p)) setProducts(p);
        if (Array.isArray(c)) setCategories(c);
      })
      .catch(() => {});

  useEffect(() => {
    load();
  }, [token]);

  const filtered = products.filter(
    (p) =>
      (!categoryFilter || p.categoryId === categoryFilter || p.categoryLinks?.some((link) => link.categoryId === categoryFilter)) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) || p.category?.name.toLowerCase().includes(search.toLowerCase()))
  );

  function startCreate() {
    setEditingProduct(null);
    setSelectedCategoryIds([]);
    setProductName("");
    setProductSlug("");
    setProductSlugEdited(false);
    setGallery([]);
    setProductType("SIMPLE");
    setSameVariationPrice(true);
    setManageStockQty(false);
    setManualOutOfStock(false);
    setSku("");
    setBasePrice("");
    setAttributes([]);
    setVariations([]);
    setDefaultVariationId(null);
    setSelectedVars(new Set());
    setExpandedVar(null);
    setCreating(true);
  }

  function startEdit(p: Product) {
    setEditingProduct(p);
    setSelectedCategoryIds(p.categoryLinks?.map((link) => link.categoryId) ?? [p.categoryId]);
    setProductName(p.name);
    setProductSlug(p.slug);
    setProductSlugEdited(false);
    const details = Array.isArray(p.imagesDetails) && p.imagesDetails.length
      ? p.imagesDetails
      : p.images.map((url, i) => ({ id: "", url, altText: null as string | null, title: null as string | null, sortOrder: i, isFeatured: i === 0 }));
    const hasFeatured = details.some((d) => d.isFeatured);
    const sorted = [...details].sort((a, b) => a.sortOrder - b.sortOrder);
    setGallery(
      sorted.map((d) => ({
        id: d.id || undefined,
        url: d.url,
        altText: d.altText ?? undefined,
        title: d.title ?? undefined,
        isFeatured: hasFeatured ? d.isFeatured : d.sortOrder === 0,
      }))
    );
    setProductType(p.productType ?? "SIMPLE");
    setSameVariationPrice(Boolean(p.productType === "VARIABLE" && p.variations?.length && p.variations.every((v) => Math.abs(Number(v.price) - Number(p.price)) < 0.001)));
    setManageStockQty(p.manageStock !== false);
    setManualOutOfStock(p.manageStock === false && p.stock <= 0);
    setSku(p.sku ?? "");
    setBasePrice(String(p.price ?? ""));
    setAttributes(
      Array.isArray(p.attributes)
        ? p.attributes.map((a) => ({
            id: a.id,
            name: a.name,
            values: (a.values ?? []).map((v) => ({ id: v.id, value: v.value, colorSwatch: v.colorSwatch ?? null, image: v.image ?? null })),
          }))
        : []
    );
    setVariations(
      Array.isArray(p.variations)
        ? p.variations.map((v) => ({
            ...v,
            price: String(v.price),
            salePrice: v.salePrice !== null && v.salePrice !== undefined ? String(v.salePrice) : null,
            weight: v.weight !== null && v.weight !== undefined ? String(v.weight) : null,
            gallery: v.gallery ?? null,
            isDefault: p.defaultVariationId === v.id,
          }))
        : []
    );
    setDefaultVariationId(p.defaultVariationId ?? null);
    setSelectedVars(new Set());
    setExpandedVar(null);
    setCreating(true);
  }

  async function uploadFiles(files: File[]) {
    setUploading(true);
    let added = 0;
    const uploads = files.map(async (file) => {
      const preview = URL.createObjectURL(file);
      const form = new FormData();
      form.append("image", file);
      const response = await fetch(apiUrl + "/api/admin/upload", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) {
        URL.revokeObjectURL(preview);
        throw new Error(data.error);
      }
      return { url: data.url as string, preview };
    });
    const results = await Promise.allSettled(uploads);
    for (const r of results) {
      if (r.status === "fulfilled") {
        setGallery((current) => [
          ...current,
          { url: r.value.url, preview: r.value.preview, isFeatured: current.length === 0 || (current.length > 0 && !current.some((g) => g.isFeatured)) },
        ]);
        added++;
      } else {
        toast.error(r.reason instanceof Error ? r.reason.message : "Upload failed");
      }
    }
    setUploading(false);
    if (added) toast.success(`${added} image${added > 1 ? "s" : ""} uploaded`);
  }

  async function pickImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (!files.length) return;
    await uploadFiles(files);
    event.target.value = "";
  }

  async function openMediaPicker() {
    setMediaPickerOpen((open) => !open);
    if (mediaItems.length) return;
    setMediaPickerLoading(true);
    try {
      const response = await api("/api/admin/media", token);
      const items = await response.json();
      if (!response.ok || !Array.isArray(items)) throw new Error(items.error ?? "Could not load image library");
      setMediaItems(items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load image library");
    } finally {
      setMediaPickerLoading(false);
    }
  }

  function addExistingImage(image: { url: string; filename: string }) {
    setGallery((current) => {
      if (current.some((item) => item.url === image.url)) return current;
      return [...current, { url: image.url, title: image.filename, isFeatured: current.length === 0 || !current.some((item) => item.isFeatured) }];
    });
  }

  function removeImage(idx: number) {
    setGallery((current) => {
      const next = current.filter((_, i) => i !== idx);
      if (!next.some((g) => g.isFeatured) && next.length) next[0].isFeatured = true;
      return next;
    });
  }

  function setFeatured(idx: number) {
    setGallery((current) => current.map((g, i) => ({ ...g, isFeatured: i === idx })));
  }

  function moveImage(idx: number, dir: -1 | 1) {
    setGallery((current) => {
      const target = idx + dir;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const tmp = next[idx];
      next[idx] = next[target];
      next[target] = tmp;
      return next;
    });
  }

  function updateMeta(idx: number, patch: Partial<{ altText: string; title: string }>) {
    setGallery((current) => current.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  }

  function addAttribute() {
    setAttributes((current) => [...current, { id: `a${Date.now()}${Math.random().toString(36).slice(2, 6)}`, name: "", values: [] }]);
  }

  function removeAttribute(aIndex: number) {
    setAttributes((current) => {
      const removed = current[aIndex];
      const next = current.filter((_, i) => i !== aIndex);
      const removedValueIds = new Set(removed.values.map((v) => v.id));
      const removedAttrId = removed.id;
      setVariations((vs) =>
        vs
          .map((v) => ({ ...v, attributes: v.attributes.filter((a) => a.attributeId !== removedAttrId && !removedValueIds.has(a.valueId)) }))
          .filter((v) => v.attributes.length > 0)
      );
      return next;
    });
  }

  function updateAttributeName(aIndex: number, name: string) {
    setAttributes((current) => current.map((a, i) => (i === aIndex ? { ...a, name } : a)));
  }

  function addAttributeValue(aIndex: number) {
    setAttributes((current) =>
      current.map((a, i) =>
        i === aIndex ? { ...a, values: [...a.values, { id: `v${Date.now()}${Math.random().toString(36).slice(2, 6)}`, value: "" }] } : a
      )
    );
  }

  function removeAttributeValue(aIndex: number, vIndex: number) {
    setAttributes((current) => {
      const removedId = current[aIndex].values[vIndex].id;
      const next = current.map((a, i) => (i === aIndex ? { ...a, values: a.values.filter((_, j) => j !== vIndex) } : a));
      setVariations((vs) => vs.map((v) => ({ ...v, attributes: v.attributes.filter((x) => x.valueId !== removedId) })).filter((v) => v.attributes.length > 0));
      return next;
    });
  }

  function updateAttributeValue(aIndex: number, vIndex: number, patch: Partial<AttributeValue>) {
    setAttributes((current) =>
      current.map((a, i) =>
        i === aIndex ? { ...a, values: a.values.map((val, j) => (j === vIndex ? { ...val, ...patch } : val)) } : a
      )
    );
  }

  function uid() {
    return `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  }

  function generateVariationsFromAttributes() {
    const validAttrs = attributes.filter((a) => a.name.trim() && a.values.some((v) => v.value.trim()));
    if (validAttrs.length < 1) {
      toast.error("Add attributes with values first (e.g. Color → Black, White)");
      return;
    }
    setGenerating(true);
    const clean = validAttrs.map((a) => ({
      id: a.id,
      name: a.name.trim(),
      values: a.values.filter((v) => v.value.trim()).map((v) => ({ ...v, value: v.value.trim() })),
    }));
    let combos: { parts: string[]; attributeValueIds: Record<string, string> }[] = [{ parts: [], attributeValueIds: {} }];
    for (const attr of clean) {
      const next: typeof combos = [];
      for (const combo of combos) {
        for (const val of attr.values) {
          next.push({
            parts: [...combo.parts, val.value],
            attributeValueIds: { ...combo.attributeValueIds, [attr.id]: val.id },
          });
        }
      }
      combos = next;
    }

    // Preserve previously edited data for combos that already exist
    const existingMap = new Map<string, Variation>();
    variations.forEach((v) => existingMap.set(variationKey(v), v));

    const basePriceValue = Number(basePrice || 0);
    const generated: Variation[] = combos.map((combo) => {
      const key = Object.entries(combo.attributeValueIds)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([attrId, valueId]) => `${attrId}:${valueId}`)
        .join("|");
      const existing = existingMap.get(key);
      const attrs = Object.entries(combo.attributeValueIds).map(([attributeId, valueId]) => ({ attributeId, valueId }));
      if (existing) {
        return { ...existing, attributes: attrs };
      }
      const name = combo.parts.join(" / ");
      const skuBase = [sku, ...combo.parts].filter(Boolean).map((s) => s.replace(/[^A-Za-z0-9]+/g, "-").replace(/(^-|-$)/g, "").toUpperCase()).join("-");
      return {
        id: uid(),
        name,
        sku: skuBase || null,
        price: String(basePriceValue || 0),
        salePrice: null,
        stock: 1,
        manageStock: false,
        weight: null,
        image: null,
        gallery: null,
        description: null,
        status: "active" as const,
        isDefault: false,
        attributes: attrs,
      };
    });
    setVariations(generated);
    setGenerating(false);
    toast.success(`Generated ${generated.length} variation${generated.length > 1 ? "s" : ""}`);
  }

  function updateVariation(vid: string, patch: Partial<Variation>) {
    setVariations((current) => current.map((v) => (v.id === vid ? { ...v, ...patch } : v)));
  }

  function duplicateVariation(vid: string) {
    setVariations((current) => {
      const src = current.find((v) => v.id === vid);
      if (!src) return current;
      const copy: Variation = {
        ...src,
        id: uid(),
        name: `${src.name} (Copy)`,
        sku: src.sku ? `${src.sku}-COPY` : null,
        isDefault: false,
      };
      return [...current, copy];
    });
  }

  function removeVariation(vid: string) {
    setVariations((current) => {
      const next = current.filter((v) => v.id !== vid);
      setDefaultVariationId((d) => (d === vid ? null : d));
      return next;
    });
  }

  function toggleSelectVar(vid: string) {
    setSelectedVars((current) => {
      const next = new Set(current);
      if (next.has(vid)) next.delete(vid);
      else next.add(vid);
      return next;
    });
  }

  function toggleSelectAllVars(checked: boolean) {
    setSelectedVars(checked ? new Set(variations.map((v) => v.id)) : new Set());
  }

  function bulkApply(action: "setPrice" | "setSalePrice" | "setStock" | "enable" | "disable" | "delete", value?: number) {
    if (!selectedVars.size) return toast.error("Select at least one variation first");
    setVariations((current) => {
      let next = [...current];
      if (action === "delete") {
        next = next.filter((v) => !selectedVars.has(v.id));
      } else if (action === "setPrice") {
        next = next.map((v) => (selectedVars.has(v.id) ? { ...v, price: String(value ?? 0) } : v));
      } else if (action === "setSalePrice") {
        next = next.map((v) => (selectedVars.has(v.id) ? { ...v, salePrice: value ? String(value) : null } : v));
      } else if (action === "setStock") {
        next = next.map((v) => (selectedVars.has(v.id) ? { ...v, stock: Math.max(0, Math.floor(value ?? 0)) } : v));
      } else if (action === "enable") {
        next = next.map((v) => (selectedVars.has(v.id) ? { ...v, status: "active" as const } : v));
      } else if (action === "disable") {
        next = next.map((v) => (selectedVars.has(v.id) ? { ...v, status: "disabled" as const } : v));
      }
      return next;
    });
    setSelectedVars(new Set());
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!gallery.length) return toast.error("Upload at least one image first");
    const name = String(form.get("name") || "").trim();
    if (!selectedCategoryIds.length) return toast.error("Select at least one category");
    const rawSlug = String(form.get("slug") || "");
    const slug = slugFromName(rawSlug || name) || `product-${Date.now()}`;
    const toPriceNumber = (raw: string | null) => {
      if (!raw) return undefined;
      const cleaned = raw.replace(/[^0-9.]/g, "").replace(/\.(?=.*\.)/g, "");
      return cleaned ? Number(cleaned) : undefined;
    };
    const hasFeatured = gallery.some((g) => g.isFeatured);
    const imageDetails = gallery.map((g, index) => ({
      url: g.url,
      altText: g.altText?.trim() || null,
      title: g.title?.trim() || null,
      sortOrder: index,
      isFeatured: hasFeatured ? Boolean(g.isFeatured) : index === 0,
    }));
    const cleanAttributes = attributes
      .filter((a) => a.name.trim())
      .map((a) => ({
        id: a.id,
        name: a.name.trim(),
        values: a.values
          .filter((v) => v.value.trim())
          .map((v) => ({ id: v.id, value: v.value.trim(), colorSwatch: v.colorSwatch?.trim() || null, image: v.image || null })),
      }))
      .filter((a) => a.values.length > 0);
    const validValueIds = new Set(cleanAttributes.flatMap((a) => a.values.map((v) => v.id)));
    const cleanVariations = variations
      .filter((v) => v.attributes.length > 0 && v.attributes.every((x) => validValueIds.has(x.valueId)))
      .map((v) => ({
        id: v.id,
        name: v.name || v.attributes.map((x) => x.value?.value ?? "").join(" / "),
        sku: v.sku?.trim() || null,
        price: Number(String(v.price).replace(/[^0-9.]/g, "").replace(/\.(?=.*\.)/g, "")) || 0,
        salePrice: v.salePrice ? Number(String(v.salePrice).replace(/[^0-9.]/g, "").replace(/\.(?=.*\.)/g, "")) : null,
        stock: Math.max(0, Math.floor(Number(v.stock) || 0)),
        manageStock: v.manageStock,
        weight: v.weight ? v.weight.trim() : null,
        image: v.image || null,
        gallery: v.gallery && v.gallery.length ? v.gallery : null,
        description: v.description?.trim() || null,
        status: v.status,
        isDefault: v.isDefault || defaultVariationId === v.id,
        attributes: v.attributes.map((x) => ({ attributeId: x.attributeId, valueId: x.valueId })),
      }));
    const descriptionText = String(form.get("description") || "").trim();
    const longDescriptionText = form.get("longDescription") ? String(form.get("longDescription")) : undefined;
    const price = toPriceNumber(String(form.get("price") ?? ""));
    const salePrice = toPriceNumber(form.get("salePrice") ? String(form.get("salePrice")) : null);
    const stock = manageStockQty ? Math.max(0, Math.floor(Number(form.get("stock") || 0))) : manualOutOfStock ? 0 : 1;
    const images = imageDetails.map((i) => i.url);
    const productTypeValue = productType;
    const variationsPayload = productTypeValue === "VARIABLE" ? cleanVariations : undefined;
    const attributesPayload = productTypeValue === "VARIABLE" ? cleanAttributes : undefined;
    const payload = {
      categoryId: selectedCategoryIds[0],
      categoryIds: selectedCategoryIds,
      name,
      slug,
      description: descriptionText,
      longDescription: longDescriptionText,
      price,
      salePrice,
      stock,
      manageStock: manageStockQty,
      images,
      imageDetails,
      sku: sku.trim() || undefined,
      productType: productTypeValue,
      attributes: attributesPayload,
      variations: variationsPayload,
    };
    try {
      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : "/api/admin/products";
      const method = editingProduct ? "PATCH" : "POST";
      const body = editingProduct
        ? { name, slug, categoryId: selectedCategoryIds[0], categoryIds: selectedCategoryIds, description: descriptionText, longDescription: longDescriptionText, price, salePrice, stock, manageStock: manageStockQty, images, imageDetails, sku: sku.trim() || undefined, productType: productTypeValue, attributes: attributesPayload, variations: variationsPayload }
        : payload;
      const response = await api(url, token, { method, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) {
        const detail = Array.isArray(data.details) ? ` — ${data.details.join(", ")}` : "";
        throw new Error(data.error + detail);
      }
      toast.success(editingProduct ? "Product updated!" : "Product created!");
      setGallery([]);
      setEditingProduct(null);
      setCreating(false);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save product");
    }
  }

  async function toggleActive(product: Product) {
    const response = await api("/api/admin/products/" + product.id, token, { method: "PATCH", body: JSON.stringify({ isActive: !product.isActive }) });
    if (response.ok) {
      toast.success("Product status updated");
      load();
    } else toast.error("Update failed");
  }

  async function deleteProduct(product: Product) {
    if (!confirm(`Delete "${product.name}"?`)) return;
    const response = await api("/api/admin/products/" + product.id, token, { method: "DELETE" });
    if (response.ok) {
      toast.success("Product deleted");
      load();
    } else toast.error("Delete failed");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
          {(["list", "add"] as const).map((t) => (
            <button
              key={t}
              onClick={() => (t === "add" ? startCreate() : setCreating(false))}
              className={`px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all ${
                creating === (t === "add")
                  ? "bg-white dark:bg-[#1a1a2e] text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
              }`}
            >
              {t === "list" ? "Product List" : (editingProduct ? "← Back to List" : "+ Add Product")}
            </button>
          ))}
        </div>
        {!creating && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 h-9 px-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, category..."
                className="bg-transparent text-xs text-gray-700 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 outline-none w-44"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-xs text-gray-700 dark:text-slate-200 outline-none focus:border-primary"
              aria-label="Filter by category"
            >
              <option value="">All categories ({products.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parentId ? `↳ ${c.name}` : c.name} ({products.filter((p) => p.categoryId === c.id || p.categoryLinks?.some((link) => link.categoryId === c.id)).length})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {creating ? (
        <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-6">
          {editingProduct && (
            <div className="mb-4 flex items-center gap-2 text-sm">
              <FiEdit2 className="text-primary" />
              <span className="font-semibold text-gray-800 dark:text-slate-100">Editing: {editingProduct.name}</span>
              <button type="button" onClick={() => { setEditingProduct(null); setCreating(false); }} className="text-xs text-primary underline ml-2">cancel</button>
            </div>
          )}
          <form key={editingProduct?.id ?? "new"} onSubmit={saveProduct} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input label="Product Name" name="name" isRequired placeholder="Classic Cotton Shirt" value={productName} onValueChange={(value) => { setProductName(value); if (!productSlugEdited) setProductSlug(slugFromName(value)); }} />
              <Input label="Slug (Auto-generated from product name)" name="slug" placeholder="classic-cotton-shirt" value={productSlug} onValueChange={(value) => { setProductSlug(value); setProductSlugEdited(true); }} />
              <Select
                label="Categories"
                selectionMode="multiple"
                isRequired
                placeholder="Select one or more categories"
                selectedKeys={new Set(selectedCategoryIds)}
                onSelectionChange={(keys) => setSelectedCategoryIds(keys === "all" ? categoryOptions(categories).map((category) => category.id) : Array.from(keys).map(String))}
                description="Choose every category where this product should appear."
              >
                {categoryOptions(categories).map((category) => (
                  <SelectItem key={category.id}>{category.parentId ? `↳  ${category.name}` : category.name}</SelectItem>
                ))}
              </Select>
              <Input label="Regular price" name="price" type="text" inputMode="decimal" isRequired placeholder="50.00" value={basePrice} onValueChange={(value) => { setBasePrice(value); if (sameVariationPrice) setVariations((current) => current.map((variation) => ({ ...variation, price: value || "0" }))); }} />
              <Input label="Sale price" name="salePrice" type="text" inputMode="decimal" placeholder="40.00 (optional)" defaultValue={editingProduct?.salePrice != null ? String(editingProduct.salePrice) : ""} />
              {productType === "SIMPLE" ? <div className="flex flex-col justify-center gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">Track stock quantity</p>
                    <p className="text-[11px] text-gray-400 dark:text-slate-500">Off = always available, no quantity needed</p>
                  </div>
                  <Switch size="sm" isSelected={manageStockQty} onValueChange={setManageStockQty} />
                </div>
                {manageStockQty ? (
                  <Input label="Stock Qty" name="stock" type="number" defaultValue={String(editingProduct?.stock ?? 10)} />
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-600 dark:text-slate-300">Out of stock</span>
                    <Switch size="sm" isSelected={manualOutOfStock} onValueChange={setManualOutOfStock} />
                  </div>
                )}
              </div> : <div className="flex items-center rounded-xl border border-gray-100 p-3 text-xs text-gray-500 dark:border-white/8 dark:text-slate-400">Stock is controlled per variation below.</div>}
            </div>

            <RichTextEditor name="description" label="Short Description" placeholder="One or two crisp sentences for cards, search and quick glance…" defaultValue={editingProduct?.description ?? ""} />
            <RichTextEditor name="longDescription" label="Long Description (Full Details)" placeholder="Extended description for the product page — materials, care, shipping, what's in the box…" defaultValue={editingProduct?.longDescription ?? ""} />

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">Product Images &amp; Gallery</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500">★ = Featured (shown on cards &amp; default)</span>
              </div>

              <label className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer flex flex-col items-center gap-2">
                <span className="text-2xl">📤</span>
                <span className="text-sm text-gray-500 dark:text-slate-400">
                  {uploading ? "Uploading…" : "Drop images here or click to upload (multiple allowed)"}
                </span>
                <input type="file" accept="image/*" multiple onChange={pickImages} hidden />
              </label>

              <button type="button" onClick={openMediaPicker} className="mt-3 h-10 w-full rounded-xl border border-primary/20 bg-primary/5 px-4 text-sm font-semibold text-primary transition hover:bg-primary/10 sm:w-auto">
                {mediaPickerOpen ? "Hide image library" : "Choose from existing images"}
              </button>
              {mediaPickerOpen && (
                <div className="mt-3 rounded-xl border border-gray-200 p-3 dark:border-white/10">
                  <p className="mb-3 text-xs text-gray-500 dark:text-slate-400">Select an image to add it to this product gallery.</p>
                  {mediaPickerLoading ? <p className="py-6 text-center text-sm text-gray-500">Loading image library…</p> : mediaItems.length ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                      {mediaItems.map((image) => {
                        const selected = gallery.some((item) => item.url === image.url);
                        return <button key={image.url} type="button" onClick={() => addExistingImage(image)} disabled={selected} title={image.filename} className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 disabled:opacity-50 dark:border-white/10">
                          <img src={image.url} alt={image.altText ?? image.filename} className="h-full w-full object-cover" />
                          {selected && <span className="absolute inset-x-0 bottom-0 bg-primary/90 px-1 py-0.5 text-[10px] font-semibold text-white">Added</span>}
                        </button>;
                      })}
                    </div>
                  ) : <p className="py-6 text-center text-sm text-gray-500">No existing images found. Upload one above first.</p>}
                </div>
              )}

              {gallery.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {gallery.map((img, index) => (
                    <div key={img.id || img.url + index} className={`relative rounded-xl border-2 overflow-hidden ${img.isFeatured ? "border-primary ring-2 ring-primary/30" : "border-gray-100 dark:border-white/8"}`}>
                      <div className="relative w-full aspect-square bg-gray-100 dark:bg-white/5">
                        <img src={img.preview || img.url} alt="" className="w-full h-full object-cover" />
                        {img.isFeatured && (
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-primary/90 text-white text-[9px] font-bold">FEATURED</span>
                        )}
                      </div>
                      <div className="p-1.5 bg-white dark:bg-[#151527] space-y-1">
                        <input
                          value={img.altText ?? ""}
                          onChange={(e) => updateMeta(index, { altText: e.target.value })}
                          placeholder="Alt text"
                          className="w-full text-[10px] bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-md px-1.5 py-1 outline-none text-gray-700 dark:text-slate-200 placeholder-gray-400"
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-0.5">
                            <button type="button" onClick={() => setFeatured(index)} title="Set featured" className={`icon-square-btn w-6 h-6 rounded-md flex items-center justify-center text-xs ${img.isFeatured ? "text-amber" : "text-gray-300 dark:text-slate-600 hover:text-amber"}`}>
                              <FiStar size={14} />
                            </button>
                            <button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} className="icon-square-btn w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move up">
                              <FiArrowUp size={13} />
                            </button>
                            <button type="button" onClick={() => moveImage(index, 1)} disabled={index === gallery.length - 1} className="icon-square-btn w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move down">
                              <FiArrowDown size={13} />
                            </button>
                          </div>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => removeImage(index)} className="icon-square-btn w-6 h-6 rounded-md flex items-center justify-center text-gray-300 dark:text-slate-600 hover:text-rose-500" title="Delete">
                              <FiTrash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Type & Variations */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">Product Type & Variations</span>
              </div>

              {/* Type + SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setProductType("SIMPLE")}
                    className={`flex-1 text-xs flex items-center justify-center gap-1.5 px-3 h-9 rounded-xl border font-semibold transition-colors ${
                      productType === "SIMPLE"
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-white/10 hover:border-primary/30"
                    }`}
                  >
                    <FiTag size={13} /> Simple Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductType("VARIABLE")}
                    className={`flex-1 text-xs flex items-center justify-center gap-1.5 px-3 h-9 rounded-xl border font-semibold transition-colors ${
                      productType === "VARIABLE"
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-white/10 hover:border-primary/30"
                    }`}
                  >
                    <FiLayers size={13} /> Variable Product
                  </button>
                </div>
                <input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Product SKU (e.g. SHIRT-01) — basis for generated variation SKUs"
                  className="text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 h-9 outline-none text-gray-700 dark:text-slate-200 placeholder-gray-400"
                />
              </div>

              {productType === "VARIABLE" && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-xl border border-gray-100 p-3 dark:border-white/8 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">Use product price for every variation</p>
                      <p className="mt-1 text-[11px] text-gray-400 dark:text-slate-500">On: all variations follow Regular Price above. Off: set a separate price for each variation.</p>
                    </div>
                    <Switch
                      size="sm"
                      isSelected={sameVariationPrice}
                      onValueChange={(enabled: boolean) => {
                        setSameVariationPrice(enabled);
                        if (enabled) setVariations((current) => current.map((variation) => ({ ...variation, price: basePrice || "0" })));
                      }}
                    />
                  </div>
                  {/* Attributes */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Product Attributes <span className="text-[10px] text-gray-400 dark:text-slate-500 font-normal">(Color, Size, Material…)</span></span>
                      <button
                        type="button"
                        onClick={addAttribute}
                        className="text-xs flex items-center gap-1 px-3 h-7 rounded-lg bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors"
                      >
                        <FiPlus size={13} /> Add Attribute
                      </button>
                    </div>

                    {attributes.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-slate-500 border border-dashed border-gray-200 dark:border-white/10 rounded-xl p-3 text-center">
                        Add attributes like Color and Size, fill in their values, then press “Generate Variations”.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {attributes.map((attr, aIndex) => (
                          <div key={attr.id} className="border border-gray-100 dark:border-white/8 rounded-xl p-3 bg-white/40 dark:bg-transparent">
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                value={attr.name}
                                onChange={(e) => updateAttributeName(aIndex, e.target.value)}
                                placeholder="Attribute name (e.g. Color)"
                                className="flex-1 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 outline-none text-gray-700 dark:text-slate-200 placeholder-gray-400"
                              />
                              <button type="button" onClick={() => removeAttribute(aIndex)} className="icon-square-btn w-6 h-6 rounded-md flex items-center justify-center text-gray-300 dark:text-slate-600 hover:text-rose-500" title="Remove attribute">
                                <FiTrash2 size={13} />
                              </button>
                            </div>
                            <div className="space-y-1.5">
                              {attr.values.map((val, valIndex) => (
                                <div key={val.id} className="flex items-center gap-2">
                                  {val.colorSwatch ? (
                                    <span className="shrink-0 w-4 h-4 rounded-md border border-black/10 dark:border-white/20" style={{ background: val.colorSwatch }} title={val.colorSwatch} />
                                  ) : null}
                                  <input
                                    value={val.value}
                                    onChange={(e) => updateAttributeValue(aIndex, valIndex, { value: e.target.value })}
                                    placeholder="Value (e.g. Black)"
                                    className="flex-1 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 outline-none text-gray-700 dark:text-slate-200 placeholder-gray-400"
                                  />
                                  <input
                                    value={val.colorSwatch ?? ""}
                                    onChange={(e) => updateAttributeValue(aIndex, valIndex, { colorSwatch: e.target.value })}
                                    placeholder="#hex"
                                    className="w-20 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 outline-none text-gray-700 dark:text-slate-200 placeholder-gray-400"
                                    title="Hex color swatch (optional)"
                                  />
                                  <select
                                    value={val.image ?? ""}
                                    onChange={(e) => updateAttributeValue(aIndex, valIndex, { image: e.target.value || null })}
                                    className="text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 outline-none text-gray-700 dark:text-slate-200 max-w-[130px]"
                                    title="Image for this value (shown to customers)"
                                  >
                                    <option value="">No image</option>
                                    {gallery.map((g, gi) => (
                                      <option key={gi} value={g.url}>{`Image ${gi + 1}${g.altText ? ` — ${g.altText}` : ""}`}</option>
                                    ))}
                                  </select>
                                  <button type="button" onClick={() => removeAttributeValue(aIndex, valIndex)} className="icon-square-btn w-6 h-6 rounded-md flex items-center justify-center text-gray-300 dark:text-slate-600 hover:text-rose-500" title="Remove value">
                                    <FiTrash2 size={13} />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <button type="button" onClick={() => addAttributeValue(aIndex)} className="mt-2 text-xs flex items-center gap-1 px-2.5 h-6 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-400 hover:text-primary transition-colors">
                              <FiPlus size={12} /> Add value
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Generate */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={generateVariationsFromAttributes}
                      disabled={generating}
                      className="px-4 h-9 rounded-xl bg-gradient-to-r from-primary to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50"
                    >
                      <FiShuffle size={13} className={generating ? "animate-spin" : ""} /> {generating ? "Generating…" : "Generate Variations"}
                    </button>
                    {variations.length > 0 && (
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        {variations.length} variation{variations.length > 1 ? "s" : ""} — edits below are saved with the product
                      </span>
                    )}
                  </div>

                  {/* Variations grid */}
                  {variations.length > 0 && (
                    <div>
                      {/* Bulk toolbar */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedVars.size === variations.length && variations.length > 0}
                            onChange={(e) => toggleSelectAllVars(e.target.checked)}
                            className="accent-primary"
                          />
                          <span className="text-xs text-gray-500 dark:text-slate-400">{selectedVars.size ? `${selectedVars.size} selected` : "Select all"}</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const price = window.prompt("Set a price for selected variations");
                              if (price !== null) bulkApply("setPrice", Number(price));
                            }}
                            className="text-[11px] px-2.5 h-7 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-slate-300 font-semibold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                          >
                            Set price
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const sale = window.prompt("Set a sale price for selected variations (leave blank to clear)");
                              if (sale !== null) bulkApply("setSalePrice", sale ? Number(sale) : undefined);
                            }}
                            className="text-[11px] px-2.5 h-7 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-slate-300 font-semibold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                          >
                            Set sale
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const stock = window.prompt("Set stock qty for selected variations");
                              if (stock !== null) bulkApply("setStock", Number(stock));
                            }}
                            className="text-[11px] px-2.5 h-7 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-slate-300 font-semibold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                          >
                            Set stock
                          </button>
                          <button
                            type="button"
                            onClick={() => bulkApply("enable")}
                            className="text-[11px] px-2.5 h-7 rounded-lg bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                          >
                            Enable
                          </button>
                          <button
                            type="button"
                            onClick={() => bulkApply("disable")}
                            className="text-[11px] px-2.5 h-7 rounded-lg bg-amber-100/70 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                          >
                            Disable
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!selectedVars.size) return toast.error("Select at least one variation first");
                              if (!window.confirm(`Delete ${selectedVars.size} selected variation${selectedVars.size > 1 ? "s" : ""}?`)) return;
                              bulkApply("delete");
                              toast.success("Variations deleted");
                            }}
                            className="text-[11px] px-2.5 h-7 rounded-lg bg-rose-100/70 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="border border-gray-100 dark:border-white/8 rounded-xl overflow-hidden">
                        {variations.map((v, vi) => {
                          const expanded = expandedVar === v.id;
                          return (
                            <div key={v.id} className={vi > 0 ? "border-t border-gray-100 dark:border-white/8" : ""}>
                              <div className={`flex items-center gap-2 px-3 py-2 ${expanded ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-gray-50 dark:hover:bg-white/5"} transition-colors`}>
                                <input
                                  type="checkbox"
                                  checked={selectedVars.has(v.id)}
                                  onChange={() => toggleSelectVar(v.id)}
                                  className="accent-primary"
                                />
                                <button type="button" onClick={() => setExpandedVar(expanded ? null : v.id)} className="shrink-0 icon-square-btn w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-primary transition-colors" title="Expand edit">
                                  <FiChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-semibold text-gray-700 dark:text-slate-200 truncate">{v.name || "Variation"}</span>
                                    {v.attributes
                                      .map((a) => {
                                        const attr = attributes.find((x) => x.id === a.attributeId);
                                        const val = attr?.values.find((x) => x.id === a.valueId);
                                        return val ? `${attr?.name ?? "?"}: ${val.value}` : null;
                                      })
                                      .filter(Boolean)
                                      .map((chip, i) => (
                                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-slate-400">{chip}</span>
                                      ))}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className="text-[10px] text-gray-400 dark:text-slate-500">{v.sku || "— SKU —"}</span>
                                    <span className="text-[10px] font-semibold text-gray-600 dark:text-slate-300">{money(v.price ?? 0)}</span>
                                    {v.salePrice ? (
                                      <span className="text-[10px] text-rose-500 line-through">{money(v.salePrice)}</span>
                                    ) : null}
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${Number(v.stock) > 0 ? "bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-100/70 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}>
                                      {Number(v.stock) > 0 ? v.manageStock ? `${v.stock} in stock` : "Unlimited stock" : "Out of stock"}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${v.status === "active" ? "bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-100/70 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                                      {v.status}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDefaultVariationId(v.id);
                                        updateVariation(v.id, { isDefault: true });
                                        setVariations((cur) => cur.map((x) => ({ ...x, isDefault: x.id === v.id })));
                                        toast.success("Default variation set");
                                      }}
                                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md transition-colors ${v.isDefault || defaultVariationId === v.id ? "bg-indigo-100/70 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-slate-500 hover:text-indigo-500"}`}
                                      title="Set as default (pre-selected on product page)"
                                    >
                                      {v.isDefault || defaultVariationId === v.id ? "★ Default" : "☆ Default"}
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button type="button" onClick={() => duplicateVariation(v.id)} className="icon-square-btn w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-primary transition-colors" title="Duplicate variation">
                                    <FiCopy size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!window.confirm(`Delete variation “${v.name || "(unnamed)"}”?`)) return;
                                      removeVariation(v.id);
                                      toast.success("Variation deleted");
                                    }}
                                    className="icon-square-btn w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-rose-500 transition-colors"
                                    title="Delete variation"
                                  >
                                    <FiTrash2 size={13} />
                                  </button>
                                </div>
                              </div>

                              {expanded && (
                                <div className="px-4 py-3 bg-gray-50/70 dark:bg-white/2 border-t border-gray-100 dark:border-white/8 space-y-2.5">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div className="sm:col-span-3">
                                      <label className="text-[10px] text-gray-400 dark:text-slate-500 mb-1 block">Variation name</label>
                                      <input
                                        value={v.name}
                                        onChange={(e) => updateVariation(v.id, { name: e.target.value })}
                                        placeholder="e.g. Black / M"
                                        className="w-full text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 outline-none text-gray-700 dark:text-slate-200 placeholder-gray-400"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-gray-400 dark:text-slate-500 mb-1 block">SKU (unique)</label>
                                      <input
                                        value={v.sku ?? ""}
                                        onChange={(e) => updateVariation(v.id, { sku: e.target.value })}
                                        placeholder="Auto if blank"
                                        className="w-full text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 outline-none text-gray-700 dark:text-slate-200 placeholder-gray-400"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-gray-400 dark:text-slate-500 mb-1 block">Price</label>
                                      <input
                                        value={v.price}
                                        onChange={(e) => updateVariation(v.id, { price: e.target.value })}
                                        placeholder={sameVariationPrice ? "Uses product price" : "0"}
                                        disabled={sameVariationPrice}
                                        className="w-full text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 outline-none text-gray-700 dark:text-slate-200 placeholder-gray-400 disabled:opacity-60"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-gray-400 dark:text-slate-500 mb-1 block">Sale price (blank = none)</label>
                                      <input
                                        value={v.salePrice ?? ""}
                                        onChange={(e) => updateVariation(v.id, { salePrice: e.target.value ? e.target.value : null })}
                                        placeholder="Optional"
                                        className="w-full text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 outline-none text-gray-700 dark:text-slate-200 placeholder-gray-400"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-gray-400 dark:text-slate-500 mb-1 block">Weight (kg)</label>
                                      <input
                                        value={v.weight ?? ""}
                                        onChange={(e) => updateVariation(v.id, { weight: e.target.value })}
                                        placeholder="Optional"
                                        className="w-full text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 outline-none text-gray-700 dark:text-slate-200 placeholder-gray-400"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-gray-400 dark:text-slate-500 mb-1 block">Status</label>
                                      <select
                                        value={v.status}
                                        onChange={(e) => updateVariation(v.id, { status: e.target.value as "active" | "disabled" })}
                                        className="w-full text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 outline-none text-gray-700 dark:text-slate-200"
                                      >
                                        <option value="active">Active</option>
                                        <option value="disabled">Disabled</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 dark:border-white/10">
                                    <div className="min-w-0">
                                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-gray-700 dark:text-slate-200">
                                        <input
                                          type="checkbox"
                                          checked={v.manageStock}
                                          onChange={(e) => updateVariation(v.id, { manageStock: e.target.checked, ...(!e.target.checked ? { stock: Math.max(1, v.stock) } : {}) })}
                                          className="accent-primary"
                                        />
                                        Track stock quantity
                                      </label>
                                      <p className="mt-1 text-[10px] text-gray-400 dark:text-slate-500">{v.manageStock ? "Orders reduce this variation’s stock." : "Off = unlimited stock while available."}</p>
                                    </div>
                                    {v.manageStock ? (
                                      <div className="w-full sm:w-32">
                                        <label className="mb-1 block text-[10px] text-gray-400 dark:text-slate-500">Quantity</label>
                                        <input type="number" min={0} value={v.stock} onChange={(e) => updateVariation(v.id, { stock: Number(e.target.value) })} className="w-full text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 outline-none text-gray-700 dark:text-slate-200" />
                                      </div>
                                    ) : (
                                      <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                                        <input type="checkbox" checked={v.stock > 0} onChange={(e) => updateVariation(v.id, { stock: e.target.checked ? 1 : 0 })} className="accent-primary" />
                                        Available for orders
                                      </label>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] text-gray-400 dark:text-slate-500 mb-1 block">Variation image</label>
                                      <select
                                        value={v.image ?? ""}
                                        onChange={(e) => updateVariation(v.id, { image: e.target.value || null })}
                                        className="w-full text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 outline-none text-gray-700 dark:text-slate-200"
                                      >
                                        <option value="">Product image</option>
                                        {gallery.map((g, gi) => (
                                          <option key={gi} value={g.url}>{`Image ${gi + 1}${g.altText ? ` — ${g.altText}` : ""}`}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-gray-400 dark:text-slate-500 mb-1 block">Variation gallery (extra)</label>
                                      <select
                                        value=""
                                        onChange={(e) => {
                                          const url = e.target.value;
                                          if (!url) return;
                                          const current = v.gallery ?? [];
                                          if (!current.includes(url)) updateVariation(v.id, { gallery: [...current, url] });
                                          e.target.value = "";
                                        }}
                                        className="w-full text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 outline-none text-gray-700 dark:text-slate-200"
                                      >
                                        <option value="">Add gallery image…</option>
                                        {gallery.map((g, gi) => (
                                          <option key={gi} value={g.url}>{`Image ${gi + 1}${g.altText ? ` — ${g.altText}` : ""}`}</option>
                                        ))}
                                      </select>
                                      {v.gallery && v.gallery.length > 0 && (
                                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                          {v.gallery.map((url, gi) => (
                                            <span key={gi} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-slate-400">
                                              <img src={url} alt="" className="w-4 h-4 rounded object-cover" />
                                              {gi + 1}
                                              <button type="button" onClick={() => updateVariation(v.id, { gallery: v.gallery!.filter((_, i) => i !== gi) })} className="text-gray-400 hover:text-rose-500">
                                                <FiX size={10} />
                                              </button>
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-gray-400 dark:text-slate-500 mb-1 block">Variation description</label>
                                    <input
                                      value={v.description ?? ""}
                                      onChange={(e) => updateVariation(v.id, { description: e.target.value })}
                                      placeholder="Optional variation-specific details"
                                      className="w-full text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 outline-none text-gray-700 dark:text-slate-200 placeholder-gray-400"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {variations.length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-slate-500 border border-dashed border-gray-200 dark:border-white/10 rounded-xl p-3 text-center">
                      <FiBox size={14} className="inline mb-0.5 mr-1" />
                      No variations yet — add attributes above and tap “Generate Variations”.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-white/8">
              <button
                type="submit"
                className="px-6 h-10 bg-gradient-to-r from-primary to-indigo-500 text-white font-display font-bold rounded-xl text-sm hover:shadow-lg hover:shadow-primary/30 transition-all"
              >
                {editingProduct ? "Save Changes" : "Create & Publish Product"}
              </button>
              <button
                type="button"
                onClick={() => { setEditingProduct(null); setCreating(false); }}
                className="px-6 h-10 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-slate-300 font-semibold rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/3">
                <tr className="border-b border-gray-100 dark:border-white/8">
                  {[ "Product", "Category", "Price", "Stock", "Status", "Actions"].map((h) => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/4">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <img src={p.images[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&q=80"} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-xs max-w-[220px] truncate">{p.name}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500 font-mono italic">{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-600 dark:text-slate-400">{p.category?.name ?? "—"}</td>
                    <td className="py-3 px-4 font-bold text-xs text-gray-900 dark:text-white">{money(p.salePrice ?? p.price)}</td>
                    <td className="py-3 px-4">
                      {p.manageStock === false ? (
                        <span className={`font-mono text-xs font-bold ${p.stock <= 0 ? "text-rose-500" : "text-emerald"}`}>{p.stock <= 0 ? "Out" : "∞"}</span>
                      ) : (
                        <span className={`font-mono text-xs font-bold ${p.stock === 0 ? "text-rose-500" : p.stock < 20 ? "text-amber" : "text-emerald"}`}>{p.stock}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        onClick={() => toggleActive(p)}
                        className={`cursor-pointer px-2 py-0.5 rounded-full text-[10px] font-bold ${p.isActive ? "bg-emerald/10 text-emerald" : "bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-slate-400"}`}
                      >
                        {p.isActive ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => startEdit(p)}
                          className="icon-square-btn w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-400 hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-center text-xs"
                          title="Edit product"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <Link
                          href={productUrl(p.slug, p.name, p.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="icon-square-btn w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-400 hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-center text-xs"
                          title="View product page"
                          aria-label={`View ${p.name} product page`}
                        >
                          <FiExternalLink size={14} />
                        </Link>
                        <button
                          onClick={() => deleteProduct(p)}
                          className="icon-square-btn w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-400 hover:bg-rose-100 dark:hover:bg-rose-500/10 hover:text-rose-500 transition-colors flex items-center justify-center text-xs"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-gray-400 dark:text-slate-500">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== CATEGORIES ==================== */
type CategoryDisplay = {
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

function AdminCategories({ token, config, save, saving }: { token: string; config: Config; save: (payload: object) => Promise<void>; saving: boolean }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [creating, setCreating] = useState(false);
  const [parentId, setParentId] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = () => {
    api("/api/admin/categories", token)
      .then((r) => r.json())
      .then((res) => Array.isArray(res) && setCategories(res))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, [token]);

  async function createCategory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name")).trim();
    if (name.length < 2) return toast.error("Category name must be at least 2 characters");
    const slugRaw = String(f.get("slug") || "").trim();
    const slug = slugRaw || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `category-${Date.now()}`;
    try {
      const res = await api("/api/admin/categories", token, {
        method: "POST",
        body: JSON.stringify({
          name,
          slug,
          parentId: parentId || undefined,
          image: newCategoryImage,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(parentId ? "Sub-category created!" : "Category created!");
      setCreating(false);
      setParentId("");
      setNewCategoryImage(null);
      setCategoryMediaPickerId(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create category");
    }
  }

  async function saveCategory(id: string) {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    const nameRef = document.getElementById(`cat-name-${id}`) as HTMLInputElement | null;
    const slugRef = document.getElementById(`cat-slug-${id}`) as HTMLInputElement | null;
    const name = (nameRef?.value ?? cat.name).trim();
    if (name.length < 2) return toast.error("Category name must be at least 2 characters");
    const slugRaw = (slugRef?.value ?? cat.slug).trim();
    const slug = slugRaw.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || cat.slug;
    try {
      const res = await api(`/api/admin/categories/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ name, slug }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("Category updated");
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function promoteSubCategory(category: Category) {
    try {
      const res = await api(`/api/admin/categories/${category.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ parentId: null }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not make this a main category");
      toast.success(`${category.name} is now a main category`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update category");
    }
  }

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [categoryMediaPickerId, setCategoryMediaPickerId] = useState<string | null>(null);
  const [categoryMediaItems, setCategoryMediaItems] = useState<{ url: string; filename: string; altText?: string | null }[]>([]);
  const [categoryMediaLoading, setCategoryMediaLoading] = useState(false);
  const [newCategoryImage, setNewCategoryImage] = useState<string | null>(null);

  async function toggleCategoryMediaPicker(categoryId: string) {
    if (categoryMediaPickerId === categoryId) {
      setCategoryMediaPickerId(null);
      return;
    }
    setCategoryMediaPickerId(categoryId);
    if (categoryMediaItems.length) return;
    setCategoryMediaLoading(true);
    try {
      const response = await api("/api/admin/media", token);
      const items = await response.json();
      if (!response.ok || !Array.isArray(items)) throw new Error(items.error ?? "Could not load image library");
      setCategoryMediaItems(items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load image library");
      setCategoryMediaPickerId(null);
    } finally {
      setCategoryMediaLoading(false);
    }
  }

  async function selectCategoryImage(categoryId: string, imageUrl: string) {
    if (categoryId === "new") {
      setNewCategoryImage(imageUrl);
      setCategoryMediaPickerId(null);
      return;
    }
    try {
      const response = await api(`/api/admin/categories/${categoryId}`, token, {
        method: "PATCH",
        body: JSON.stringify({ image: imageUrl }),
      });
      if (!response.ok) throw new Error("Could not save the selected image");
      toast.success("Category image updated");
      setCategoryMediaPickerId(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the selected image");
    }
  }

  async function uploadNewCategoryImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const form = new FormData();
      form.append("image", file);
      const response = await fetch(apiUrl + "/api/admin/upload", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Upload failed");
      setNewCategoryImage(data.url);
      toast.success("Image ready for the new category");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      event.target.value = "";
    }
  }

  async function uploadCategoryImage(id: string, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingId(id);
    try {
      const form = new FormData();
      form.append("image", file);
      const response = await fetch(apiUrl + "/api/admin/upload", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const res = await api(`/api/admin/categories/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ image: data.url }),
      });
      if (!res.ok) throw new Error("Could not save image");
      toast.success("Category image updated");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingId(null);
      event.target.value = "";
    }
  }

  async function removeCategoryImage(id: string) {
    const res = await api(`/api/admin/categories/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ image: null }),
    });
    if (res.ok) {
      toast.success("Category image removed");
      load();
    } else toast.error("Could not remove image");
  }

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; productCount: number; categoryIds: string[] } | null>(null);
  const [moveTo, setMoveTo] = useState<string>("");

  async function doDelete(id: string, moveToCategoryId?: string) {
    const res = await api(`/api/admin/categories/${id}`, token, {
      method: "DELETE",
      body: JSON.stringify({ moveToCategoryId: moveToCategoryId ?? "" }),
    });
    if (res.ok) {
      toast.success(moveToCategoryId ? "Category deleted · products moved" : "Category deleted");
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Delete failed");
    }
  }

  async function deleteCategory(id: string) {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    const categoryIds = [id];
    for (let index = 0; index < categoryIds.length; index++) {
      categoryIds.push(...categories.filter((item) => item.parentId === categoryIds[index]).map((item) => item.id));
    }
    const productCount = categories.filter((item) => categoryIds.includes(item.id)).reduce((sum, item) => sum + (item._count?.products ?? 0), 0);
    setMoveTo("");
    setDeleteTarget({ id, name: cat.name, productCount, categoryIds });
  }

  async function confirmMoveDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.productCount > 0 && !moveTo) return toast.error("Select a category to move the products into");
    await doDelete(deleteTarget.id, moveTo || undefined);
    setDeleteTarget(null);
  }
  const subCategories = (parentId: string) => categories.filter((c) => c.parentId === parentId);

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-5 sm:p-6">
        <h3 className="font-display font-bold text-gray-900 dark:text-white">Homepage category display</h3>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
          Configure the home page &quot;Shop by Category&quot; display in{" "}
          <span className="font-semibold text-primary">Homepage Settings</span>.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display font-bold text-gray-900 dark:text-white">
          Categories & Sub-categories ({categories.filter((c) => !c.parentId).length} parents)
        </h3>
        <button
          onClick={() => {
            if (creating) {
              setNewCategoryImage(null);
              setCategoryMediaPickerId(null);
            }
            setCreating(!creating);
          }}
          className="flex items-center gap-2 px-4 h-9 bg-gradient-to-r from-primary to-indigo-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all"
        >
          {creating ? (
            <>
              <FiX /> Cancel
            </>
          ) : (
            <>
              <FiPlus /> New Category
            </>
          )}
        </button>
      </div>

      {creating && (
        <form onSubmit={createCategory} className="p-5 bg-gray-50 dark:bg-white/4 rounded-xl border border-gray-200 dark:border-white/8 space-y-4">
          <Input label="Category Name" name="name" isRequired placeholder="e.g. T-Shirts, Men's Wear, Shoes..." />
          <Input label="Slug (Optional – auto-generated if empty)" name="slug" placeholder="e.g. t-shirts" />
          <Select label="Parent Category (Optional)" aria-label="Parent category" selectedKeys={parentId ? [parentId] : []} onChange={(e) => setParentId(e.target.value)}>
            <>
              <SelectItem key="none" textValue="none">
                — Top-level category (no parent) —
              </SelectItem>
              {(categories.filter((c) => !c.parentId) ?? []).map((c) => (
                <SelectItem key={c.id}>{c.name}</SelectItem>
              ))}
            </>
          </Select>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">Category image <span className="font-normal text-gray-400">(optional)</span></p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-primary/10 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/20">
                <FiUpload /> Upload new image
                <input type="file" accept="image/*" className="hidden" onChange={uploadNewCategoryImage} />
              </label>
              <button type="button" onClick={() => toggleCategoryMediaPicker("new")} className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary/20 bg-white px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/5 dark:bg-white/5">
                <FiImage /> Choose existing image
              </button>
              {newCategoryImage && <img src={newCategoryImage} alt="Selected category image" className="h-10 w-10 rounded-lg border border-gray-200 object-cover dark:border-white/10" />}
            </div>
            {categoryMediaPickerId === "new" && (
              <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900">
                <p className="mb-3 text-xs text-gray-500 dark:text-slate-400">Choose an image from the media library.</p>
                {categoryMediaLoading ? <p className="py-5 text-center text-sm text-gray-500">Loading images…</p> : categoryMediaItems.length ? (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {categoryMediaItems.map((image) => (
                      <button key={image.url} type="button" onClick={() => selectCategoryImage("new", image.url)} title={image.filename} aria-label={`Use ${image.filename} for this category`} className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
                        <img src={image.url} alt={image.altText ?? image.filename} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : <p className="py-5 text-center text-sm text-gray-500">No images available yet. Upload one above first.</p>}
              </div>
            )}
          </div>
          <button type="submit" className="h-10 px-5 bg-primary text-white text-sm font-bold font-display rounded-xl hover:bg-primary-dark transition-colors">
            {parentId ? "Create Sub-category" : "Create Category"}
          </button>
        </form>
      )}

      {!categories.length ? (
        <p className="text-sm text-gray-400 dark:text-slate-500">No categories yet. Create your first category above.</p>
      ) : (
        <div className="space-y-4">
          {categories.filter((c) => !c.parentId).map((cat) => {
            const subs = subCategories(cat.id);
            return (
              <div key={cat.id} className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 overflow-hidden">
                <div className="flex items-start gap-3 px-5 py-4">
                  <span className="relative w-12 h-12 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-primary to-cyan flex items-center justify-center text-white text-xs font-bold">
                    {cat.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cat.image} alt={cat.name} className="h-full w-full object-cover" />
                    ) : (
                      (cat.name[0]?.toUpperCase() ?? "C")
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    {editingId === cat.id ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            id={`cat-name-${cat.id}`}
                            defaultValue={cat.name}
                            className="w-full max-w-56 h-9 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-gray-900 dark:text-white outline-none focus:border-primary"
                            placeholder="Category name"
                          />
                          <input
                            id={`cat-slug-${cat.id}`}
                            defaultValue={cat.slug}
                            className="w-full max-w-40 h-9 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-gray-900 dark:text-white outline-none focus:border-primary"
                            placeholder="slug"
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="flex items-center gap-2 px-3 h-8 rounded-lg bg-primary/10 text-primary text-xs font-bold cursor-pointer hover:bg-primary/20 transition-colors">
                            {uploadingId === cat.id ? <FiUpload className="animate-pulse" /> : <FiImage />}
                            {cat.image ? "Change image" : "Upload image"}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadCategoryImage(cat.id, e)} disabled={uploadingId === cat.id} />
                          </label>
                          <button
                            type="button"
                            onClick={() => toggleCategoryMediaPicker(cat.id)}
                            className="flex h-8 items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/10"
                          >
                            <FiImage /> {categoryMediaPickerId === cat.id ? "Hide image library" : "Choose existing image"}
                          </button>
                          {cat.image && (
                            <button
                              type="button"
                              onClick={() => removeCategoryImage(cat.id)}
                              className="px-3 h-8 rounded-lg bg-rose-50 text-rose-500 text-xs font-bold hover:bg-rose-100 transition-colors"
                            >
                              Remove image
                            </button>
                          )}
                          <button
                            onClick={() => saveCategory(cat.id)}
                            className="px-4 h-8 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 h-8 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-300 text-xs font-semibold hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                        {categoryMediaPickerId === cat.id && (
                          <div className="rounded-xl border border-gray-200 p-3 dark:border-white/10">
                            <p className="mb-3 text-xs text-gray-500 dark:text-slate-400">Choose an image from the media library for this category.</p>
                            {categoryMediaLoading ? <p className="py-5 text-center text-sm text-gray-500">Loading images…</p> : categoryMediaItems.length ? (
                              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                                {categoryMediaItems.map((image) => (
                                  <button
                                    key={image.url}
                                    type="button"
                                    onClick={() => selectCategoryImage(cat.id, image.url)}
                                    disabled={cat.image === image.url}
                                    title={image.filename}
                                    aria-label={`Use ${image.filename} as the category image`}
                                    className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 disabled:opacity-60 dark:border-white/10"
                                  >
                                    <img src={image.url} alt={image.altText ?? image.filename} className="h-full w-full object-cover" />
                                    {cat.image === image.url && <span className="absolute inset-x-0 bottom-0 bg-primary/90 px-1 py-0.5 text-[10px] font-semibold text-white">Current</span>}
                                  </button>
                                ))}
                              </div>
                            ) : <p className="py-5 text-center text-sm text-gray-500">No images available yet. Upload an image above first.</p>}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <p className="font-display font-bold text-sm text-gray-900 dark:text-white">{cat.name}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                          /{cat.slug} · {subs.length} sub-categories · {cat._count?.products ?? 0} products
                        </p>
                      </>
                    )}
                  </div>
                  {editingId !== cat.id && (
                    <>
                      <a
                        href={`/categories/${cat.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        title="View category products"
                        className="icon-square-btn w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-400 hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-center text-xs"
                      >
                        <FiEye />
                      </a>
                      <button
                        onClick={() => setEditingId(cat.id)}
                        className="px-3 h-8 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <FiEdit2 /> Edit
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="icon-square-btn w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-400 hover:bg-rose-100 dark:hover:bg-rose-500/10 hover:text-rose-500 transition-colors flex items-center justify-center text-xs"
                  >
                    <FiTrash2 />
                  </button>
                </div>
                {subs.length > 0 && (
                  <div className="px-5 pb-4 space-y-2">
                    {subs.map((sub) => (
                      <div key={sub.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-white/4 rounded-xl">
                        <span className="text-xs text-primary font-bold">↳</span>
                        <p className="flex-1 text-sm font-medium text-gray-700 dark:text-slate-300">{sub.name}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">/{sub.slug} · {sub._count?.products ?? 0}</p>
                        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20">
                          <FiUpload /> Upload image
                          <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadCategoryImage(sub.id, event)} disabled={uploadingId === sub.id} />
                        </label>
                        <button type="button" onClick={() => toggleCategoryMediaPicker(sub.id)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/20 bg-white px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 dark:bg-white/5">
                          <FiImage /> {categoryMediaPickerId === sub.id ? "Hide images" : "Choose image"}
                        </button>
                        {categoryMediaPickerId === sub.id && (
                          <div className="w-full rounded-xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900">
                            <p className="mb-3 text-xs text-gray-500 dark:text-slate-400">Choose an existing image for {sub.name}.</p>
                            {categoryMediaLoading ? <p className="py-5 text-center text-sm text-gray-500">Loading images…</p> : categoryMediaItems.length ? (
                              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                                {categoryMediaItems.map((image) => (
                                  <button key={image.url} type="button" onClick={() => selectCategoryImage(sub.id, image.url)} disabled={sub.image === image.url} title={image.filename} aria-label={`Use ${image.filename} as the category image`} className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 disabled:opacity-60 dark:border-white/10">
                                    <img src={image.url} alt={image.altText ?? image.filename} className="h-full w-full object-cover" />
                                    {sub.image === image.url && <span className="absolute inset-x-0 bottom-0 bg-primary/90 px-1 py-0.5 text-[10px] font-semibold text-white">Current</span>}
                                  </button>
                                ))}
                              </div>
                            ) : <p className="py-5 text-center text-sm text-gray-500">No images available yet. Upload one above first.</p>}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => promoteSubCategory(sub)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                          title="Remove parent and make this a main category"
                        >
                          <FiArrowUp /> Make main category
                        </button>
                        <a
                          href={`/categories/${sub.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          title="View sub-category products"
                          className="icon-square-btn w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-400 hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-center text-xs"
                        >
                          <FiEye />
                        </a>
                        <button
                          onClick={() => deleteCategory(sub.id)}
                          className="icon-square-btn w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-400 hover:bg-rose-100 dark:hover:bg-rose-500/10 hover:text-rose-500 transition-colors flex items-center justify-center text-xs"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/8 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="font-display font-bold text-gray-900 dark:text-white text-base">Delete Category</h4>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
              Deleting <strong className="text-gray-900 dark:text-white">{deleteTarget.name}</strong> also deletes its sub-categories.
              {deleteTarget.productCount > 0 && <> Move the {deleteTarget.productCount} products in this category tree to another category first.</>}
            </p>
            {deleteTarget.productCount > 0 && <div className="mt-4">
              <Select
                label="Move products to"
                aria-label="Move products to"
                selectedKeys={moveTo ? [moveTo] : []}
                onChange={(e) => setMoveTo(e.target.value)}
              >
                {categories.filter((c) => !deleteTarget.categoryIds.includes(c.id)).map((c) => (
                  <SelectItem key={c.id}>{c.name} ({c._count?.products ?? 0})</SelectItem>
                ))}
              </Select>
            </div>}\n            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 h-9 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-slate-300 text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmMoveDelete}
                disabled={deleteTarget.productCount > 0 && !moveTo}
                className="px-4 h-9 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 transition-colors disabled:opacity-50"
              >
                {deleteTarget.productCount > 0 ? "Move & Delete" : "Delete Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== ORDERS (KANBAN) ==================== */
function AdminOrders({ token, config, isAdmin }: { token: string; config: Config; isAdmin: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [abandonedCount, setAbandonedCount] = useState(0);
  const [archivedOrders, setArchivedOrders] = useState<{ id: string; status: string; paymentStatus: string; totalAmount: string; deletedAt: string; courierName?: string | null; courierTrackingId?: string | null }[]>([]);
  const [abandoned, setAbandoned] = useState<{ sessionId: string; name?: string | null; phone?: string | null; email?: string | null; items: { name: string; qty: number; price: number }[]; total: string; updatedAt: string }[]>([]);
  const [view, setView] = useState<"kanban" | "table">(() => {
    try {
      return localStorage.getItem("epic-orders-view") === "kanban" ? "kanban" : "table";
    } catch {
      return "table";
    }
  });
  const [showInfo, setShowInfo] = useState<boolean>(() => typeof window === "undefined" || window.innerWidth >= 1024);
  const [openCourier, setOpenCourier] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [sfBalance, setSfBalance] = useState<number | null>(null);
  const [sfBalVisible, setSfBalVisible] = useState(false);
  const [loadingBal, setLoadingBal] = useState(false);
  const [detail, setDetail] = useState<Order | null>(null);

  const load = () => {
    api("/api/admin/orders", token)
      .then((r) => r.json())
      .then((res) => Array.isArray(res) && setOrders(res))
      .catch(() => {});
    api("/api/admin/abandoned-checkouts", token).then((r) => r.json()).then((res) => { if (Array.isArray(res?.items)) { setAbandoned(res.items); setAbandonedCount(Number(res.count) || 0); } }).catch(() => {});
    api("/api/admin/orders/archived", token).then((r) => r.json()).then((res) => Array.isArray(res) && setArchivedOrders(res)).catch(() => {});
  };

  useEffect(() => {
    load();
  }, [token]);

  async function updateStatus(id: string, status: string, paymentStatus: string) {
    const res = await api(`/api/admin/orders/${id}`, token, { method: "PATCH", body: JSON.stringify({ status, paymentStatus }) });
    if (res.ok) {
      toast.success("Order status updated.");
      load();
    } else toast.error("Could not update the order.");
  }

  async function deleteOrders(ids: string[]) {
    const affected = orders.filter((order) => ids.includes(order.id));
    const paidCount = affected.filter((order) => order.paymentStatus === "PAID").length;
    const courierCount = affected.filter((order) => Boolean(order.courierName || order.courierTrackingId)).length;
    const warning = paidCount || courierCount ? `\n\nWarning: ${paidCount} paid and ${courierCount} courier-linked order(s).` : "";
    if (!ids.length || !window.confirm(`Archive ${ids.length} selected order${ids.length > 1 ? "s" : ""}? They will be hidden from active lists, retained in the database, and recorded in the audit log.${warning}`)) return;
    const response = await api(ids.length === 1 ? `/api/admin/orders/${ids[0]}` : "/api/admin/orders/bulk", token, { method: "DELETE", ...(ids.length === 1 ? {} : { body: JSON.stringify({ ids }) }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { toast.error(result.error || "Could not delete orders"); return; }
    setSelectedOrderIds([]); toast.success(`${result.deleted} order${result.deleted === 1 ? "" : "s"} archived; audit record saved`); load();
  }

  async function restoreOrder(id: string) {
    const response = await api(`/api/admin/orders/${id}/restore`, token, { method: "POST" });
    if (response.ok) { toast.success("Order restored to active orders"); load(); }
    else toast.error("Could not restore order");
  }

  const courierPrefix: Record<string, string> = { steadfast: "ST", pathao: "PT", redx: "RX" };
  const couriers = [
    { key: "steadfast", label: "Steadfast", enabled: Boolean(config.courierConfigured && (config.courierConfig?.steadfast?.enabled ?? true)) },
    { key: "pathao", label: "Pathao", enabled: Boolean(config.courierConfig?.pathao?.enabled) },
    { key: "redx", label: "RedX", enabled: Boolean(config.courierConfig?.redx?.enabled) },
  ].filter((c) => config.courierConfigured && c.enabled);

  const courierStats = couriers.map((c) => {
    const parcels = orders.filter((o) => (o.courierName || "").trim().toLowerCase() === c.label.toLowerCase());
    return { ...c, parcels };
  });
  const allParcels = orders.filter((o) => o.courierName);
  const courierTotalAmount = allParcels.reduce((s, o) => s + Number(o.totalAmount), 0);

  async function sendToCourier(o: Order, key: string) {
    const c = couriers.find((x) => x.key === key);
    if (!c) return;
    if (key === "steadfast") {
      const res = await api(`/api/admin/orders/${o.id}/send-steadfast`, token, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; consignment?: { tracking_code?: string } };
      if (res.ok) {
        toast.success(`#${o.id.slice(0, 6)} → Steadfast ${data.consignment?.tracking_code ?? ""}`);
        load();
      } else toast.error(data.error || "Could not send the order to Steadfast.");
      return;
    }
    const tracking = o.courierTrackingId || `${courierPrefix[c.key] ?? "PC"}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const res = await api(`/api/admin/orders/${o.id}`, token, { method: "PATCH", body: JSON.stringify({ status: "IN_COURIER", courierName: c.label, courierTrackingId: tracking }) });
    if (res.ok) {
      toast.success(`#${o.id.slice(0, 6)} → ${c.label}`);
      load();
    } else toast.error("Could not send the order.");
  }

  const columns = ["PENDING", "CONFIRMED", ...(config.courierConfigured ? ["IN_COURIER"] : []), "SHIPPED", "DELIVERED", "CANCELLED"];
  const columnColor: Record<string, string> = {
    PENDING: "text-amber border-amber/30 bg-amber/5",
    CONFIRMED: "text-primary border-primary/30 bg-primary/5",
    IN_COURIER: "text-indigo-500 border-indigo-500/30 bg-indigo-500/5",
    SHIPPED: "text-blue-500 border-blue-500/30 bg-blue-500/5",
    DELIVERED: "text-emerald border-emerald/30 bg-emerald/5",
    CANCELLED: "text-rose-500 border-rose-500/30 bg-rose-500/5",
  };
  const dotColor: Record<string, string> = {
    PENDING: "bg-amber",
    CONFIRMED: "bg-primary",
    IN_COURIER: "bg-indigo-500",
    SHIPPED: "bg-blue-500",
    DELIVERED: "bg-emerald",
    CANCELLED: "bg-rose-500",
  };

  const sfStatusStyle: Record<string, string> = {
    delivered: "bg-emerald/10 text-emerald",
    partial_delivered: "bg-emerald/10 text-emerald",
    cancelled: "bg-rose-500/10 text-rose-500",
    in_review: "bg-amber/10 text-amber",
    hold: "bg-orange-500/10 text-orange-500",
    unknown: "bg-gray-100 dark:bg-white/8 text-gray-500",
    unknown_approval_pending: "bg-slate-100 dark:bg-white/8 text-slate-500",
    pending: "bg-indigo-500/10 text-indigo-500",
  };
  const sfStatusLabel: Record<string, string> = {
    delivered: "Delivered",
    partial_delivered: "Partially Delivered",
    cancelled: "Cancelled",
    in_review: "In Review",
    hold: "On Hold",
    unknown: "Unknown",
    unknown_approval_pending: "Approval Pending",
    pending: "Pending",
  };
  const courierStatusForOrder = (o: Order) => {
    const raw = o.shippingDetails?.sfStatus?.trim().toLowerCase();
    // Steadfast can keep a stale "unknown" after a consignment is removed; retain the store order's status.
    if (raw === "unknown") return `Not found in Steadfast · ${STATUS_LABEL[o.status] ?? o.status}`;
    return raw ? (sfStatusLabel[raw] ?? o.shippingDetails?.sfStatus ?? "Not synced") : "Not synced";
  };

  const safeDate = (d: string) => {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? d : dt;
  };
  const today = new Date().setHours(0, 0, 0, 0);
  const stats = {
    total: orders.length,
    today: orders.filter((o) => new Date(safeDate(o.createdAt)).getTime() >= today).length,
    cancelled: orders.filter((o) => o.status === "CANCELLED").length,
    delivered: orders.filter((o) => o.status === "DELIVERED").length,
    pending: orders.filter((o) => o.status === "PENDING").length,
    shipped: orders.filter((o) => o.status === "SHIPPED" || (config.courierConfigured && o.status === "IN_COURIER")).length,
  };
  const sfAgg: Record<string, number> = {};
  if (config.courierConfigured) orders.forEach((o) => {
    const st = o.shippingDetails?.sfStatus;
    if (st) sfAgg[st] = (sfAgg[st] ?? 0) + 1;
  });

  async function syncSteadfast(o: Order) {
    setSyncing(o.id);
    try {
      const res = await api(`/api/admin/orders/${o.id}/sync-steadfast`, token, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; delivery_status?: string };
      if (res.ok) {
        toast.success(`Status: ${sfStatusLabel[data.delivery_status ?? ""] ?? data.delivery_status}`);
        load();
      } else toast.error(data.error || "Could not sync the order.");
    } finally {
      setSyncing(null);
    }
  }

  async function syncAllSteadfast() {
    setSyncingAll(true);
    try {
      const res = await api("/api/admin/orders/sync-all-steadfast", token, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; synced?: number };
      if (res.ok) {
        toast.success(`${data.synced ?? 0} parcels synced`);
        load();
      } else toast.error(data.error || "Could not sync orders.");
    } finally {
      setSyncingAll(false);
    }
  }

  async function fetchSfBalance() {
    setLoadingBal(true);
    try {
      const res = await api("/api/admin/steadfast/balance", token);
      const data = (await res.json().catch(() => ({}))) as { error?: string; balance?: number };
      if (res.ok && typeof data.balance === "number") setSfBalance(data.balance);
      else toast.error(data.error || "Could not load the balance.");
    } finally {
      setLoadingBal(false);
    }
  }

  function printOrder(o: Order) {
    const sd = o.shippingDetails ?? {};
    const items = o.orderItems ?? [];
    const win = window.open("", "_blank", "width=480,height=640");
    if (!win) return toast.error("The browser blocked the print window.");
    const row = (l: string, r: string) => `<tr><td style="padding:3px 0;color:#444">${l}</td><td style="padding:3px 0;text-align:right;font-weight:700">${r}</td></tr>`;
    const itemRows = items.map((it) => `<tr><td style="padding:2px 0;font-size:12px">${it.name}</td><td style="padding:2px 0;font-size:12px;text-align:right">${it.qty} x ${money(it.price)}</td></tr>`).join("");
    const isSf = config.courierConfigured && o.courierName?.toLowerCase() === "steadfast";
    const sfRef = isSf ? sd.sfTrackingCode ?? o.courierTrackingId ?? "" : "";
    const invoiceRef = isSf && sfRef ? `SF-${sfRef}` : `#${o.id.slice(0, 8)}`;
    win.document.write(`<!DOCTYPE html><html><head><title>Invoice ${invoiceRef}</title><style>
      body{width:80mm;margin:0 auto;font-family:'Courier New',monospace;font-size:12px;color:#000}
      h1{font-size:16px;margin:0 0 2px}h3{font-size:13px;margin:0}
      .c{text-align:center}.dashed{border-top:1px dashed #000;margin:6px 0}
      table{width:100%;border-collapse:collapse}
      .mono{font-family:'Courier New',monospace}
      .big{font-size:14px;font-weight:bold;letter-spacing:0.5px}
      @media print{@page{margin:4mm}body{width:auto}}
    </style></head><body>
      <div class="c"><h1>${config.storeName}</h1><p style="font-size:11px;margin:2px 0">${new Date(o.createdAt).toLocaleString()}</p></div>
      <div class="dashed"></div>
      <table>${row("Invoice", invoiceRef)}${row("Customer", sd.name ?? "Guest")}${row("Phone", sd.phone ?? "")}${row("Payment", o.paymentStatus)}${row("Order Status", STATUS_LABEL[o.status] ?? o.status)}</table>
      <div class="dashed"></div>
      <table>${itemRows}</table>
      <div class="dashed"></div>
      <table><tr><td style="padding:3px 0"></td><td style="padding:3px 0"></td></tr>${row("Subtotal", money(o.subtotal ?? o.totalAmount))}${Number(o.shippingCharge) ? row("Shipping", money(o.shippingCharge ?? 0)) : ""}${row("Total", money(o.totalAmount))}</table>
      <div class="dashed"></div>
      <div style="text-align:center;font-size:11px">Address: ${[sd.addressLine1, sd.addressLine2, sd.city, sd.state, sd.postalCode, sd.country].filter(Boolean).join(", ")}</div>
      ${o.courierName ? `<div class="dashed"></div><div style="text-align:center"><b>${o.courierName}</b></div>${invoiceRef.startsWith("SF-") ? `<div class="c" style="font-size:11px;margin-top:3px">Consignment ID: <span class="big">${sfRef}</span></div>` : ""}<div class="c" style="margin-top:2px"><span style="font-size:11px">Delivery Status: </span> <span class="big">${o.shippingDetails?.sfStatus ? courierStatusForOrder(o) : "—"}</span></div>` : ""}
      <div class="dashed"></div>
      <div style="text-align:center">Thank you!</div>
    </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
          {(["table", "kanban"] as const).map((v) => (
            <button
              key={v}
              onClick={() => { setView(v); try { localStorage.setItem("epic-orders-view", v); } catch {} }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                view === v ? "bg-white dark:bg-[#1a1a2e] text-gray-900 dark:text-white shadow-sm" : "text-gray-400 dark:text-slate-500"
              }`}
            >
              {v === "kanban" ? "⊞ Kanban" : "≡ Table"}
            </button>
          ))}
          <span className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-slate-500 self-center">{orders.length} orders</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {couriers.some((c) => c.key === "steadfast") && (
            <>
              <Button size="sm" variant="flat" onPress={syncAllSteadfast} isLoading={syncingAll}>
                <FiRefreshCw size={12} /> Sync Steadfast
              </Button>
              <div
                onClick={() => sfBalance === null && !loadingBal && fetchSfBalance()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-white/4 border border-gray-100 dark:border-white/6 text-gray-600 dark:text-slate-300 cursor-pointer"
                title="Steadfast account balance (select to load)"
              >
                <FiBox size={12} className="text-primary" />
                <span>SF Balance</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  {loadingBal ? <FiRefreshCw size={12} className="animate-spin" /> : sfBalance !== null ? (sfBalVisible ? money(sfBalance) : "••••") : "—"}
                </span>
                <Button
                  isIconOnly
                  type="button"
                  size="sm"
                  variant="light"
                  onPress={() => setSfBalVisible((visible) => !visible)}
                  aria-label={sfBalVisible ? "Hide Steadfast balance" : "Show Steadfast balance"}
                  title={sfBalVisible ? "Hide balance" : "Show balance"}
                  className="ml-1 min-w-8 h-8 text-gray-700 dark:text-slate-200 opacity-100"
                >
                  {sfBalVisible ? <FiEyeOff size={16} strokeWidth={2.5} /> : <FiEye size={16} strokeWidth={2.5} />}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {isAdmin && selectedOrderIds.length > 0 && <div className="flex justify-end"><Button size="sm" color="danger" onPress={() => deleteOrders(selectedOrderIds)}><FiTrash2 size={12} /> Delete {selectedOrderIds.length} selected</Button></div>}
      {isAdmin && <div className="rounded-2xl border border-gray-100 dark:border-white/6 bg-white dark:bg-white/4 overflow-hidden"><div className="px-4 py-3 border-b border-gray-100 dark:border-white/8"><h3 className="font-bold text-sm">Abandoned checkouts</h3><p className="text-xs text-gray-400">{abandonedCount} unfinished checkout sessions</p></div>{abandoned.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{["Last activity","Customer","Contact","Items","Cart total"].map(h=><th key={h} className="text-left p-3 text-xs text-gray-400">{h}</th>)}</tr></thead><tbody>{abandoned.slice(0,20).map(c=><tr key={c.sessionId} className="border-t border-gray-100 dark:border-white/6"><td className="p-3 text-xs">{new Date(c.updatedAt).toLocaleString()}</td><td className="p-3 text-xs">{c.name || "Guest"}</td><td className="p-3 text-xs">{c.phone || c.email || "—"}</td><td className="p-3 text-xs">{(c.items || []).map(i=>`${i.name} × ${i.qty}`).join(", ")}</td><td className="p-3 text-xs font-bold">{money(c.total)}</td></tr>)}</tbody></table></div>:<p className="p-4 text-xs text-gray-400">No abandoned checkouts recorded. A session appears after a shopper enters checkout details.</p>}</div>}
      {isAdmin && archivedOrders.length > 0 && <div className="rounded-2xl border border-gray-100 dark:border-white/6 bg-white dark:bg-white/4 overflow-hidden"><div className="px-4 py-3 border-b border-gray-100 dark:border-white/8"><h3 className="font-bold text-sm">Archived orders</h3><p className="text-xs text-gray-400">Soft deleted and retained in the database · restore to return to active orders</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><tbody>{archivedOrders.map(o=><tr key={o.id} className="border-t border-gray-100 dark:border-white/6"><td className="p-3 text-xs font-bold text-primary">#{o.id.slice(0,8)}</td><td className="p-3 text-xs">{STATUS_LABEL[o.status] ?? o.status}</td><td className="p-3 text-xs">{o.paymentStatus}</td><td className="p-3 text-xs">{money(o.totalAmount)}</td><td className="p-3 text-xs">{new Date(o.deletedAt).toLocaleString()}</td><td className="p-3 text-right"><Button size="sm" variant="flat" onPress={()=>restoreOrder(o.id)}>Restore</Button></td></tr>)}</tbody></table></div></div>}

      <button
        type="button"
        onClick={() => setShowInfo((v) => !v)}
        className="lg:hidden w-full flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400 bg-white dark:bg-white/4 border border-gray-100 dark:border-white/6 rounded-xl px-3 py-2.5 mb-2"
      >
        <span className="flex-1 text-left">{config.courierConfigured ? "Dashboard info & courier parcels" : "Dashboard info"}</span>
        <span>{showInfo ? "Hide" : "Show"}</span>
        <span className={`transition-transform ${showInfo ? "" : "rotate-180"}`}>▾</span>
      </button>
      {showInfo && (
        <>
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
        {[
          { label: "Total", value: stats.total, cls: "text-gray-900 dark:text-white" },
          { label: "Today", value: stats.today, cls: "text-primary" },
          { label: "Pending", value: stats.pending, cls: "text-amber" },
          ...(config.courierConfigured ? [{ label: "Courier", value: stats.shipped, cls: "text-indigo-500" }, { label: "SF: In Review", value: sfAgg.in_review ?? 0, cls: "text-amber" }, { label: "SF: Delivered", value: sfAgg.delivered ?? 0, cls: "text-emerald" }] : []),
          { label: "Delivered", value: stats.delivered, cls: "text-emerald" },
          { label: "Cancelled", value: stats.cancelled, cls: "text-rose-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-white/4 rounded-xl border border-gray-100 dark:border-white/6 px-3 py-2.5">
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">{s.label}</p>
            <p className={`text-lg font-extrabold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>
      {Object.keys(sfAgg).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(sfAgg).map(([st, n]) => (
            <span key={st} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sfStatusStyle[st] ?? "bg-gray-100 dark:bg-white/8 text-gray-500"}`}>
              {sfStatusLabel[st] ?? st}: {n}
            </span>
          ))}
        </div>
      )}

      {couriers.length > 0 && (
        <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-gray-100 dark:border-white/6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan flex items-center justify-center text-white">
                <FiTruck size={16} />
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm">Courier Parcels</h3>
                <p className="text-xs text-gray-400 dark:text-slate-500 truncate">
                  {allParcels.length} parcels sent · {money(courierTotalAmount)} total value
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {couriers.map((c) => (
                <span key={c.key} className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500">
                  {c.label}
                </span>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/3 border-b border-gray-100 dark:border-white/8">
                <tr>
                  {[["Courier", "Courier"], ["Parcels", "Parcels"], ["Total Amount", "Total Amount"], ["IN_COURIER", STATUS_LABEL.IN_COURIER], ["SHIPPED", STATUS_LABEL.SHIPPED], ["DELIVERED", STATUS_LABEL.DELIVERED], ["", ""]].map(([h, label]) => (
                    <th key={h} className="py-2.5 px-4 text-left text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/4">
                {config.courierConfigured && courierStats.map((c) => {
                  const count = (st: string) => c.parcels.filter((o) => o.status === st).length;
                  return (
                    <tr key={c.key} className="hover:bg-gray-50/60 dark:hover:bg-white/3">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                          <span className="text-xs font-bold text-gray-800 dark:text-slate-200">{c.label}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-xs text-gray-800 dark:text-slate-200">{c.parcels.length}</td>
                      <td className="py-3 px-4 font-bold text-xs text-gray-800 dark:text-slate-200">{money(c.parcels.reduce((s, o) => s + Number(o.totalAmount), 0))}</td>
                      <td className="py-3 px-4 text-xs text-gray-500">{count("IN_COURIER")}</td>
                      <td className="py-3 px-4 text-xs text-gray-500">{count("SHIPPED")}</td>
                      <td className="py-3 px-4 text-xs text-gray-500">{count("DELIVERED")}</td>
                      <td className="py-3 px-4 text-right">
                        <Button size="sm" variant="flat" onPress={() => setOpenCourier(openCourier === c.key ? null : c.key)}>
                          {openCourier === c.key ? "Hide" : "Details"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {openCourier &&
            courierStats
              .filter((c) => c.key === openCourier)
              .map((c) => (
                <div key={c.key} className="border-t border-gray-100 dark:border-white/6">
                  <div className="px-4 sm:px-5 py-3 text-xs font-bold text-gray-500 dark:text-slate-400">
                    {c.label} parcels ({c.parcels.length})
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-50 dark:divide-white/4">
                        {c.parcels.map((o) => (
                          <tr key={o.id}>
                            <td className="py-2.5 px-4 text-xs text-primary font-bold whitespace-nowrap">#{o.id.slice(0, 8)}</td>
                            <td className="py-2.5 px-4 text-xs text-gray-700 dark:text-slate-300">{o.shippingDetails?.name ?? "Guest"}</td>
                            <td className="py-2.5 px-4 text-xs text-gray-500">{o.courierTrackingId || "—"}</td>
                            <td className="py-2.5 px-4 text-xs text-gray-500">
                              {o.courierName?.toLowerCase() === "steadfast" ? (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${sfStatusStyle[o.shippingDetails?.sfStatus ?? ""] ?? "bg-gray-100 dark:bg-white/8 text-gray-500"}`}>
                                  {courierStatusForOrder(o)}
                                  <button type="button" onClick={() => syncSteadfast(o)} disabled={syncing === o.id} title="Sync status">
                                    <FiRefreshCw size={10} className={syncing === o.id ? "animate-spin" : ""} />
                                  </button>
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-xs text-gray-800 dark:text-slate-200">{money(o.totalAmount)}</td>
                            <td className="py-2.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${o.paymentStatus === "PAID" ? "bg-emerald/10 text-emerald" : "bg-amber/10 text-amber"}`}>
                                {o.paymentStatus}
                              </span>
                            </td>
                            <td className="py-2.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusPill(o.status)}`}>{STATUS_LABEL[o.status] ?? o.status}</span>
                            </td>
                            <td className="py-2.5 px-4 text-xs text-gray-400 whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString()}</td>
                            <td className="py-2.5 px-4">
                              <Button size="sm" variant="light" className="h-7 w-7 min-w-0 px-0" onPress={() => printOrder(o)}>
                                <FiPrinter size={12} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {!c.parcels.length && (
                          <tr>
                            <td className="py-4 px-4 text-xs text-gray-400 text-center" colSpan={9}>
                              No parcels for {c.label} yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
                </div>
              )}
        </>
      )}

      {view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-x-visible xl:grid-cols-3">
          {columns.map((col) => {
            const colOrders = orders.filter((o) => (o.status || "").trim().toUpperCase() === col);
            return (
              <div key={col} className="min-w-[250px] shrink-0 md:min-w-0">
                <div className={`flex items-center gap-2 mb-3 px-3 py-2.5 rounded-xl border ${columnColor[col]}`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor[col]}`} />
                  <span className="text-xs font-bold truncate">{STATUS_LABEL[col] ?? col}</span>
                  <span className="ml-auto shrink-0 min-w-[24px] text-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 dark:bg-black/25">
                    {colOrders.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {colOrders.map((o) => (
                    <div key={o.id} className="min-w-0 bg-white dark:bg-[#111118] rounded-xl border border-gray-100 dark:border-white/6 p-4 hover:border-primary/20 transition-all hover:shadow-md cursor-pointer" onClick={() => setDetail(o)}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-mono text-xs font-bold text-primary truncate">#{o.id.slice(0, 6)}</span>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${o.paymentStatus === "PAID" ? "bg-emerald/10 text-emerald" : "bg-amber/10 text-amber"}`}>
                          {o.paymentStatus}
                        </span>
                      </div>
<p className="font-display font-semibold text-sm text-gray-900 dark:text-white truncate">{o.shippingDetails?.name ?? "Guest"}</p>
<p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5 truncate">{o.shippingDetails?.phone}</p>
{config.courierConfigured && o.courierName && (
  <div className="mt-2 flex flex-wrap items-center gap-1.5">
    <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-bold">{o.courierName}</span>
    {o.courierTrackingId && (
      <span className="min-w-0 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/8 text-gray-500 font-mono truncate">{o.courierTrackingId}</span>
    )}
    {o.courierName?.toLowerCase() === "steadfast" && o.courierTrackingId && (
      <span className={`w-full shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1.5 ${sfStatusStyle[o.shippingDetails?.sfStatus ?? ""] ?? "bg-gray-100 dark:bg-white/8 text-gray-500"}`}>
        {courierStatusForOrder(o)}
        <button type="button" onClick={() => syncSteadfast(o)} disabled={syncing === o.id} className="ml-auto inline-flex items-center gap-1 hover:underline">
          <FiRefreshCw size={10} className={syncing === o.id ? "animate-spin" : ""} /> {syncing === o.id ? "..." : "Sync"}
        </button>
      </span>
    )}
  </div>
)}
                      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-white/6">
                        <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString()}</span>
                        <span className="font-bold text-sm text-gray-900 dark:text-white">{money(o.totalAmount)}</span>
                      </div>
                      <div className="mt-3 min-w-0">
                        <Select size="sm" aria-label="Move status" selectedKeys={[o.status]} onChange={(e) => updateStatus(o.id, e.target.value, o.paymentStatus)} className="w-full">
                          {columns.map((s) => (
                            <SelectItem key={s}>{STATUS_LABEL[s] ?? s}</SelectItem>
                          ))}
                        </Select>
                      </div>
                      <div className="mt-2">
                        <div className="flex gap-2">
                          <Dropdown>
                            <DropdownTrigger>
                              <Button size="sm" variant="flat" className="flex-1 h-8 text-xs font-bold" isDisabled={!couriers.length}>
                                <FiSend size={12} /> {o.courierName ? "Resend" : "Send"}
                              </Button>
                            </DropdownTrigger>
                            <DropdownMenu aria-label="Send to courier" onAction={(key) => sendToCourier(o, key as string)}>
                              {couriers.map((c) => (
                                <DropdownItem key={c.key}>Send via {c.label}</DropdownItem>
                              ))}
                            </DropdownMenu>
                          </Dropdown>
                          <Button size="sm" variant="light" className="shrink-0 h-8 w-8 text-xs font-bold" onPress={() => printOrder(o)}>
                            <FiPrinter size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!colOrders.length && <p className="text-xs text-gray-300 dark:text-slate-600 text-center py-3">No orders</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/3 border-b border-gray-100 dark:border-white/8">
                <tr>
                  {isAdmin && <th className="px-3"><input aria-label="Select all visible orders" type="checkbox" checked={orders.length > 0 && selectedOrderIds.length === orders.length} onChange={(e)=>setSelectedOrderIds(e.target.checked?orders.map(o=>o.id):[])} /></th>}
                  {["Order ID", "Customer", "Date", "Total", "Payment method / status", "Status", "Courier", ""].map((h) => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/4">
                {orders.map((o) => (
                  <tr
                      key={o.id}
                      className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("button,select,input,a,label,[role='menu'],[role='menuitem']")) return;
                        setDetail(o);
                      }}
                    >
                    {isAdmin && <td className="py-3 px-3"><input type="checkbox" aria-label={`Select order ${o.id}`} checked={selectedOrderIds.includes(o.id)} onChange={(e)=>setSelectedOrderIds((prev)=>e.target.checked?[...prev,o.id]:prev.filter((id)=>id!==o.id))} /></td>}
                    <td className="py-3 px-4 text-xs text-primary font-bold">#{o.id.slice(0, 8)}</td>
                    <td className="py-3 px-4 font-medium text-gray-800 dark:text-slate-200 text-xs">{o.shippingDetails?.name ?? "Guest"}</td>
                    <td className="py-3 px-4 text-gray-400 dark:text-slate-500 text-xs whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-bold text-xs text-gray-800 dark:text-slate-200">{money(o.totalAmount)}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col items-start gap-1"><span className="text-xs text-gray-600 dark:text-slate-300">{o.paymentMethod}</span><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${o.paymentStatus === "PAID" ? "bg-emerald/10 text-emerald" : o.paymentStatus === "FAILED" ? "bg-rose-100 text-rose-600" : "bg-amber/10 text-amber"}`}>{o.paymentStatus}</span></div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusPill(o.status)}`}>{STATUS_LABEL[o.status] ?? o.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-indigo-500">{o.courierName}</span>
                        {o.courierTrackingId && <span className="text-xs font-mono text-gray-400">{o.courierTrackingId}</span>}
                        {o.courierName?.toLowerCase() === "steadfast" && (
                          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold w-fit ${sfStatusStyle[o.shippingDetails?.sfStatus ?? ""] ?? "bg-gray-100 dark:bg-white/8 text-gray-500"}`}>
                            {courierStatusForOrder(o)}
                            <button type="button" onClick={() => syncSteadfast(o)} disabled={syncing === o.id} title="Sync status">
                              <FiRefreshCw size={10} className={syncing === o.id ? "animate-spin" : ""} />
                            </button>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {isAdmin && <Button size="sm" color="danger" variant="light" className="h-8 w-8 min-w-0 px-0" aria-label="Delete order" onPress={() => deleteOrders([o.id])}><FiTrash2 size={12} /></Button>}
                        <Button
                          size="sm"
                          variant={o.paymentStatus === "PAID" ? "flat" : "solid"}
                          color={o.paymentStatus === "PAID" ? "default" : "warning"}
                          onPress={() => updateStatus(o.id, o.status, o.paymentStatus === "PAID" ? "UNPAID" : "PAID")}
                        >
                          {o.paymentStatus === "PAID" ? "Unpay" : "Mark Paid"}
                        </Button>
                        <Dropdown>
                          <DropdownTrigger>
                            <Button size="sm" variant="flat" className="h-8 text-xs font-bold min-w-0" isDisabled={!couriers.length}>
                              <FiSend size={12} /> {o.courierName ? "Resend" : "Send"}
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu aria-label="Send to courier" onAction={(key) => sendToCourier(o, key as string)}>
                            {couriers.map((c) => (
                              <DropdownItem key={c.key}>Send via {c.label}</DropdownItem>
                            ))}
                          </DropdownMenu>
                        </Dropdown>
                        <Button size="sm" variant="light" className="h-8 w-8 min-w-0 px-0" onPress={() => printOrder(o)}>
                          <FiPrinter size={12} />
                        </Button>
                        <Button size="sm" variant="flat" className="h-8 text-xs font-bold min-w-0 px-2.5" onPress={() => setDetail(o)}>
                          <FiEye size={12} /> Details
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!orders.length && (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className="py-8 text-center text-sm text-gray-400 dark:text-slate-500">
                      No orders placed yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={() => setDetail(null)}>
          <div
            className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-[#111118] rounded-t-2xl sm:rounded-2xl border border-gray-100 dark:border-white/8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/6 sticky top-0 bg-white dark:bg-[#111118] z-10">
              <div>
                <p className="font-mono text-sm font-bold text-primary">ORDER #{detail.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">Placed {new Date(detail.createdAt).toLocaleString("en-GB")}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => printOrder(detail)} className="grid place-items-center w-8 h-8 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 hover:text-primary hover:border-primary/40 transition-colors" title="Print">
                  <FiPrinter size={14} />
                </button>
                <button type="button" onClick={() => setDetail(null)} className="grid place-items-center w-8 h-8 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 hover:text-rose-500 transition-colors" title="Close">
                  <FiX size={16} />
                </button>
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statusPill(detail.status)}`}>{STATUS_LABEL[detail.status] ?? detail.status}</span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${detail.paymentStatus === "PAID" ? "bg-emerald/10 text-emerald" : "bg-amber/10 text-amber"}`}>
                  Payment: {detail.paymentStatus}
                </span>
                {config.courierConfigured && detail.courierName && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-500">
                    {detail.courierName}{detail.courierTrackingId ? ` · ${detail.courierTrackingId}` : ""}
                  </span>
                )}
              </div>

              <div className="rounded-xl border border-gray-100 dark:border-white/6 p-4 space-y-2 text-xs">
                <p><span className="text-gray-400">Payment method:</span> {detail.paymentMethod}</p>
                <p><span className="text-gray-400">Payment status:</span> {detail.paymentStatus}</p>
                {detail.stripeSessionId && <p className="break-all"><span className="text-gray-400">Stripe session:</span> {detail.stripeSessionId}</p>}
                {detail.stripePaymentIntentId && <p className="break-all"><span className="text-gray-400">Stripe payment intent:</span> {detail.stripePaymentIntentId}</p>}
              </div>

              <div className="rounded-xl border border-gray-100 dark:border-white/6 p-4">
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-slate-500 mb-3">Customer Details</p>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <p className="flex items-center gap-2 text-gray-800 dark:text-slate-200 font-semibold"><FiUser className="text-primary" /> {detail.shippingDetails?.name ?? "Guest"}</p>
                  <p className="flex items-center gap-2 text-gray-700 dark:text-slate-300"><FiPhone className="text-primary" /> {detail.shippingDetails?.phone ?? "—"}</p>
                  <p className="flex items-center gap-2 text-gray-700 dark:text-slate-300"><FiMail className="text-primary" /> {detail.shippingDetails?.email || "—"}</p>
                  <p className="flex items-start gap-2 text-gray-700 dark:text-slate-300">
                    <FiTruck className="text-primary mt-0.5 shrink-0" />
                    <span>
                      {[detail.shippingDetails?.addressLine1, detail.shippingDetails?.addressLine2, detail.shippingDetails?.city, detail.shippingDetails?.state, detail.shippingDetails?.postalCode, detail.shippingDetails?.country].filter(Boolean).join(", ") || "—"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 dark:border-white/6 p-4">
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-slate-500 mb-3">Items</p>
                <div className="space-y-2">
                  {(detail.orderItems ?? []).map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-gray-800 dark:text-slate-200">
                        {item.name} <span className="text-gray-400">× {item.qty}</span>
                        {item.sku && <span className="ml-2 font-mono text-[10px] text-gray-400">{item.sku}</span>}
                      </span>
                      <strong className="whitespace-nowrap text-gray-900 dark:text-white">{money(Number(item.price) * Number(item.qty))}</strong>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-dashed border-gray-100 dark:border-white/6 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-500 dark:text-slate-400"><span>Subtotal</span><strong className="text-gray-800 dark:text-slate-200">{money(detail.subtotal ?? 0)}</strong></div>
                  {Number(detail.discountAmount) > 0 && (
                    <div className="flex justify-between text-emerald"><span>Discount{detail.coupon ? ` (${detail.coupon.code})` : ""}</span><strong>- {money(detail.discountAmount ?? 0)}</strong></div>
                  )}
                  <div className="flex justify-between text-gray-500 dark:text-slate-400"><span>Shipping{detail.shippingDetails?.shippingOptionName ? ` · ${detail.shippingDetails.shippingOptionName}` : ""}</span><strong className="text-gray-800 dark:text-slate-200">{money(detail.shippingCharge ?? 0)}</strong></div>
                  <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-white/6 font-bold text-sm text-gray-900 dark:text-white">
                    <span>Total</span><span>{money(detail.totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 dark:border-white/6 p-4 space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-slate-500 mb-2">Change Status</p>
                  <Select size="sm" aria-label="Order status" selectedKeys={[detail.status]} onChange={(e) => { updateStatus(detail.id, e.target.value, detail.paymentStatus); setDetail(null); }} className="w-full">
                    {columns.map((s) => (<SelectItem key={s}>{STATUS_LABEL[s] ?? s}</SelectItem>))}
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={detail.paymentStatus === "PAID" ? "flat" : "solid"}
                    color={detail.paymentStatus === "PAID" ? "default" : "warning"}
                    onPress={() => { updateStatus(detail.id, detail.status, detail.paymentStatus === "PAID" ? "UNPAID" : "PAID"); setDetail(null); }}
                    className="flex-1"
                  >
                    {detail.paymentStatus === "PAID" ? "Mark Unpaid" : "Mark Paid"}
                  </Button>
                  <Dropdown>
                    <DropdownTrigger>
                      <Button size="sm" variant="flat" className="flex-1 text-xs font-bold" isDisabled={!couriers.length}>
                        <FiSend size={12} /> Send to courier
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label="Send to courier" onAction={(key) => { sendToCourier(detail, key as string); setDetail(null); }}>
                      {couriers.map((c) => (<DropdownItem key={c.key}>Send via {c.label}</DropdownItem>))}
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== SHARED CARD WRAPPER ==================== */
function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-5 max-w-3xl">
      <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h3 className="font-display font-bold text-gray-900 dark:text-white">{title}</h3>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}

function ListCard({ items, empty, render }: { items: unknown[]; empty: string; render: (item: any) => React.ReactNode }) {
  return (
    <div className="space-y-3">
      {items.length ? items.map((item, i) => <div key={i}>{render(item)}</div>) : <p className="text-sm text-gray-400 dark:text-slate-500">{empty}</p>}
    </div>
  );
}

/* ==================== COUPONS ==================== */
function AdminCoupons({ token }: { token: string }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [creating, setCreating] = useState(false);

  const load = () => {
    api("/api/admin/coupons", token)
      .then((r) => r.json())
      .then((res) => Array.isArray(res) && setCoupons(res))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, [token]);

  async function createCoupon(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const res = await api("/api/admin/coupons", token, {
        method: "POST",
        body: JSON.stringify({
          code: String(f.get("code")).toUpperCase(),
          type: f.get("type"),
          value: Number(f.get("value")),
          minSpend: f.get("minSpend") ? Number(f.get("minSpend")) : undefined,
          usageLimit: f.get("usageLimit") ? Number(f.get("usageLimit")) : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Coupon created!");
      setCreating(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create coupon");
    }
  }

  async function deleteCoupon(id: string) {
    if (confirm("Delete this coupon code?")) {
      await api(`/api/admin/coupons/${id}`, token, { method: "DELETE" });
      toast.success("Coupon deleted");
      load();
    }
  }

  return (
    <Card
      title={`Promo Coupons & Vouchers (${coupons.length})`}
      action={
        <button
          onClick={() => setCreating((v) => !v)}
          className="flex items-center gap-2 px-4 h-9 bg-gradient-to-r from-primary to-indigo-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all"
        >
          {creating ? <><FiX /> Cancel</> : <><FiPlus /> New Coupon</>}
        </button>
      }
    >
      {creating && (
        <form onSubmit={createCoupon} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 p-5 bg-gray-50 dark:bg-white/4 rounded-xl border border-gray-200 dark:border-white/8">
          <Input label="Coupon Code" name="code" placeholder="SAVE20" isRequired />
          <Select label="Discount Type" name="type" defaultSelectedKeys={["PERCENTAGE"]}>
            <SelectItem key="PERCENTAGE">Percentage (%)</SelectItem>
          <SelectItem key="FLAT">Flat amount</SelectItem>
          </Select>
          <Input label="Discount Value" name="value" type="number" isRequired placeholder="15" />
          <Input label="Minimum spend" name="minSpend" type="number" placeholder="100" />
          <Input label="Usage Limit" name="usageLimit" type="number" placeholder="100" />
          <button type="submit" className="sm:col-span-2 h-10 bg-primary text-white font-display font-bold rounded-xl hover:bg-primary-dark transition-colors">
            Save Coupon
          </button>
        </form>
      )}
      <ListCard
        items={coupons}
        empty="No coupons yet. Create one to start offering discounts."
        render={(c: Coupon) => (
          <div className="flex items-center justify-between p-4 bg-white dark:bg-white/4 rounded-xl border border-gray-100 dark:border-white/6">
            <div>
              <strong className="font-mono font-bold text-sm text-gray-900 dark:text-white">{c.code}</strong>
              <div className="text-xs text-gray-400 dark:text-slate-500">
                {c.type === "PERCENTAGE" ? `${c.value}% OFF` : `${money(c.value)} OFF`} · Used: {c.usedCount} times
              </div>
            </div>
            <button
              onClick={() => deleteCoupon(c.id)}
              className="icon-square-btn w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-400 hover:bg-rose-100 dark:hover:bg-rose-500/10 hover:text-rose-500 transition-colors flex items-center justify-center text-xs"
            >
              <FiTrash2 />
            </button>
          </div>
        )}
      />
    </Card>
  );
}

/* ==================== REVIEWS ==================== */
function AdminReviews({ token }: { token: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);

  const load = () => {
    api("/api/admin/reviews", token)
      .then((r) => r.json())
      .then((res) => Array.isArray(res) && setReviews(res))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, [token]);

  async function toggleApprove(id: string, isApproved: boolean) {
    await api(`/api/admin/reviews/${id}`, token, { method: "PATCH", body: JSON.stringify({ isApproved: !isApproved }) });
    toast.success("Review status updated");
    load();
  }

  async function deleteReview(id: string) {
    await api(`/api/admin/reviews/${id}`, token, { method: "DELETE" });
    toast.success("Review deleted");
    load();
  }

  return (
    <Card title={`Product Reviews Moderation (${reviews.length})`}>
      <ListCard
        items={reviews}
        empty="No customer reviews yet. Approved reviews appear on the storefront."
        render={(r: Review) => (
          <div className="p-4 bg-white dark:bg-white/4 rounded-xl border border-gray-100 dark:border-white/6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <strong className="text-sm text-gray-900 dark:text-white">{r.product?.name}</strong>
                <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                  by {r.user?.name} ({r.user?.email})
                </div>
              </div>
              <div className="flex items-center gap-0.5 text-amber">
                {[1, 2, 3, 4, 5].map((s) => (
                  <FiStar key={s} fill={s <= r.rating ? "#f59e0b" : "none"} className="text-xs" />
                ))}
              </div>
            </div>
            {r.comment && <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">"{r.comment}"</p>}
            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" color={r.isApproved ? "success" : "default"} variant={r.isApproved ? "solid" : "flat"} onPress={() => toggleApprove(r.id, r.isApproved)}>
                {r.isApproved ? "Approved ✓" : "Pending Moderation"}
              </Button>
              <Button size="sm" color="danger" variant="flat" onPress={() => deleteReview(r.id)}>
                Delete
              </Button>
            </div>
          </div>
        )}
      />
    </Card>
  );
}

/* ==================== STAFF ==================== */
function AdminStaff({ token }: { token: string }) {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [creating, setCreating] = useState(false);

  const load = () => {
    api("/api/admin/staff", token)
      .then((r) => r.json())
      .then((res) => Array.isArray(res) && setStaff(res))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, [token]);

  async function createStaff(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const res = await api("/api/admin/staff", token, {
        method: "POST",
        body: JSON.stringify({ name: f.get("name"), email: f.get("email"), password: f.get("password"), staffType: f.get("staffType") }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Staff account created!");
      setCreating(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create staff");
    }
  }

  async function removeStaff(id: string) {
    if (confirm("Remove this staff user?")) {
      await api(`/api/admin/staff/${id}`, token, { method: "DELETE" });
      toast.success("Staff account removed");
      load();
    }
  }

  return (
    <Card
      title={`Staff Team & Access Control (${staff.length})`}
      action={
        <button
          onClick={() => setCreating((v) => !v)}
          className="flex items-center gap-2 px-4 h-9 bg-gradient-to-r from-primary to-indigo-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all"
        >
          {creating ? <><FiX /> Cancel</> : <><FiPlus /> Add Staff</>}
        </button>
      }
    >
      {creating && (
        <form onSubmit={createStaff} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 p-5 bg-gray-50 dark:bg-white/4 rounded-xl border border-gray-200 dark:border-white/8">
          <Input label="Staff Name" name="name" isRequired />
          <Input label="Staff Email" name="email" type="email" isRequired />
          <Input label="Password" name="password" type="password" minLength={8} isRequired />
          <Select label="Staff Role Type" name="staffType" defaultSelectedKeys={["ORDER_MANAGER"]}>
            <SelectItem key="ORDER_MANAGER">Order Manager</SelectItem>
            <SelectItem key="PRODUCT_MANAGER">Product Manager</SelectItem>
          </Select>
          <button type="submit" className="sm:col-span-2 h-10 bg-primary text-white font-display font-bold rounded-xl hover:bg-primary-dark transition-colors">
            Create Staff Account
          </button>
        </form>
      )}
      <ListCard
        items={staff}
        empty="No staff members yet. Add team members to manage orders or products."
        render={(s: StaffUser) => (
          <div className="flex items-center gap-3 justify-between p-4 bg-white dark:bg-white/4 rounded-xl border border-gray-100 dark:border-white/6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-cyan flex items-center justify-center text-white text-xs font-bold">
                {s.name?.[0]?.toUpperCase() ?? "S"}
              </div>
              <div>
                <strong className="text-sm text-gray-900 dark:text-white">{s.name}</strong>
                <div className="text-xs text-gray-400 dark:text-slate-500">{s.email} · {s.staffType}</div>
              </div>
            </div>
            <button
              onClick={() => removeStaff(s.id)}
              className="icon-square-btn w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-400 hover:bg-rose-100 dark:hover:bg-rose-500/10 hover:text-rose-500 transition-colors flex items-center justify-center text-xs"
            >
              <FiTrash2 />
            </button>
          </div>
        )}
      />
    </Card>
  );
}

/* ==================== MARKETING ==================== */
function MarketingChatSettings({ config, save, saving }: { config: Config; save: (payload: object) => Promise<void>; saving: boolean }) {
  const pixels = config.marketingPixels ?? {};
  const chat = config.chatConfig ?? {};
  const [chatEnabled, setChatEnabled] = useState(chat.enabled !== false);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    save({
      marketingPixels: {
        googleAnalyticsId: f.get("gaId") || undefined,
        metaPixelId: f.get("metaId") || undefined,
        tiktokPixelId: f.get("tiktokId") || undefined,
        gtmId: f.get("gtmId") || undefined,
      },
      chatConfig: {
        enabled: chatEnabled,
        whatsapp: { enabled: true, number: f.get("waNumber") || undefined, template: f.get("waTemplate") || undefined },
        messenger: { enabled: true, url: f.get("messengerUrl") || undefined },
        phone: f.get("phone") || undefined,
      },
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <form onSubmit={submit} className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-6">
        <h3 className="font-display font-bold text-gray-900 dark:text-white mb-5">Tracking Pixels</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Google Analytics ID" name="gaId" defaultValue={pixels.googleAnalyticsId} placeholder="G-XXXXXXXXXX" />
          <Input label="Meta (Facebook) Pixel ID" name="metaId" defaultValue={pixels.metaPixelId} placeholder="1234567890" />
          <Input label="TikTok Pixel ID" name="tiktokId" defaultValue={pixels.tiktokPixelId} />
          <Input label="Google Tag Manager (GTM) ID" name="gtmId" defaultValue={pixels.gtmId} placeholder="GTM-XXXXXX" />
        </div>
        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-white/8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-gray-900 dark:text-white">Floating Customer Chat Widget</h3>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
              <Switch isSelected={chatEnabled} onValueChange={setChatEnabled} color="primary" />
              {chatEnabled ? "Visible on store" : "Hidden"}
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="WhatsApp number" name="waNumber" defaultValue={chat.whatsapp?.number} placeholder="+1 555 0100" description="Include your country code. Common international formats are accepted." />
            <Input label="WhatsApp Message Template" name="waTemplate" defaultValue={chat.whatsapp?.template} placeholder="Hello, I want to order..." />
            <Input label="Facebook Messenger Page URL" name="messengerUrl" defaultValue={chat.messenger?.url} placeholder="https://m.me/yourpage" />
            <Input label="Support Phone Number" name="phone" defaultValue={chat.phone} placeholder="01712345678" />
          </div>
        </div>
        <button type="submit" className="mt-6 px-5 h-10 bg-primary text-white text-sm font-bold font-display rounded-xl hover:bg-primary-dark transition-colors">
          {saving ? "Saving…" : "Save Marketing & Chat Settings"}
        </button>
      </form>
    </div>
  );
}

/* ==================== FEATURES ==================== */
function FeatureSettings({ config, save, saving }: { config: Config; save: (payload: object) => Promise<void>; saving: boolean }) {
  const flags = config.featureFlags;
  const theme = config.themeSettings ?? {};

  function ToggleRow({ label, description, selected, onChange }: { label: string; description: string; selected: boolean; onChange: (v: boolean) => void }) {
    return (
      <div className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-white/6 last:border-0">
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{label}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">{description}</p>
        </div>
        <Switch isSelected={selected} onValueChange={onChange} color="primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-6">
        <h3 className="font-display font-bold text-gray-900 dark:text-white mb-5">Store Features</h3>
        <div className="space-y-1">
          <ToggleRow label="Cash on Delivery (COD)" description="Let customers pay cash when their order arrives." selected={flags.cod} onChange={(cod) => save({ featureFlags: { ...flags, cod } })} />
          <ToggleRow label="Product Reviews" description="Allow customers to submit product reviews and ratings." selected={flags.reviews} onChange={(reviews) => save({ featureFlags: { ...flags, reviews } })} />
          <ToggleRow label="Wishlist Feature" description="Enable wishlist saving for customer accounts." selected={flags.wishlist} onChange={(wishlist) => save({ featureFlags: { ...flags, wishlist } })} />
          <ToggleRow label="Coupons & Discount Codes" description="Enable promo code discounts at checkout." selected={flags.coupons} onChange={(coupons) => save({ featureFlags: { ...flags, coupons } })} />
          <ToggleRow label="Add to Cart in product lists" description="ON: lists show the Add to Cart button (current). OFF: lists show only an Order Now button that goes straight to checkout. The single product page always keeps both." selected={flags.addToCart} onChange={(addToCart) => save({ featureFlags: { ...flags, addToCart } })} />
          <ToggleRow label="Email field at checkout" description="ON: customers see a (optional) email field at checkout and receive an order confirmation email when SMTP is configured." selected={flags.checkoutEmail} onChange={(checkoutEmail) => save({ featureFlags: { ...flags, checkoutEmail } })} />
          <ToggleRow label="Bottom quick nav (mobile)" description="ON: mobile visitors see a fixed bottom bar on the home page with Home, Shop, Bag and Profile for one-tap navigation. OFF: hides it." selected={flags.bottomNav} onChange={(bottomNav) => save({ featureFlags: { ...flags, bottomNav } })} />
          <ToggleRow label="Call button on product page" description="Show the call button using the Support Phone Number in Marketing & Chat settings." selected={Boolean(flags.productCallButton)} onChange={(productCallButton) => save({ featureFlags: { ...flags, productCallButton } })} />
          <ToggleRow label="WhatsApp order button on product page" description="Show a WhatsApp order button using the WhatsApp Number in Marketing & Chat settings." selected={Boolean(flags.productWhatsappButton)} onChange={(productWhatsappButton) => save({ featureFlags: { ...flags, productWhatsappButton } })} />
          <ToggleRow label="Order IP Rate Limit" description="Protect against repeated automated spam orders." selected={config.enableIpLimit} onChange={(enableIpLimit) => save({ enableIpLimit })} />
        </div>
      </div>

      <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-6">
        <h3 className="font-display font-bold text-gray-900 dark:text-white mb-5">Identity & Rate Limiting</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Store Name" defaultValue={config.storeName} onBlur={(e) => e.target.value !== config.storeName && save({ storeName: e.target.value })} />
          <Input type="number" label="Cooldown Minutes" defaultValue={String(config.cooldownMinutes)} onBlur={(e) => save({ cooldownMinutes: Number(e.target.value) })} />
        </div>
      </div>

      <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-6">
        <h3 className="font-display font-bold text-gray-900 dark:text-white mb-5">Brand & Theme</h3>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">Colors &amp; font apply to the whole store instantly (header, buttons, badges, text).</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 block mb-1.5">Primary / Accent Color</label>
            <input
              type="color"
              defaultValue={theme.primaryColor ?? "#4f46e5"}
              onBlur={(e) => save({ themeSettings: { ...theme, primaryColor: e.target.value } })}
              className="h-10 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 cursor-pointer"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 block mb-1.5">Background Color</label>
            <input
              type="color"
              defaultValue={theme.secondaryColor ?? "#ffffff"}
              onBlur={(e) => save({ themeSettings: { ...theme, secondaryColor: e.target.value } })}
              className="h-10 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 cursor-pointer"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 block mb-1.5">Font</label>
            <Select
              size="sm"
              aria-label="Font"
              selectedKeys={[theme.font ?? "Plus Jakarta Sans"]}
              onChange={(e) => save({ themeSettings: { ...theme, font: e.target.value } })}
            >
              {["Plus Jakarta Sans", "Outfit", "Arial", "Georgia", "Inter", "Noto Sans Bengali", "Hind Siliguri", "Tiro Bangla"].map((f) => (
                <SelectItem key={f}>{f}</SelectItem>
              ))}
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================== HOME LAYOUT ==================== */
type SmallCategory = { id: string; name: string; slug?: string; parentId?: string | null; createdAt?: string; _count?: { products?: number } };

const defaultHomepageCategories: HomepageCategoriesSettings = {
  mode: "automatic",
  defaultProductLimit: 8,
  defaultDisplayStyle: "slider",
  defaultAuto: false,
  defaultLoop: false,
  defaultSeconds: 3,
  defaultPagination: false,
  defaultPerView: { mobile: 2, tablet: 4, desktop: 6 },
  defaultOrder: "alphabetical",
  categories: [],
};

function resolveHomepageCategories(value?: Partial<HomepageCategoriesSettings>): HomepageCategoriesSettings {
  return {
    ...defaultHomepageCategories,
    ...value,
    defaultPerView: { ...defaultHomepageCategories.defaultPerView, ...(value?.defaultPerView ?? {}) },
    categories: value?.categories ?? [],
  };
}

function HomeLayoutSettings({ config, save, saving, token }: { config: Config; save: (payload: object) => Promise<void>; saving: boolean; token: string }) {
  const [cats, setCats] = useState<SmallCategory[]>([]);
  const [homepageCategories, setHomepageCategories] = useState<HomepageCategoriesSettings>(resolveHomepageCategories(config.homePageConfig?.homepageCategories));
  const [homepageCategoriesDirty, setHomepageCategoriesDirty] = useState(false);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [sections, setSections] = useState<HomeSectionDef[]>(
    config.homePageConfig?.sections?.length
      ? config.homePageConfig.sections
      : []
  );
  const [promos, setPromos] = useState<PromoBannerDef[]>([...Array(2)].map((_, i) => config.homePageConfig?.promoBanners?.[i] ?? {}));
  const [promosDirty, setPromosDirty] = useState(false);
  const [trust, setTrust] = useState<TrustBadgeDef[]>(config.homePageConfig?.trustBadges?.length ? config.homePageConfig.trustBadges : []);
  const [trustDirty, setTrustDirty] = useState(false);
  const [catShow, setCatShow] = useState<CategoryDisplay & { eyebrow?: string; title?: string; accent?: string; countLabel?: string }>(config.homePageConfig?.categories ?? {});
  const [catShowDirty, setCatShowDirty] = useState(false);
  const [popularProducts, setPopularProducts] = useState(config.homePageConfig?.popularProducts ?? {});
  const [popularProductsDirty, setPopularProductsDirty] = useState(false);
  const [testimonials, setTestimonials] = useState(config.homePageConfig?.testimonials ?? {});
  const [testimonialsDirty, setTestimonialsDirty] = useState(false);
  const [footer, setFooter] = useState(config.homePageConfig?.footer ?? {});
  const [footerDirty, setFooterDirty] = useState(false);
  useEffect(() => {
    api("/api/categories", "")
      .then(async (r) => {
        if (r.ok) setCats(await r.json());
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPromos([...Array(2)].map((_, i) => config.homePageConfig?.promoBanners?.[i] ?? {}));
    setPromosDirty(false);
  }, [config.homePageConfig?.promoBanners]);

  useEffect(() => {
    setTrust(config.homePageConfig?.trustBadges?.length ? [...config.homePageConfig.trustBadges] : []);
    setTrustDirty(false);
  }, [config.homePageConfig?.trustBadges]);

  useEffect(() => {
    setCatShow(config.homePageConfig?.categories ?? {});
    setCatShowDirty(false);
  }, [config.homePageConfig?.categories]);

  useEffect(() => {
    setPopularProducts(config.homePageConfig?.popularProducts ?? {});
    setPopularProductsDirty(false);
  }, [config.homePageConfig?.popularProducts]);

  useEffect(() => {
    setTestimonials(config.homePageConfig?.testimonials ?? {});
    setTestimonialsDirty(false);
  }, [config.homePageConfig?.testimonials]);


  useEffect(() => {
    setFooter(config.homePageConfig?.footer ?? {});
    setFooterDirty(false);
  }, [config.homePageConfig?.footer]);

  useEffect(() => {
    setHomepageCategories(resolveHomepageCategories(config.homePageConfig?.homepageCategories));
    setHomepageCategoriesDirty(false);
  }, [config.homePageConfig?.homepageCategories]);

  const orderedHomepageCategories = [...cats].sort((a, b) => {
    if (homepageCategories.mode === "automatic") {
      if (homepageCategories.defaultOrder === "newest") return Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? "");
      return a.name.localeCompare(b.name);
    }
    const order = new Map(homepageCategories.categories.map((entry, index) => [entry.categoryId, index]));
    return (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name);
  });

  function updateHomepageCategory(categoryId: string, patch: Partial<HomepageCategoryEntry>) {
    setHomepageCategories((current) => {
      const existing = current.categories.find((entry) => entry.categoryId === categoryId);
      const nextEntry: HomepageCategoryEntry = { categoryId, visible: existing?.visible ?? current.mode === "automatic", ...existing, ...patch };
      return {
        ...current,
        categories: existing
          ? current.categories.map((entry) => entry.categoryId === categoryId ? nextEntry : entry)
          : [...current.categories, nextEntry],
      };
    });
    setHomepageCategoriesDirty(true);
  }

  function changeHomepageMode(mode: "manual" | "automatic") {
    setHomepageCategories((current) => {
      if (mode === "manual") {
        const saved = new Map(current.categories.map((entry) => [entry.categoryId, entry]));
        return {
          ...current,
          mode,
          categories: orderedHomepageCategories.map((category) => saved.get(category.id) ?? { categoryId: category.id, visible: true }),
        };
      }
      return { ...current, mode };
    });
    setHomepageCategoriesDirty(true);
  }

  function moveHomepageCategory(categoryId: string, direction: -1 | 1) {
    const index = orderedHomepageCategories.findIndex((category) => category.id === categoryId);
    const target = orderedHomepageCategories[index + direction];
    if (target) reorderHomepageCategory(categoryId, target.id);
  }

  function reorderHomepageCategory(sourceId: string, targetId: string) {
    if (!sourceId || sourceId === targetId) return;
    const reordered = [...orderedHomepageCategories];
    const from = reordered.findIndex((category) => category.id === sourceId);
    const to = reordered.findIndex((category) => category.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setHomepageCategories((current) => {
      const entries = new Map(current.categories.map((entry) => [entry.categoryId, entry]));
      const orderedEntries = reordered.map((category) => entries.get(category.id) ?? { categoryId: category.id, visible: true });
      const known = new Set(reordered.map((category) => category.id));
      return { ...current, categories: [...orderedEntries, ...current.categories.filter((entry) => !known.has(entry.categoryId))] };
    });
    setHomepageCategoriesDirty(true);
  }

  async function saveHomepageCategories() {
    const clean: HomepageCategoriesSettings = {
      ...homepageCategories,
      defaultProductLimit: homepageCategories.defaultProductLimit === null
        ? null
        : Math.max(1, Math.min(50, Math.floor(Number(homepageCategories.defaultProductLimit) || 8))),
      defaultSeconds: Math.max(1, Math.min(60, Math.floor(Number(homepageCategories.defaultSeconds) || 3))),
      defaultPerView: {
        mobile: Math.max(1, Math.min(12, Math.floor(Number(homepageCategories.defaultPerView.mobile) || 2))),
        tablet: Math.max(1, Math.min(12, Math.floor(Number(homepageCategories.defaultPerView.tablet) || 4))),
        desktop: Math.max(1, Math.min(12, Math.floor(Number(homepageCategories.defaultPerView.desktop) || 6))),
      },
      categories: homepageCategories.categories.map((entry) => ({
        ...entry,
        productLimit: entry.productLimit === undefined || entry.productLimit === null
          ? entry.productLimit
          : Math.max(1, Math.min(50, Math.floor(Number(entry.productLimit) || 1))),
        seconds: entry.seconds === undefined ? undefined : Math.max(1, Math.min(60, Math.floor(Number(entry.seconds) || 3))),
        perView: entry.perView ? {
          mobile: Math.max(1, Math.min(12, Math.floor(Number(entry.perView.mobile) || 2))),
          tablet: Math.max(1, Math.min(12, Math.floor(Number(entry.perView.tablet) || 4))),
          desktop: Math.max(1, Math.min(12, Math.floor(Number(entry.perView.desktop) || 6))),
        } : undefined,
      })),
    };
    await save({ homePageConfig: { ...(config.homePageConfig ?? {}), homepageCategories: clean } });
    setHomepageCategories(clean);
  }

  function update(id: string, patch: Partial<HomeSectionDef>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function setSectionVisibility(key: "hero" | "categories" | "products" | "collections" | "trust" | "promos" | "announcement", enabled: boolean) {
    const homePageConfig = { ...(config.homePageConfig ?? {}), layout: "catalog" as const, sectionVisibility: { ...(config.homePageConfig?.sectionVisibility ?? {}), [key]: enabled } };
    if (key === "announcement") {
      return save({ homePageConfig, heroBannerConfig: { ...(config.heroBannerConfig ?? {}), announceEnabled: enabled } });
    }
    return save({ homePageConfig });
  }

  function remove(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  function add() {
    setSections((prev) => [
      ...prev,
      {
        id: `sec-${Date.now()}`,
        title: "",
        categoryIds: [],
        mode: "carousel",
        productLimit: 8,
        auto: true,
        seconds: 3,
        perView: { mobile: 1, tablet: 2, desktop: 4 },
        pagination: false,
        loop: false,
        showViewAll: true,
      },
    ]);
  }

  function submit() {
    for (const s of sections) {
      if (!s.categoryIds.length) return toast.error("Each section needs at least one category");
    }
    save({ homePageConfig: { ...(config.homePageConfig ?? {}), layout: "catalog", sections, promoBanners: promos, trustBadges: trust } });
  }

  function savePromos() {
    const clean = promos.map((p) => ({
      ...p,
      enabled: p.enabled !== false,
      badge: p.badge?.trim() || undefined,
      title: p.title?.trim() || undefined,
      accent: p.accent?.trim() || undefined,
      subtitle: p.subtitle?.trim() || undefined,
      buttonLabel: p.buttonLabel?.trim() || undefined,
      buttonLink: p.buttonLink?.trim() || undefined,
      image: p.image?.trim() || undefined,
    }));
    save({ homePageConfig: { ...(config.homePageConfig ?? {}), promoBanners: clean } });
  }

  function saveTrust() {
    const clean = trust
      .filter((t) => (t.title?.trim() || t.subtitle?.trim()))
      .map((t) => ({
        enabled: t.enabled !== false,
        icon: t.icon?.trim() || undefined,
        title: t.title?.trim() || undefined,
        subtitle: t.subtitle?.trim() || undefined,
      }));
    save({ homePageConfig: { ...(config.homePageConfig ?? {}), trustBadges: clean.length ? clean : undefined } });
  }

  function saveCatShow() {
    const mode: CategoryDisplay["mode"] = catShow.mode === "carousel" || catShow.mode === "loop" ? catShow.mode : "grid";
    const selectionMode = catShow.selectionMode ?? (catShow.categoryIds ? "manual" : "automatic");
    const clean: typeof catShow = { mode, selectionMode };
    clean.maxCategories = Math.max(1, Math.min(50, Math.floor(Number(catShow.maxCategories) || 8)));
    clean.categoryIds = selectionMode === "manual" ? (catShow.categoryIds ?? []) : undefined;
    clean.eyebrow = catShow.eyebrow?.trim() || undefined;
    clean.title = catShow.title?.trim() || undefined;
    clean.accent = catShow.accent?.trim() || undefined;
    clean.countLabel = catShow.countLabel?.trim() || undefined;
    if (mode !== "grid") {
      clean.seconds = Math.min(60, Math.max(1, Math.round(Number(catShow.seconds) || 3)));
      clean.perView = {
        mobile: Math.min(4, Math.max(1, Number(catShow.perView?.mobile) || 2)),
        tablet: Math.min(5, Math.max(1, Number(catShow.perView?.tablet) || 4)),
        desktop: Math.min(6, Math.max(1, Number(catShow.perView?.desktop) || 6)),
      };
      clean.auto = mode === "loop" ? true : Boolean(catShow.auto);
      clean.loop = mode === "loop" ? true : Boolean(catShow.loop);
      clean.pagination = Boolean(catShow.pagination);
    }
    save({ homePageConfig: { ...(config.homePageConfig ?? {}), categories: clean } });
  }

  function savePopularProducts() {
    save({
      homePageConfig: {
        ...(config.homePageConfig ?? {}),
        popularProducts: {
          eyebrow: popularProducts.eyebrow?.trim() || undefined,
          title: popularProducts.title?.trim() || undefined,
          limit: Math.max(1, Math.min(50, Math.floor(Number(popularProducts.limit) || 8))),
          mode: popularProducts.mode === "grid" ? "grid" : "slider",
          auto: popularProducts.auto !== false,
        },
      },
    });
  }

  function saveTestimonials() {
    const items = (testimonials.items ?? [])
      .filter((t) => (t.name?.trim() || t.quote?.trim()))
      .map((t) => ({
        init: t.init?.trim() || undefined,
        image: t.image?.trim() || undefined,
        name: t.name?.trim() || undefined,
        role: t.role?.trim() || undefined,
        quote: t.quote?.trim() || undefined,
        rating: Math.max(1, Math.min(5, Number(t.rating) || 5)),
      }));
    save({
      homePageConfig: {
        ...(config.homePageConfig ?? {}),
        testimonials: {
          enabled: testimonials.enabled !== false,
          eyebrow: testimonials.eyebrow?.trim() || undefined,
          title: testimonials.title?.trim() || undefined,
          accent: testimonials.accent?.trim() || undefined,
          subtitle: testimonials.subtitle?.trim() || undefined,
          items: items.length ? items : undefined,
        },
      },
    });
  }

  async function uploadTestimonialImage(index: number, file: File) {
    const form = new FormData();
    form.append("image", file);
    try {
      const response = await fetch(apiUrl + "/api/admin/upload", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTestimonials((t) => ({ ...t, items: (t.items ?? []).map((x, xi) => (xi === index ? { ...x, image: data.url } : x)) }));
      setTestimonialsDirty(true);
      toast.success("Photo uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Photo upload failed");
    }
  }

  function saveFooter() {
    const links = (footer.links ?? [])
      .filter((l) => l.label?.trim())
      .map((l) => ({ label: l.label?.trim() || undefined, url: l.url?.trim() || undefined }));
    const manualCats = (footer.categories ?? [])
      .filter((c) => c.label?.trim())
      .map((c) => ({ label: c.label?.trim() || undefined, url: c.url?.trim() || undefined }));
    const soc = footer.social ?? {};
    const social = {
      facebook: soc.facebook?.trim() || undefined,
      youtube: soc.youtube?.trim() || undefined,
      instagram: soc.instagram?.trim() || undefined,
      whatsapp: soc.whatsapp?.trim() || undefined,
      phone: soc.phone?.trim() || undefined,
    };
    const ct = footer.contact ?? {};
    const contact = {
      address: ct.address?.trim() || undefined,
      phone: ct.phone?.trim() || undefined,
      email: ct.email?.trim() || undefined,
    };
    const hasSocial = Object.values(social).some(Boolean);
    const hasContact = Object.values(contact).some(Boolean);
    save({
      homePageConfig: {
        ...(config.homePageConfig ?? {}),
        footer: {
          enabled: footer.enabled !== false,
          brand: footer.brand?.trim() || undefined,
          logo: footer.logo?.trim() || undefined,
          slogan: footer.slogan?.trim() || undefined,
          social: hasSocial ? social : undefined,
          showCategories: footer.showCategories !== false,
          categoryTitle: footer.categoryTitle?.trim() || undefined,
          categoryLimit: Math.min(20, Math.max(1, Number(footer.categoryLimit) || 6)),
          categories: manualCats.length ? manualCats : undefined,
          contactTitle: footer.contactTitle?.trim() || undefined,
          contact: hasContact ? contact : undefined,
          copyright: footer.copyright?.trim() || undefined,
          credit: footer.credit?.trim() || undefined,
          links: links.length ? links : undefined,
        },
      },
    });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <section className="admin-homepage-settings overflow-hidden rounded-2xl border border-primary/15 bg-white shadow-sm dark:bg-white/4">
        <div className="border-b border-gray-100 p-5 dark:border-white/10 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">Homepage Settings</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-slate-400">Control which categories appear and how their products are displayed.</p>
            </div>
            {homepageCategoriesDirty && <button type="button" onClick={saveHomepageCategories} disabled={saving} className="h-10 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button>}
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {([ ["manual", "Manual setup", "Choose categories, order and display for each one."], ["automatic", "Automatic setup", "Show every category that has active products. New categories join automatically."] ] as const).map(([mode, title, description]) => (
              <button key={mode} type="button" onClick={() => changeHomepageMode(mode)} aria-pressed={homepageCategories.mode === mode} className={`homepage-mode-card rounded-xl border p-4 text-left transition ${homepageCategories.mode === mode ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-gray-200 hover:border-primary/40 dark:border-white/10"}`}>
                <span className="homepage-mode-card-content">
                  <span className={`homepage-mode-radio ${homepageCategories.mode === mode ? "is-selected" : ""}`} aria-hidden="true" />
                  <span className="homepage-mode-copy"><span className="homepage-mode-title">{title}</span><span className="homepage-mode-description">{description}</span></span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {homepageCategories.mode === "automatic" && (
          <details className="homepage-settings-details border-b border-gray-100 p-5 dark:border-white/10 sm:px-6">
            <summary><span>Automatic defaults</span><span className="homepage-settings-summary-value">{homepageCategories.defaultProductLimit === null ? "All products" : `${homepageCategories.defaultProductLimit} products`} · {homepageCategories.defaultDisplayStyle} · {homepageCategories.defaultOrder === "alphabetical" ? "A-Z" : "Newest first"}</span></summary>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Input type="number" min={1} max={50} label="Default products per category" value={String(homepageCategories.defaultProductLimit ?? 8)} isDisabled={homepageCategories.defaultProductLimit === null} onValueChange={(value) => { setHomepageCategories((current) => ({ ...current, defaultProductLimit: Math.max(1, Math.min(50, Math.floor(Number(value) || 1))) })); setHomepageCategoriesDirty(true); }} />
              <Switch className="mt-2" size="sm" isSelected={homepageCategories.defaultProductLimit === null} onValueChange={(unlimited: boolean) => { setHomepageCategories((current) => ({ ...current, defaultProductLimit: unlimited ? null : 8 })); setHomepageCategoriesDirty(true); }} color="primary">Show all products</Switch>
            </div>
            <Select label="Default display mode" selectedKeys={[homepageCategories.defaultDisplayStyle]} onSelectionChange={(keys) => { const value = Array.from(keys as Set<string>)[0]; if (value === "grid" || value === "slider" || value === "loop") { setHomepageCategories((current) => ({ ...current, defaultDisplayStyle: value, ...(value === "loop" ? { defaultAuto: true, defaultLoop: true } : {}) })); setHomepageCategoriesDirty(true); } }}>
              <SelectItem key="grid">Grid</SelectItem><SelectItem key="slider">Slider</SelectItem><SelectItem key="loop">Loop auto-sliding carousel</SelectItem>
            </Select>
            <Select label="Default category order" selectedKeys={[homepageCategories.defaultOrder]} onSelectionChange={(keys) => { const value = Array.from(keys as Set<string>)[0]; if (value === "alphabetical" || value === "newest") { setHomepageCategories((current) => ({ ...current, defaultOrder: value })); setHomepageCategoriesDirty(true); } }}>
              <SelectItem key="alphabetical">Name (A–Z)</SelectItem><SelectItem key="newest">Newest categories first</SelectItem>
            </Select>
          </div>
          {homepageCategories.defaultDisplayStyle !== "grid" && <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Input type="number" min={1} max={60} label="Auto-slide seconds" value={String(homepageCategories.defaultSeconds)} onValueChange={(value) => { setHomepageCategories((current) => ({ ...current, defaultSeconds: Math.max(1, Math.min(60, Math.floor(Number(value) || 3))) })); setHomepageCategoriesDirty(true); }} />
            {(["mobile", "tablet", "desktop"] as const).map((device) => <Input key={device} type="number" min={1} max={12} label={`Per view — ${device}`} value={String(homepageCategories.defaultPerView[device])} onValueChange={(value) => { setHomepageCategories((current) => ({ ...current, defaultPerView: { ...current.defaultPerView, [device]: Math.max(1, Math.min(12, Math.floor(Number(value) || 1))) } })); setHomepageCategoriesDirty(true); }} />)}
            <div className="flex flex-wrap items-center gap-4 sm:col-span-4">
              {homepageCategories.defaultDisplayStyle === "slider" && <Switch isSelected={homepageCategories.defaultAuto} onValueChange={(value: boolean) => { setHomepageCategories((current) => ({ ...current, defaultAuto: value })); setHomepageCategoriesDirty(true); }} color="primary">Auto-slide</Switch>}
              {homepageCategories.defaultDisplayStyle === "slider" && <Switch isSelected={homepageCategories.defaultLoop} onValueChange={(value: boolean) => { setHomepageCategories((current) => ({ ...current, defaultLoop: value })); setHomepageCategoriesDirty(true); }} color="primary">Loop</Switch>}
              <Switch isSelected={homepageCategories.defaultPagination} onValueChange={(value: boolean) => { setHomepageCategories((current) => ({ ...current, defaultPagination: value })); setHomepageCategoriesDirty(true); }} color="primary">Pagination dots</Switch>
            </div>
          </div>}
          </details>
        )}

        <div className="p-5 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Categories</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">{homepageCategories.mode === "manual" ? "Turn categories on or off. Drag a row or use the arrows to change its position." : "Only categories with active products appear. You can hide individual categories below."}</p>
            </div>
            <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              {orderedHomepageCategories.filter((category) => (homepageCategories.categories.find((entry) => entry.categoryId === category.id)?.visible ?? homepageCategories.mode === "automatic") && (category._count?.products ?? 0) > 0).length} categories visible
            </span>
          </div>
          {orderedHomepageCategories.length === 0 ? (
            <p className="rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-500 dark:bg-white/5 dark:text-slate-400">No categories yet. Add a category and products first.</p>
          ) : (
            <div className="space-y-2">
              {orderedHomepageCategories.map((category, index) => {
                const entry = homepageCategories.categories.find((item) => item.categoryId === category.id);
                const visible = entry?.visible ?? homepageCategories.mode === "automatic";
                const limit = homepageCategories.mode === "automatic" || entry?.productLimit === undefined ? homepageCategories.defaultProductLimit : entry.productLimit;
                const style = homepageCategories.mode === "automatic" ? homepageCategories.defaultDisplayStyle : entry?.displayStyle ?? homepageCategories.defaultDisplayStyle;
                const auto = style === "loop" || (homepageCategories.mode === "automatic" ? homepageCategories.defaultAuto : entry?.auto ?? homepageCategories.defaultAuto);
                const loop = style === "loop" || (homepageCategories.mode === "automatic" ? homepageCategories.defaultLoop : entry?.loop ?? homepageCategories.defaultLoop);
                const seconds = homepageCategories.mode === "automatic" ? homepageCategories.defaultSeconds : entry?.seconds ?? homepageCategories.defaultSeconds;
                const pagination = homepageCategories.mode === "automatic" ? homepageCategories.defaultPagination : entry?.pagination ?? homepageCategories.defaultPagination;
                const perView = homepageCategories.mode === "automatic" ? homepageCategories.defaultPerView : { ...homepageCategories.defaultPerView, ...(entry?.perView ?? {}) };
                return (
                  <div key={category.id} draggable={homepageCategories.mode === "manual"} onDragStart={() => setDraggedCategoryId(category.id)} onDragOver={(event) => { if (homepageCategories.mode === "manual") event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (draggedCategoryId) reorderHomepageCategory(draggedCategoryId, category.id); setDraggedCategoryId(null); }} onDragEnd={() => setDraggedCategoryId(null)} className={`rounded-xl border p-3 transition sm:p-4 ${visible ? "border-gray-200 dark:border-white/10" : "border-dashed border-gray-200 opacity-70 dark:border-white/10"} ${draggedCategoryId === category.id ? "opacity-40" : ""}`}>
                    <div className="flex flex-wrap items-center gap-3">
                      {homepageCategories.mode === "manual" && <span aria-hidden="true" className="hidden cursor-grab text-gray-400 sm:inline">⠿</span>}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{category.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{category._count?.products ?? 0} active products{homepageCategories.mode === "automatic" && (category._count?.products ?? 0) === 0 ? " · hidden until products are added" : ""}</p>
                      </div>
                      <Switch size="sm" isSelected={visible} onValueChange={(checked: boolean) => updateHomepageCategory(category.id, { visible: checked })} color="primary">Show</Switch>
                      {homepageCategories.mode === "manual" && <div className="flex gap-1"><button type="button" aria-label={`Move ${category.name} up`} disabled={index === 0} onClick={() => moveHomepageCategory(category.id, -1)} className="grid h-8 w-8 place-items-center rounded-lg border text-gray-600 disabled:opacity-30 dark:border-white/10 dark:text-slate-300"><FiArrowUp /></button><button type="button" aria-label={`Move ${category.name} down`} disabled={index === orderedHomepageCategories.length - 1} onClick={() => moveHomepageCategory(category.id, 1)} className="grid h-8 w-8 place-items-center rounded-lg border text-gray-600 disabled:opacity-30 dark:border-white/10 dark:text-slate-300"><FiArrowDown /></button></div>}
                    </div>
                    {homepageCategories.mode === "manual" && <details className="homepage-category-details mt-3 border-t border-gray-100 pt-3 dark:border-white/10">
                      <summary>Section settings</summary>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Input type="number" min={1} max={50} label="Products to show" value={String(limit ?? homepageCategories.defaultProductLimit ?? 8)} isDisabled={limit === null} onValueChange={(value) => updateHomepageCategory(category.id, { productLimit: Math.max(1, Math.min(50, Math.floor(Number(value) || 1))) })} />
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <Switch size="sm" isSelected={limit === null} onValueChange={(unlimited: boolean) => updateHomepageCategory(category.id, { productLimit: unlimited ? null : homepageCategories.defaultProductLimit ?? 8 })} color="primary">Show all</Switch>
                          {entry?.productLimit !== undefined && <button type="button" onClick={() => updateHomepageCategory(category.id, { productLimit: undefined })} className="text-xs font-semibold text-primary hover:underline">Use default</button>}
                        </div>
                      </div>
                      <Select label="Display mode" selectedKeys={[style]} onSelectionChange={(keys) => { const value = Array.from(keys as Set<string>)[0]; if (value === "grid" || value === "slider" || value === "loop") updateHomepageCategory(category.id, { displayStyle: value, ...(value === "loop" ? { auto: true, loop: true } : {}) }); }}>
                        <SelectItem key="grid">Grid</SelectItem><SelectItem key="slider">Slider</SelectItem><SelectItem key="loop">Loop auto-sliding carousel</SelectItem>
                      </Select>
                      {style !== "grid" && <>
                        <Input type="number" min={1} max={60} label="Auto-slide seconds" value={String(seconds)} onValueChange={(value) => updateHomepageCategory(category.id, { seconds: Math.max(1, Math.min(60, Math.floor(Number(value) || 3))) })} />
                        {(["mobile", "tablet", "desktop"] as const).map((device) => <Input key={device} type="number" min={1} max={12} label={`Per view — ${device}`} value={String(perView[device])} onValueChange={(value) => updateHomepageCategory(category.id, { perView: { ...perView, [device]: Math.max(1, Math.min(12, Math.floor(Number(value) || 1))) } })} />)}
                        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                          {style === "slider" && <Switch size="sm" isSelected={auto} onValueChange={(value: boolean) => updateHomepageCategory(category.id, { auto: value })} color="primary">Auto-slide</Switch>}
                          {style === "slider" && <Switch size="sm" isSelected={loop} onValueChange={(value: boolean) => updateHomepageCategory(category.id, { loop: value })} color="primary">Loop</Switch>}
                          <Switch size="sm" isSelected={pagination} onValueChange={(value: boolean) => updateHomepageCategory(category.id, { pagination: value })} color="primary">Pagination dots</Switch>
                        </div>
                      </>}
                      {(entry?.displayStyle !== undefined || entry?.auto !== undefined || entry?.loop !== undefined || entry?.seconds !== undefined || entry?.pagination !== undefined || entry?.perView !== undefined) && <button type="button" onClick={() => updateHomepageCategory(category.id, { displayStyle: undefined, auto: undefined, loop: undefined, seconds: undefined, pagination: undefined, perView: undefined })} className="text-left text-xs font-semibold text-primary hover:underline sm:col-span-2">Use automatic defaults</button>}
                      </div>
                    </details>}
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">Preview: {homepageCategories.mode === "automatic" ? "active categories with products" : "shown categories in the order above"} · {homepageCategories.defaultProductLimit === null ? "all products" : `up to ${homepageCategories.defaultProductLimit} products by default`} · {homepageCategories.defaultDisplayStyle}</p>
          {homepageCategoriesDirty && <div className="mt-4 flex justify-end"><button type="button" onClick={saveHomepageCategories} disabled={saving} className="h-10 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button></div>}
        </div>
        <details className="border-t border-gray-100 dark:border-white/10">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-gray-800 dark:text-slate-200">Popular products section</summary>
          <div className="space-y-4 px-5 pb-5 sm:px-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Eyebrow" placeholder="Customer favorites" value={popularProducts.eyebrow ?? ""} onValueChange={(value) => { setPopularProducts((current) => ({ ...current, eyebrow: value })); setPopularProductsDirty(true); }} />
              <Input label="Heading" placeholder="Shop our bestsellers" value={popularProducts.title ?? ""} onValueChange={(value) => { setPopularProducts((current) => ({ ...current, title: value })); setPopularProductsDirty(true); }} />
              <Input type="number" label="Products to show" min={1} max={50} value={String(popularProducts.limit ?? 8)} onValueChange={(value) => { setPopularProducts((current) => ({ ...current, limit: Math.max(1, Math.min(50, Math.floor(Number(value) || 1))) })); setPopularProductsDirty(true); }} />
              <Select label="Display style" selectedKeys={[popularProducts.mode ?? "slider"]} onSelectionChange={(keys) => { const mode = Array.from(keys as Set<string>)[0]; if (mode === "slider" || mode === "grid") { setPopularProducts((current) => ({ ...current, mode })); setPopularProductsDirty(true); } }}>
                <SelectItem key="slider">Slider</SelectItem><SelectItem key="grid">Grid</SelectItem>
              </Select>
            </div>
            {popularProducts.mode !== "grid" && <Switch isSelected={popularProducts.auto !== false} onValueChange={(auto: boolean) => { setPopularProducts((current) => ({ ...current, auto })); setPopularProductsDirty(true); }} color="primary">Auto-slide</Switch>}
            {popularProductsDirty && <div className="flex justify-end"><button type="button" onClick={savePopularProducts} disabled={saving} className="h-10 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button></div>}
          </div>
        </details>
        <details open className="border-t border-gray-100 dark:border-white/10">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-gray-800 dark:text-slate-200">Home page category section: choose categories and layout</summary>
          <div className="px-5 pb-5 sm:px-6">

      <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-bold text-gray-900 dark:text-white">Shop by Category</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Choose which categories or sub-categories appear in the home page “Shop by Category” section. Changes apply after saving.
            </p>
          </div>
          {catShowDirty && (
            <button
              type="button"
              onClick={saveCatShow}
              disabled={saving}
              className="flex items-center gap-2 px-4 h-9 bg-gradient-to-r from-primary to-indigo-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-60"
            >
              {saving ? <FiUpload className="animate-pulse" /> : <FiCheck />} Save Showcase
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="How should categories be added?"
            selectedKeys={[catShow.selectionMode ?? (catShow.categoryIds ? "manual" : "automatic")]}
            onSelectionChange={(keys) => {
              const selectionMode = Array.from(keys as Set<string>)[0];
              if (selectionMode === "automatic" || selectionMode === "manual") {
                setCatShow((current) => ({ ...current, selectionMode, ...(selectionMode === "manual" && !current.categoryIds ? { categoryIds: [] } : {}) }));
                setCatShowDirty(true);
              }
            }}
            className="sm:col-span-3"
          >
            <SelectItem key="automatic">Automatic — include all categories and new ones</SelectItem>
            <SelectItem key="manual">Manual — choose which categories to show</SelectItem>
          </Select>
          {(catShow.selectionMode ?? (catShow.categoryIds ? "manual" : "automatic")) === "manual" && <Select
            label="Choose categories and sub-categories"
            aria-label="Choose categories and sub-categories for the home page category section"
            selectionMode="multiple"
            selectedKeys={new Set(catShow.categoryIds ?? [])}
            onSelectionChange={(keys) => {
              const ids = Array.from(keys as Set<string>);
              setCatShow((current) => ({ ...current, categoryIds: ids }));
              setCatShowDirty(true);
            }}
            description="Each option shows the number of active products in it."
            className="sm:col-span-3"
          >
            {cats.map((category) => (
              <SelectItem key={category.id} textValue={category.name}>
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="truncate">{category.parentId ? `↳ ${category.name} (sub-category)` : category.name}</span>
                  <span className="shrink-0 text-xs text-gray-500">{category._count?.products ?? 0} products</span>
                </span>
              </SelectItem>
            ))}
          </Select>}
          <Input type="number" label="Categories to show on home page" min={1} max={50} value={String(catShow.maxCategories ?? 8)} onValueChange={(v) => { setCatShow((s) => ({ ...s, maxCategories: Math.max(1, Math.min(50, Math.floor(Number(v) || 1))) })); setCatShowDirty(true); }} />
          <Input label="Eyebrow" placeholder="SHOP BY CATEGORY" value={catShow.eyebrow ?? ""} onValueChange={(v) => { setCatShow((s) => ({ ...s, eyebrow: v })); setCatShowDirty(true); }} />
          <Input label="Title" placeholder="Curated collections," value={catShow.title ?? ""} onValueChange={(v) => { setCatShow((s) => ({ ...s, title: v })); setCatShowDirty(true); }} />
          <Input label="Accent (highlighted)" placeholder="organized for you." value={catShow.accent ?? ""} onValueChange={(v) => { setCatShow((s) => ({ ...s, accent: v })); setCatShowDirty(true); }} />
          <Select
            label="Display mode"
            selectedKeys={[catShow.mode ?? "grid"]}
            onSelectionChange={(keys) => { setCatShow((s) => ({ ...s, mode: (Array.from(keys as Set<string>)[0] as CategoryDisplay["mode"]) ?? "grid" })); setCatShowDirty(true); }}
          >
            <SelectItem key="grid">Grid — static cards</SelectItem>
            <SelectItem key="carousel">Carousel — swipeable</SelectItem>
            <SelectItem key="loop">Loop — auto-sliding carousel</SelectItem>
          </Select>
          {(catShow.mode === "carousel" || catShow.mode === "loop") && (
            <Input
              type="number"
              label="Auto-slide seconds"
              min={1}
              max={60}
              value={String(catShow.seconds ?? 3)}
              onValueChange={(v) => { setCatShow((s) => ({ ...s, seconds: Math.max(1, Math.min(60, Number(v) || 3)) })); setCatShowDirty(true); }}
            />
          )}
        </div>
        {(catShow.mode === "carousel" || catShow.mode === "loop") && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              type="number"
              label="Per view — mobile"
              min={1}
              max={4}
              value={String(catShow.perView?.mobile ?? 2)}
              onValueChange={(v) => { setCatShow((s) => ({ ...s, perView: { ...(s.perView ?? { mobile: 2, tablet: 4, desktop: 6 }), mobile: Number(v) || 2 } })); setCatShowDirty(true); }}
            />
            <Input
              type="number"
              label="Per view — tablet"
              min={1}
              max={5}
              value={String(catShow.perView?.tablet ?? 4)}
              onValueChange={(v) => { setCatShow((s) => ({ ...s, perView: { ...(s.perView ?? { mobile: 2, tablet: 4, desktop: 6 }), tablet: Number(v) || 4 } })); setCatShowDirty(true); }}
            />
            <Input
              type="number"
              label="Per view — desktop"
              min={1}
              max={6}
              value={String(catShow.perView?.desktop ?? 6)}
              onValueChange={(v) => { setCatShow((s) => ({ ...s, perView: { ...(s.perView ?? { mobile: 2, tablet: 4, desktop: 6 }), desktop: Number(v) || 6 } })); setCatShowDirty(true); }}
            />
          </div>
        )}
        {catShow.mode === "carousel" && (
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
              <Switch isSelected={catShow.auto ?? false} onValueChange={(v: boolean) => { setCatShow((s) => ({ ...s, auto: v })); setCatShowDirty(true); }} color="primary" />
              Auto-slide
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
              <Switch isSelected={catShow.loop ?? false} onValueChange={(v: boolean) => { setCatShow((s) => ({ ...s, loop: v })); setCatShowDirty(true); }} color="primary" />
              Loop
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
              <Switch isSelected={catShow.pagination ?? false} onValueChange={(v: boolean) => { setCatShow((s) => ({ ...s, pagination: v })); setCatShowDirty(true); }} color="primary" />
              Dots
            </label>
          </div>
        )}
      </div>

          </div>
        </details>
      </section>

      <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-slate-200 mb-1">Default home page style</p>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Customers will see this layout on the home page and the /shop page. You can switch any time.
            </p>
          </div>
          <button
            type="button"
            onClick={() => save({ homePageConfig: { ...(config.homePageConfig ?? {}), layout: "catalog" } })}
            disabled={saving}
            className="flex items-center gap-2 px-4 h-9 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark transition-all disabled:opacity-60 shadow-sm"
          >
            {saving ? "Saving…" : "Save Layout"}
          </button>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">Show or hide home page sections</p>
          {([ ["hero", "Hero banner"], ["categories", "Categories"], ["products", "Popular products"], ["collections", "Category collections"], ["trust", "Trust badges"], ["promos", "Promo banners"], ["announcement", "Top announcement bar"] ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 dark:border-white/10 px-4 py-3 text-sm text-gray-700 dark:text-slate-200">
              {label}
              <Switch
                isSelected={config.homePageConfig?.sectionVisibility?.[key] ?? (key === "announcement" ? config.heroBannerConfig?.announceEnabled ?? false : true)}
                isDisabled={saving}
                onValueChange={(value: boolean) => setSectionVisibility(key, value)}
              />
            </label>
          ))}
        </div>
      </div>
      {/* PROMO BANNERS */}
      <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-bold text-gray-900 dark:text-white">Promo Banners</h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              The two small offer banners on the Catalog layout home page.
            </p>
          </div>
          {promosDirty && (
            <button
              type="button"
              onClick={savePromos}
              disabled={saving}
              className="flex items-center gap-2 px-4 h-9 bg-gradient-to-r from-primary to-indigo-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-60"
            >
              {saving ? <FiUpload className="animate-pulse" /> : <FiCheck />} Save Promo Banners
            </button>
          )}
        </div>
        {promos.map((p, i) => (
          <div key={i} className="rounded-xl border border-gray-100 dark:border-white/6 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Banner {i + 1}</span>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                  <Switch isSelected={p.enabled !== false} onValueChange={(v: boolean) => { setPromos((prev) => prev.map((b, bi) => (bi === i ? { ...b, enabled: v } : b))); setPromosDirty(true); }} color="primary" />
                  Show
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Badge" placeholder="Featured collection" value={p.badge ?? ""} onValueChange={(v) => { setPromos((prev) => prev.map((b, bi) => (bi === i ? { ...b, badge: v } : b))); setPromosDirty(true); }} />
              <Input label="Accent (highlighted text)" placeholder="Everyday style" value={p.accent ?? ""} onValueChange={(v) => { setPromos((prev) => prev.map((b, bi) => (bi === i ? { ...b, accent: v } : b))); setPromosDirty(true); }} />
              <Input label="Title" placeholder="Made for the season" value={p.title ?? ""} onValueChange={(v) => { setPromos((prev) => prev.map((b, bi) => (bi === i ? { ...b, title: v } : b))); setPromosDirty(true); }} className="sm:col-span-2" />
              <Input label="Subtitle" placeholder="Thoughtful designs selected for you." value={p.subtitle ?? ""} onValueChange={(v) => { setPromos((prev) => prev.map((b, bi) => (bi === i ? { ...b, subtitle: v } : b))); setPromosDirty(true); }} className="sm:col-span-2" />
              <Input label="Button label" placeholder="Explore collection →" value={p.buttonLabel ?? ""} onValueChange={(v) => { setPromos((prev) => prev.map((b, bi) => (bi === i ? { ...b, buttonLabel: v } : b))); setPromosDirty(true); }} />
              <Input label="Button link" placeholder="#shop" value={p.buttonLink ?? ""} onValueChange={(v) => { setPromos((prev) => prev.map((b, bi) => (bi === i ? { ...b, buttonLink: v } : b))); setPromosDirty(true); }} />
              <Input label="Image URL" placeholder="https://…" value={p.image ?? ""} onValueChange={(v) => { setPromos((prev) => prev.map((b, bi) => (bi === i ? { ...b, image: v } : b))); setPromosDirty(true); }} className="sm:col-span-2" />
              {p.image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={p.image} alt="" className="h-24 w-36 object-cover rounded-lg border border-gray-100" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* TRUST BADGES */}
      <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-bold text-gray-900 dark:text-white">Trust Badges</h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              The 4 trust badge strip on the Catalog home. Click "Add Badge" to create new badges.
            </p>
          </div>
          {trustDirty && (
            <button
              type="button"
              onClick={saveTrust}
              disabled={saving}
              className="flex items-center gap-2 px-4 h-9 bg-gradient-to-r from-primary to-indigo-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-60"
            >
              {saving ? <FiUpload className="animate-pulse" /> : <FiCheck />} Save Trust Badges
            </button>
          )}
        </div>
        {trust.map((t, i) => (
          <div key={i} className="rounded-xl border border-gray-100 dark:border-white/6 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Badge {i + 1}</span>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                  <Switch isSelected={t.enabled !== false} onValueChange={(v: boolean) => { setTrust((prev) => prev.map((b, bi) => (bi === i ? { ...b, enabled: v } : b))); setTrustDirty(true); }} color="primary" />
                  Show
                </label>
              </div>
              <button type="button" onClick={() => { setTrust((prev) => prev.filter((_, bi) => bi !== i)); setTrustDirty(true); }} className="text-xs text-red-500 font-semibold hover:underline">Remove</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Icon"
                selectedKeys={[t.icon || "shield"]}
                onSelectionChange={(keys) => { setTrust((prev) => prev.map((b, bi) => (bi === i ? { ...b, icon: Array.from(keys as Set<string>)[0] } : b))); setTrustDirty(true); }}
              >
                <SelectItem key="shield">Shield</SelectItem>
                <SelectItem key="truck">Truck</SelectItem>
                <SelectItem key="refresh">Refresh</SelectItem>
                <SelectItem key="check">Check</SelectItem>
                <SelectItem key="clock">Clock</SelectItem>
                <SelectItem key="star">Star</SelectItem>
                <SelectItem key="headset">Headset</SelectItem>
                <SelectItem key="chat">Chat</SelectItem>
              </Select>
              <Input label="Title" placeholder="Secure payments" value={t.title ?? ""} onValueChange={(v) => { setTrust((prev) => prev.map((b, bi) => (bi === i ? { ...b, title: v } : b))); setTrustDirty(true); }} />
              <Input label="Subtitle" placeholder="Cash on delivery or card" value={t.subtitle ?? ""} onValueChange={(v) => { setTrust((prev) => prev.map((b, bi) => (bi === i ? { ...b, subtitle: v } : b))); setTrustDirty(true); }} />
            </div>
          </div>
        ))}
        {trust.length < 4 && (
          <button
            type="button"
            onClick={() => { setTrust((prev) => [...prev, { enabled: true, icon: "shield", title: "", subtitle: "" }]); setTrustDirty(true); }}
            className="inline-flex items-center gap-2 px-4 h-9 text-sm font-semibold text-primary border border-primary/30 rounded-xl hover:bg-primary/5 transition"
          >
            <FiPlus /> Add Badge
          </button>
        )}
      </div>

      {/* TESTIMONIALS */}
      <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-bold text-gray-900 dark:text-white">Customer Testimonials</h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              The "Customer Chronicles" reviews section. Turn it off, edit copy, or add your own reviews.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
              <Switch isSelected={testimonials.enabled !== false} onValueChange={(v: boolean) => { setTestimonials((t) => ({ ...t, enabled: v })); setTestimonialsDirty(true); }} color="primary" />
              Show section
            </label>
            {testimonialsDirty && (
              <button
                type="button"
                onClick={saveTestimonials}
                disabled={saving}
                className="flex items-center gap-2 px-4 h-9 bg-gradient-to-r from-primary to-indigo-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-60"
              >
                {saving ? <FiUpload className="animate-pulse" /> : <FiCheck />} Save Testimonials
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Eyebrow" placeholder="CUSTOMER CHRONICLES" value={testimonials.eyebrow ?? ""} onValueChange={(v) => { setTestimonials((t) => ({ ...t, eyebrow: v })); setTestimonialsDirty(true); }} />
          <Input label="Subtitle" placeholder="Real stories from customers…" value={testimonials.subtitle ?? ""} onValueChange={(v) => { setTestimonials((t) => ({ ...t, subtitle: v })); setTestimonialsDirty(true); }} />
          <Input label="Title" placeholder="Loved by" value={testimonials.title ?? ""} onValueChange={(v) => { setTestimonials((t) => ({ ...t, title: v })); setTestimonialsDirty(true); }} />
          <Input label="Accent (highlighted)" placeholder="thousands." value={testimonials.accent ?? ""} onValueChange={(v) => { setTestimonials((t) => ({ ...t, accent: v })); setTestimonialsDirty(true); }} />
        </div>
        {(testimonials.items ?? []).map((item, i) => (
          <div key={i} className="rounded-xl border border-gray-100 dark:border-white/6 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Review {i + 1}</span>
              <button
                type="button"
                onClick={() => { setTestimonials((t) => ({ ...t, items: (t.items ?? []).filter((_, bi) => bi !== i) })); setTestimonialsDirty(true); }}
                className="text-xs text-red-500 font-semibold hover:underline"
              >
                Remove
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                {item.image ? (
                  <>
                    <img src={item.image} alt="" className="h-14 w-14 rounded-full object-cover border border-gray-200 dark:border-white/10" />
                    <button
                      type="button"
                      onClick={() => { setTestimonials((t) => ({ ...t, items: (t.items ?? []).map((x, xi) => (xi === i ? { ...x, image: undefined } : x)) })); setTestimonialsDirty(true); }}
                      className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-white text-[10px] shadow-md"
                      aria-label="Remove photo"
                    >
                      <FiX size={11} />
                    </button>
                  </>
                ) : (
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-primary to-cyan font-mono text-sm font-bold text-white">
                    {item.init || item.name?.slice(0, 2).toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Profile photo (optional)</p>
                <label
                  htmlFor={`testimonial-pic-${i}`}
                  className="inline-flex cursor-pointer items-center gap-2 px-3 h-9 text-xs font-semibold text-primary border border-primary/30 rounded-xl hover:bg-primary/5 transition"
                >
                  <FiUpload size={13} /> {item.image ? "Change photo" : "Upload photo"}
                </label>
                <input
                  id={`testimonial-pic-${i}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadTestimonialImage(i, f); }}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Input label="Name" placeholder="Tasnim Mahbub" value={item.name ?? ""} onValueChange={(v) => { setTestimonials((t) => ({ ...t, items: (t.items ?? []).map((x, xi) => (xi === i ? { ...x, name: v } : x)) })); setTestimonialsDirty(true); }} />
              <Input label="Initials" placeholder="TM" value={item.init ?? ""} onValueChange={(v) => { setTestimonials((t) => ({ ...t, items: (t.items ?? []).map((x, xi) => (xi === i ? { ...x, init: v } : x)) })); setTestimonialsDirty(true); }} />
              <Input label="Role" placeholder="Verified customer" value={item.role ?? ""} onValueChange={(v) => { setTestimonials((t) => ({ ...t, items: (t.items ?? []).map((x, xi) => (xi === i ? { ...x, role: v } : x)) })); setTestimonialsDirty(true); }} />
              <div className="min-w-0">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 block mb-1.5">Rating (1–5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={String(item.rating ?? 5)}
                  onChange={(e) => { setTestimonials((t) => ({ ...t, items: (t.items ?? []).map((x, xi) => (xi === i ? { ...x, rating: Number(e.target.value) } : x)) })); setTestimonialsDirty(true); }}
                  className="h-10 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm outline-none focus:border-primary/50"
                />
              </div>
              <Textarea label="Quote" placeholder="The product felt premium…" value={item.quote ?? ""} onValueChange={(v) => { setTestimonials((t) => ({ ...t, items: (t.items ?? []).map((x, xi) => (xi === i ? { ...x, quote: v } : x)) })); setTestimonialsDirty(true); }} className="sm:col-span-4" />
            </div>
          </div>
        ))}
        {(testimonials.items ?? []).length < 12 && (
          <button
            type="button"
            onClick={() => { setTestimonials((t) => ({ ...t, items: [...(t.items ?? []), { name: "", init: "", role: "", quote: "", rating: 5 }] })); setTestimonialsDirty(true); }}
            className="inline-flex items-center gap-2 px-4 h-9 text-sm font-semibold text-primary border border-primary/30 rounded-xl hover:bg-primary/5 transition"
          >
            <FiPlus /> Add Review
          </button>
        )}
      </div>

      {/* FOOTER */}
      <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-bold text-gray-900 dark:text-white">Footer</h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              Brand, slogan, social links, categories, contact details, copyright and footer links. Turn it off to hide the footer entirely.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
              <Switch isSelected={footer.enabled !== false} onValueChange={(v: boolean) => { setFooter((f) => ({ ...f, enabled: v })); setFooterDirty(true); }} color="primary" />
              Show footer
            </label>
            {footerDirty && (
              <button
                type="button"
                onClick={saveFooter}
                disabled={saving}
                className="flex items-center gap-2 px-4 h-9 bg-gradient-to-r from-primary to-indigo-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-60"
              >
                {saving ? <FiUpload className="animate-pulse" /> : <FiCheck />} Save Footer
              </button>
            )}
          </div>
        </div>

        {/* Brand */}
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 pt-1">Brand</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Brand name" placeholder={config.storeName} value={footer.brand ?? ""} onValueChange={(v) => { setFooter((f) => ({ ...f, brand: v })); setFooterDirty(true); }} description="Leave empty to use the store name." />
          <Input label="Logo image URL" placeholder="https://…/logo.png" value={footer.logo ?? ""} onValueChange={(v) => { setFooter((f) => ({ ...f, logo: v })); setFooterDirty(true); }} description="Leave empty to use the store logo." />
        </div>
        <Input label="Slogan" placeholder="Your message about quality, trust, and service." value={footer.slogan ?? ""} onValueChange={(v) => { setFooter((f) => ({ ...f, slogan: v })); setFooterDirty(true); }} />

        {/* Social */}
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 pt-1">Social links</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Facebook URL" placeholder="https://facebook.com/yourpage" value={footer.social?.facebook ?? ""} onValueChange={(v) => { setFooter((f) => ({ ...f, social: { ...(f.social ?? {}), facebook: v } })); setFooterDirty(true); }} />
          <Input label="YouTube URL" placeholder="https://youtube.com/@yourchannel" value={footer.social?.youtube ?? ""} onValueChange={(v) => { setFooter((f) => ({ ...f, social: { ...(f.social ?? {}), youtube: v } })); setFooterDirty(true); }} />
          <Input label="Instagram URL" placeholder="https://instagram.com/yourpage" value={footer.social?.instagram ?? ""} onValueChange={(v) => { setFooter((f) => ({ ...f, social: { ...(f.social ?? {}), instagram: v } })); setFooterDirty(true); }} />
          <Input label="WhatsApp link/number" placeholder="https://wa.me/8801XXXXXXXXX or 8801…" value={footer.social?.whatsapp ?? ""} onValueChange={(v) => { setFooter((f) => ({ ...f, social: { ...(f.social ?? {}), whatsapp: v } })); setFooterDirty(true); }} />
          <Input label="Phone (call button)" placeholder="+880 1XXX-XXXXXX" value={footer.social?.phone ?? ""} onValueChange={(v) => { setFooter((f) => ({ ...f, social: { ...(f.social ?? {}), phone: v } })); setFooterDirty(true); }} />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-3 pt-1">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
            <Switch isSelected={footer.showCategories !== false} onValueChange={(v: boolean) => { setFooter((f) => ({ ...f, showCategories: v })); setFooterDirty(true); }} color="primary" />
            Show categories column
          </label>
        </div>
        {footer.showCategories !== false && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Category heading" placeholder="Categories" value={footer.categoryTitle ?? ""} onValueChange={(v) => { setFooter((f) => ({ ...f, categoryTitle: v })); setFooterDirty(true); }} />
              <Input type="number" label="Max categories" min={1} max={20} value={String(footer.categoryLimit ?? 6)} onValueChange={(v) => { setFooter((f) => ({ ...f, categoryLimit: Number(v) || 6 })); setFooterDirty(true); }} description="Used when no manual categories are set below (auto from store)." />
            </div>
            {(footer.categories ?? []).map((c, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
                <Input label="Category label" placeholder="Category 1" value={c.label ?? ""} onValueChange={(v) => { setFooter((f) => ({ ...f, categories: (f.categories ?? []).map((x, xi) => (xi === i ? { ...x, label: v } : x)) })); setFooterDirty(true); }} />
                <Input label="URL" placeholder="/categories/slug" value={c.url ?? ""} onValueChange={(v) => { setFooter((f) => ({ ...f, categories: (f.categories ?? []).map((x, xi) => (xi === i ? { ...x, url: v } : x)) })); setFooterDirty(true); }} />
                <div className="flex items-end pb-1">
                  <button type="button" onClick={() => { setFooter((f) => ({ ...f, categories: (f.categories ?? []).filter((_, bi) => bi !== i) })); setFooterDirty(true); }} className="text-xs text-red-500 font-semibold hover:underline">
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => { setFooter((f) => ({ ...f, categories: [...(f.categories ?? []), { label: "", url: "" }] })); setFooterDirty(true); }}
              className="inline-flex items-center gap-2 px-4 h-9 text-sm font-semibold text-primary border border-primary/30 rounded-xl hover:bg-primary/5 transition"
            >
              <FiPlus /> Add Category (optional — auto-detected when empty)
            </button>
          </>
        )}

        {/* Contact */}
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 pt-1">Contact</p>
        <Input label="Contact heading" placeholder="Contact" value={footer.contactTitle ?? ""} onValueChange={(v) => { setFooter((f) => ({ ...f, contactTitle: v })); setFooterDirty(true); }} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Address" placeholder="Street, city, country" value={footer.contact?.address ?? ""} onValueChange={(v) => { setFooter((f) => ({ ...f, contact: { ...(f.contact ?? {}), address: v } })); setFooterDirty(true); }} />
          <Input label="Phone" placeholder="+880 1XXX-XXXXXX" value={footer.contact?.phone ?? ""} onValueChange={(v) => { setFooter((f) => ({ ...f, contact: { ...(f.contact ?? {}), phone: v } })); setFooterDirty(true); }} />
          <Input label="Email" placeholder="info@example.com" value={footer.contact?.email ?? ""} onValueChange={(v) => { setFooter((f) => ({ ...f, contact: { ...(f.contact ?? {}), email: v } })); setFooterDirty(true); }} />
        </div>

        {/* Bottom */}
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 pt-1">Bottom bar</p>
        <Input label="Copyright text" placeholder="© 2026 EPIC Store. All rights reserved." value={footer.copyright ?? ""} onValueChange={(v) => { setFooter((f) => ({ ...f, copyright: v })); setFooterDirty(true); }} />
        <Input label="Design credit" placeholder="Designed by Epic Optimize" value={footer.credit ?? ""} onValueChange={(v) => { setFooter((f) => ({ ...f, credit: v })); setFooterDirty(true); }} />
        {(footer.links ?? []).map((l, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
            <Input label="Label" placeholder="Privacy Notice" value={l.label ?? ""} onValueChange={(v) => { setFooter((f) => ({ ...f, links: (f.links ?? []).map((x, xi) => (xi === i ? { ...x, label: v } : x)) })); setFooterDirty(true); }} />
            <Input label="URL" placeholder="/ or #shop or https://…" value={l.url ?? ""} onValueChange={(v) => { setFooter((f) => ({ ...f, links: (f.links ?? []).map((x, xi) => (xi === i ? { ...x, url: v } : x)) })); setFooterDirty(true); }} />
            <div className="flex items-end pb-1">
              <button
                type="button"
                onClick={() => { setFooter((f) => ({ ...f, links: (f.links ?? []).filter((_, bi) => bi !== i) })); setFooterDirty(true); }}
                className="text-xs text-red-500 font-semibold hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => { setFooter((f) => ({ ...f, links: [...(f.links ?? []), { label: "", url: "" }] })); setFooterDirty(true); }}
          className="inline-flex items-center gap-2 px-4 h-9 text-sm font-semibold text-primary border border-primary/30 rounded-xl hover:bg-primary/5 transition"
        >
          <FiPlus /> Add Footer Link
        </button>
      </div>

      <div hidden>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 h-10 text-sm font-bold text-white font-display hover:bg-primary-dark transition-colors"
        >
          <FiPlus /> Add Section
        </button>
        <p className="mt-2 text-xs text-gray-400">Each section shows products from the categories you choose below.</p>
      </div>

      <div hidden>
      {sections.length === 0 && (
        <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-8 text-center text-sm text-gray-400">
          No custom sections yet. Click “Add Section” — otherwise the storefront shows one carousel per category.
        </div>
      )}

      {sections.map((s, idx) => (
        <div key={s.id} className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-5 sm:p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display font-bold text-gray-900 dark:text-white">Section {idx + 1}</h3>
            <button
              type="button"
              onClick={() => remove(s.id)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 h-8 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
            >
              <FiTrash2 /> Remove
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Section Title (optional)" placeholder="e.g. Summer Essentials" value={s.title ?? ""} onValueChange={(v) => update(s.id, { title: v })} />
            <Select
              label="Display Mode"
              selectedKeys={[s.mode]}
              onSelectionChange={(k) => update(s.id, { mode: (Array.from(k as Set<string>)[0] ?? "carousel") as HomeSectionDef["mode"] })}
            >
              <SelectItem key="carousel">Carousel</SelectItem>
              <SelectItem key="grid">Grid</SelectItem>
              <SelectItem key="responsive">Responsive (mobile grid, PC carousel)</SelectItem>
              <SelectItem key="infinite">Infinite carousel (auto-loop)</SelectItem>
            </Select>
            <Input type="number" min={1} max={50} label="Products in this section" value={String(s.productLimit ?? 8)} onValueChange={(v) => update(s.id, { productLimit: Math.max(1, Math.min(50, Math.floor(Number(v) || 8))) })} />
          </div>

          <div>
            <Select
              label="Categories (one or more)"
              placeholder="Search and select categories…"
              description="Pick one category to show only those products — or pick several to combine them in this section."
              selectionMode="multiple"
              selectedKeys={s.categoryIds}
              onSelectionChange={(keys) => update(s.id, { categoryIds: Array.from(keys as Set<string>) })}
              items={cats}
              isInvalid={!s.categoryIds.length}
              errorMessage="Select at least one category"
              className="w-full"
            >
              {(c) => (
                <SelectItem key={c.id} textValue={c.name}>
                  <div className="flex w-full items-center justify-between gap-3">
                    <span>{c.name}</span>
                    {typeof c._count?.products === "number" && (
                      <span className="font-mono text-xs opacity-70">({c._count.products})</span>
                    )}
                  </div>
                </SelectItem>
              )}
            </Select>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">
            <Switch isSelected={s.auto} onValueChange={(v: boolean) => update(s.id, { auto: v })} color="primary" className="gap-2 min-w-0">
              Auto-slide
            </Switch>
            <div className="min-w-0">
              <Input type="number" min={1} max={60} label="Seconds" value={String(s.seconds)} onValueChange={(v) => update(s.id, { seconds: Math.max(1, Math.min(60, Number(v) || 1)) })} />
            </div>
            <Switch isSelected={s.pagination} onValueChange={(v: boolean) => update(s.id, { pagination: v })} color="primary" className="gap-2 min-w-0">
              Pagination dots
            </Switch>
            <Switch isSelected={s.loop} onValueChange={(v: boolean) => update(s.id, { loop: v })} color="primary" className="gap-2 min-w-0">
              Loop
            </Switch>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-4">
            <Input type="number" step="0.5" min="0.5" label="Per view (Mobile)" value={String(s.perView.mobile)} onValueChange={(v) => update(s.id, { perView: { ...s.perView, mobile: Math.max(0.5, Number(v) || 1) } })} />
            <Input type="number" step="0.5" min="0.5" label="Per view (Tablet)" value={String(s.perView.tablet)} onValueChange={(v) => update(s.id, { perView: { ...s.perView, tablet: Math.max(0.5, Number(v) || 1) } })} />
            <Input type="number" step="0.5" min="0.5" label="Per view (Desktop)" value={String(s.perView.desktop)} onValueChange={(v) => update(s.id, { perView: { ...s.perView, desktop: Math.max(0.5, Number(v) || 1) } })} />
          </div>

          <Switch isSelected={s.showViewAll} onValueChange={(v: boolean) => update(s.id, { showViewAll: v })} color="primary">
            Show “View All” link
          </Switch>
        </div>
      ))}

      <button
        type="button"
        onClick={submit}
        className="px-5 h-10 bg-primary text-white text-sm font-bold font-display rounded-xl hover:bg-primary-dark transition-colors"
      >
        {saving ? "Saving…" : "Save Home Layout"}
      </button>
      </div>
    </div>
  );
}

/* ==================== PAYMENTS ==================== */
function PaymentSettings({ save, saving, config }: { save: (payload: object) => Promise<void>; saving: boolean; config: Config }) {
  const [codEnabled, setCodEnabled] = useState(config.featureFlags.cod);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save({ featureFlags: { cod: codEnabled } });
  }

  return (
    <form onSubmit={submit} className="space-y-6 max-w-3xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-6">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-sm font-medium text-gray-800 dark:text-slate-200">Cash on Delivery</p><p className="text-xs text-gray-400 dark:text-slate-500">Allow customers to pay on delivery.</p></div>
            <Switch aria-label="Enable Cash on Delivery" isSelected={codEnabled} onValueChange={setCodEnabled} color="primary" />
          </div>
          <p className="mt-4 text-xs text-gray-500">{codEnabled ? "Enabled" : "Disabled"}</p>
        </div>
        <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-6">
          <p className="text-sm font-medium text-gray-800 dark:text-slate-200">Stripe</p>
          <dl className="mt-4 space-y-2 text-xs text-gray-500">
            <div className="flex justify-between gap-4"><dt>Configured</dt><dd>{config.stripeConfigured ? "Yes" : "No"}</dd></div>
            <div className="flex justify-between gap-4"><dt>Test mode</dt><dd>{config.stripeTestMode ? "Yes" : "No"}</dd></div>
            <div className="flex justify-between gap-4"><dt>Webhook URL</dt><dd>/api/webhooks/stripe</dd></div>
          </dl>
          {!config.stripeConfigured && <p className="mt-3 text-xs text-amber-600">Configure Stripe test keys in the server environment.</p>}
        </div>
      </div>
      <button type="submit" disabled={saving} className="px-5 h-10 bg-primary text-white text-sm font-bold font-display rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60">
        {saving ? "Saving..." : "Save Payment Settings"}
      </button>
    </form>
  );
}

/* ==================== HERO BANNER ==================== */
function BannerSettings({ save, saving, config, token }: { save: (payload: object) => Promise<void>; saving: boolean; config: Config; token: string }) {
  const current = config.heroBannerConfig ?? {};
  const [enabled, setEnabled] = useState(current.enabled !== false);
  const [announceText, setAnnounceText] = useState(current.announceText ?? "");
  const [pillEnabled, setPillEnabled] = useState(current.trendingPill?.enabled !== false);
  const [pillTop, setPillTop] = useState(current.trendingPill?.topText ?? "Trending Item");
  const [pillBottom, setPillBottom] = useState(current.trendingPill?.bottomText ?? "Rated 4.9 ★ by customers");
  const [announceBadge, setAnnounceBadge] = useState(current.announceBadge ?? "Festive Drop 2026");
  const [announceLinkLabel, setAnnounceLinkLabel] = useState(current.announceLinkLabel ?? "Explore Drops");
  const [announceLink, setAnnounceLink] = useState(current.announceLink ?? "#categories");
  const [heroSeconds, setHeroSeconds] = useState(String(current.seconds ?? 6));
  const [mediaItems, setMediaItems] = useState<{ url: string; filename: string; altText?: string | null }[]>([]);
  const [mediaPickerSlide, setMediaPickerSlide] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");

  type SlideData = {
    id: string;
    image: string;
    badge: string;
    title: string;
    accent: string;
    cardLabel: string;
    cardText: string;
    cardLink: string;
    subtitle: string;
    buttonLabel: string;
    buttonLink: string;
    secondaryLabel: string;
    secondaryLink: string;
    uploading: boolean;
  };

  const makeEmptySlide = (): SlideData => ({
    id: crypto.randomUUID(),
    image: "", badge: "", title: "", accent: "", subtitle: "",
    cardLabel: "", cardText: "", cardLink: "",
    buttonLabel: "", buttonLink: "", secondaryLabel: "", secondaryLink: "",
    uploading: false,
  });

  const [slides, setSlides] = useState<SlideData[]>(() => {
    const raw = current.slides;
    if (raw && raw.length > 0) {
      return raw.map((s: any) => ({
        id: s.id || crypto.randomUUID(),
        image: s.image ?? "",
        badge: s.badge ?? "",
        title: s.title ?? "",
        accent: s.accent ?? "",
        cardLabel: s.cardLabel ?? "",
        cardText: s.cardText ?? "",
        cardLink: s.cardLink ?? "",
        subtitle: s.subtitle ?? "",
        buttonLabel: s.buttonLabel ?? "",
        buttonLink: s.buttonLink ?? "",
        secondaryLabel: s.secondaryLabel ?? "",
        secondaryLink: s.secondaryLink ?? "",
        uploading: false,
      }));
    }
    if (current.image || current.title) {
      return [{
        id: crypto.randomUUID(),
        image: current.image ?? "",
        badge: current.badge ?? "",
        title: current.title ?? "",
        accent: current.accent ?? "",
        cardLabel: current.cardLabel ?? "",
        cardText: current.cardText ?? "",
        cardLink: current.cardLink ?? "",
        subtitle: current.subtitle ?? "",
        buttonLabel: current.buttonLabel ?? "",
        buttonLink: current.buttonLink ?? "",
        secondaryLabel: current.secondaryLabel ?? "",
        secondaryLink: current.secondaryLink ?? "",
        uploading: false,
      }];
    }
    return [makeEmptySlide()];
  });

  const latestConfigRef = useRef(config);
  latestConfigRef.current = config;
  useEffect(() => {
    const raw = latestConfigRef.current.heroBannerConfig?.slides;
    if (raw && raw.length > 0) {
      setSlides(raw.map((s: any) => ({
        id: s.id || crypto.randomUUID(),
        image: s.image ?? "",
        badge: s.badge ?? "",
        title: s.title ?? "",
        accent: s.accent ?? "",
        cardLabel: s.cardLabel ?? "",
        cardText: s.cardText ?? "",
        cardLink: s.cardLink ?? "",
        subtitle: s.subtitle ?? "",
        buttonLabel: s.buttonLabel ?? "",
        buttonLink: s.buttonLink ?? "",
        secondaryLabel: s.secondaryLabel ?? "",
        secondaryLink: s.secondaryLink ?? "",
        uploading: false,
      })));
    }
  }, [config.heroBannerConfig]);

  function updateSlide(id: string, patch: Partial<SlideData>) {
    setSlides((old) => old.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function toggleMediaPicker(id: string) {
    if (mediaPickerSlide === id) { setMediaPickerSlide(null); return; }
    setMediaPickerSlide(id);
    setMediaError("");
    if (mediaItems.length) return;
    setMediaLoading(true);
    try {
      const response = await api("/api/admin/media", token);
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) throw new Error(data.error ?? "Could not load image library");
      setMediaItems(data);
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "Could not load image library");
    } finally { setMediaLoading(false); }
  }

  async function handleUpload(id: string, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    updateSlide(id, { uploading: true });
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("kind", "hero");
      const response = await fetch(apiUrl + "/api/admin/upload", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      updateSlide(id, { image: data.url, uploading: false });
      toast.success("Image uploaded");
    } catch (error) {
      updateSlide(id, { uploading: false });
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      event.target.value = "";
    }
  }

  function submit() {
    const cleaned = slides
      .filter((s) => s.image || s.title)
      .map((s) => ({
        id: s.id,
        image: s.image || null,
        badge: s.badge || null,
        title: s.title || null,
        accent: s.accent || null,
        cardLabel: s.cardLabel || null,
        cardText: s.cardText || null,
        cardLink: s.cardLink || null,
        subtitle: s.subtitle || null,
        buttonLabel: s.buttonLabel || null,
        buttonLink: s.buttonLink || null,
        secondaryLabel: s.secondaryLabel || null,
        secondaryLink: s.secondaryLink || null,
      }));
    save({
      heroBannerConfig: {
        enabled,
        announceText: announceText || null,
        announceBadge: announceBadge || null,
        announceLinkLabel: announceLinkLabel || null,
        announceLink: announceLink || null,
        seconds: Math.max(2, Math.min(30, Number(heroSeconds) || 6)),
        trendingPill: {
          enabled: pillEnabled,
          topText: pillTop || null,
          bottomText: pillBottom || null,
        },
        image: cleaned[0]?.image ?? null,
        badge: cleaned[0]?.badge ?? null,
        title: cleaned[0]?.title ?? null,
        accent: cleaned[0]?.accent ?? null,
        cardLabel: cleaned[0]?.cardLabel ?? null,
        cardText: cleaned[0]?.cardText ?? null,
        cardLink: cleaned[0]?.cardLink ?? null,
        subtitle: cleaned[0]?.subtitle ?? null,
        buttonLabel: cleaned[0]?.buttonLabel ?? null,
        buttonLink: cleaned[0]?.buttonLink ?? null,
        secondaryLabel: cleaned[0]?.secondaryLabel ?? null,
        secondaryLink: cleaned[0]?.secondaryLink ?? null,
        slides: cleaned,
      },
    });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-slate-200">Hero banner slider</p>
            <p className="text-xs text-gray-400 dark:text-slate-500">Add one or more banners. With multiple banners they will auto-slide in a carousel.</p>
          </div>
          <Switch isSelected={enabled} onValueChange={setEnabled} color="primary" />
        </div>
        <Input label="Top announcement text" placeholder="e.g. Free shipping on orders over $50" value={announceText} onValueChange={setAnnounceText} description="The message shown above the header." />
        {announceText && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            <Input label="Badge pill text" placeholder="Festive Drop 2026" value={announceBadge} onValueChange={setAnnounceBadge} />
            <Input label="Link text" placeholder="Explore Drops" value={announceLinkLabel} onValueChange={setAnnounceLinkLabel} />
            <Input label="Link URL" placeholder="#categories" value={announceLink} onValueChange={setAnnounceLink} />
          </div>
        )}
        <Input
          type="number"
          label="Hero carousel seconds (auto-slide interval)"
          min={2}
          max={30}
          value={heroSeconds}
          onValueChange={setHeroSeconds}
          description="Seconds each banner shows before auto-sliding."
        />

        <div className="rounded-xl border border-gray-100 dark:border-white/6 bg-gray-50/60 dark:bg-white/3 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-slate-200">Floating trending badge</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">Small "Trending Item" card floating on the banner. Turn off to hide on your store.</p>
            </div>
            <Switch isSelected={pillEnabled} onValueChange={setPillEnabled} color="primary" />
          </div>
          {pillEnabled && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Top line" placeholder="e.g. Trending Item" value={pillTop} onValueChange={setPillTop} />
              <Input label="Bottom line" placeholder="e.g. Rated 4.9 ★ by customers" value={pillBottom} onValueChange={setPillBottom} />
            </div>
          )}
        </div>
      </div>

      {slides.map((slide, idx) => (
        <div key={slide.id} className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-800 dark:text-slate-200">Banner {idx + 1}</p>
            {slides.length > 1 && (
              <button
                type="button"
                onClick={() => setSlides((old) => old.filter((s) => s.id !== slide.id))}
                className="icon-square-btn text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
              >
                <FiTrash2 size={14} />
              </button>
            )}
          </div>

          <div className="flex items-start gap-4">
            {slide.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slide.image} alt={`Banner ${idx + 1}`} className="h-32 w-56 object-cover rounded-xl border border-gray-100 dark:border-white/6" />
            ) : (
              <div className="grid h-32 w-56 place-items-center rounded-xl border border-dashed border-gray-200 dark:border-white/10 text-xs text-gray-400">No image yet</div>
            )}
            <div className="space-y-2">
              <label className="flex items-center gap-2 px-4 h-10 bg-gray-900 dark:bg-white/10 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-gray-700 transition-colors">
                <FiBox size={14} />
                {slide.uploading ? "Uploading…" : "Upload Image"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(slide.id, e)} disabled={slide.uploading} />
              </label>
              <button type="button" onClick={() => toggleMediaPicker(slide.id)} className="flex items-center gap-2 px-3 h-9 rounded-lg border border-primary/20 text-xs font-semibold text-primary hover:bg-primary/5">
                <FiImage size={14} /> {mediaPickerSlide === slide.id ? "Hide existing images" : "Use an existing image"}
              </button>
              {slide.image && (
                <button type="button" onClick={() => updateSlide(slide.id, { image: "" })} className="px-3 h-8 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                  Remove
                </button>
              )}
            </div>
          </div>
          {mediaPickerSlide === slide.id && (
            <div className="rounded-xl border border-gray-100 p-3 dark:border-white/10">
              {mediaLoading ? <p className="py-5 text-center text-sm text-gray-500">Loading images…</p> : mediaError ? <p role="alert" className="py-5 text-center text-sm text-rose-600">{mediaError}</p> : mediaItems.length ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {mediaItems.map((image) => <button type="button" key={image.url} onClick={() => { updateSlide(slide.id, { image: image.url }); setMediaPickerSlide(null); }} className={`overflow-hidden rounded-lg border-2 ${slide.image === image.url ? "border-primary" : "border-transparent"}`} title={image.filename}>
                    <img src={image.url} alt={image.altText ?? image.filename} className="h-20 w-full object-cover" />
                  </button>)}
                </div>
              ) : <p className="py-5 text-center text-sm text-gray-500">No existing images found. Upload one above.</p>}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Badge" placeholder="e.g. New collection" value={slide.badge} onValueChange={(v) => updateSlide(slide.id, { badge: v })} />
            <Input label="Title (first line)" placeholder="Objects for" value={slide.title} onValueChange={(v) => updateSlide(slide.id, { title: v })} />
            <Input className="sm:col-span-2" label="Title (accent line)" placeholder="a softer daily life." value={slide.accent} onValueChange={(v) => updateSlide(slide.id, { accent: v })} />
            <Input label="Floating card label" placeholder="Curated for you" value={slide.cardLabel} onValueChange={(v) => updateSlide(slide.id, { cardLabel: v })} />
            <Input label="Floating card text" placeholder="Use the banner title if empty" value={slide.cardText} onValueChange={(v) => updateSlide(slide.id, { cardText: v })} />
            <Input className="sm:col-span-2" label="Floating card link (optional)" placeholder="#shop, /categories/accessories, or https://…" value={slide.cardLink} onValueChange={(v) => updateSlide(slide.id, { cardLink: v })} description="Leave empty to show the card without a link." />
            <Textarea className="sm:col-span-2" label="Subtitle" minRows={2} placeholder="Thoughtfully curated premium pieces…" value={slide.subtitle} onValueChange={(v) => updateSlide(slide.id, { subtitle: v })} />
            <Input label="Primary button text" placeholder="Explore Collection" value={slide.buttonLabel} onValueChange={(v) => updateSlide(slide.id, { buttonLabel: v })} />
            <Input label="Primary button link" placeholder="#shop or /products/slug or https://…" value={slide.buttonLink} onValueChange={(v) => updateSlide(slide.id, { buttonLink: v })} />
            <Input label="Secondary button text" placeholder="Shop by Category" value={slide.secondaryLabel} onValueChange={(v) => updateSlide(slide.id, { secondaryLabel: v })} />
            <Input label="Secondary button link" placeholder="#categories" value={slide.secondaryLink} onValueChange={(v) => updateSlide(slide.id, { secondaryLink: v })} />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setSlides((old) => [...old, makeEmptySlide()])}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 text-sm font-semibold text-gray-500 hover:border-primary hover:text-primary transition-colors"
      >
        <FiPlus size={16} /> Add Another Banner
      </button>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          className="px-5 h-10 bg-primary text-white text-sm font-bold font-display rounded-xl hover:bg-primary-dark transition-colors"
        >
          {saving ? "Saving…" : "Save Hero Banners"}
        </button>
        {!enabled && <span className="text-xs text-gray-400">Hero banner is currently hidden.</span>}
        <span className="text-xs text-gray-400">{slides.length} banner{slides.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

/* ==================== DELIVERY ==================== */
function DeliverySettings({ save, saving, config, token }: { save: (payload: object) => Promise<void>; saving: boolean; config: Config; token: string }) {
  const [steadfast, setSteadfast] = useState(Boolean(config.courierConfig?.steadfast?.enabled));
  const [pathao, setPathao] = useState(Boolean(config.courierConfig?.pathao?.enabled));
  const [redx, setRedx] = useState(Boolean(config.courierConfig?.redx?.enabled));
  const [testSending, setTestSending] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<{ id: string; name: string; charge: string }[]>(
    (config.shippingConfig?.options ?? []).map((option, index) => ({ id: option.id ?? `shipping-${index}`, name: option.name ?? "", charge: option.charge != null ? String(option.charge) : "" })),
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    save({
      emailConfig: f.get("emailHost")
        ? { host: f.get("emailHost"), port: Number(f.get("emailPort")), user: f.get("emailUser"), pass: f.get("emailPass"), fromEmail: f.get("fromEmail") }
        : undefined,
      courierConfig: {
        steadfast: { enabled: steadfast, apiKey: f.get("steadfastKey") || undefined, secretKey: f.get("steadfastSecret") || undefined },
        pathao: { enabled: pathao, clientId: f.get("pathaoId") || undefined, clientSecret: f.get("pathaoSecret") || undefined, clientEmail: f.get("pathaoEmail") || undefined },
        redx: { enabled: redx, apiKey: f.get("redxKey") || undefined },
      },
      shippingConfig: {
        options: shippingOptions.filter((option) => option.name.trim()).map((option) => ({ ...option, name: option.name.trim(), charge: Number(option.charge) || 0 })),
      },
    });
  }

  function ToggleRow({ label, description, selected, onChange, children }: { label: string; description: string; selected: boolean; onChange: (v: boolean) => void; children?: React.ReactNode }) {
    return (
      <div className="pb-6 border-b border-gray-100 dark:border-white/6 last:border-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{label}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500">{description}</p>
          </div>
          <Switch isSelected={selected} onValueChange={onChange} color="primary" />
        </div>
        {selected && children}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6 max-w-3xl">
      <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-6">
        <h3 className="font-display font-bold text-gray-900 dark:text-white mb-5">Email SMTP</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input name="emailHost" label="SMTP Host" placeholder="smtp.gmail.com" defaultValue={config.emailConfig?.host ?? ""} />
          <Input name="emailPort" type="number" label="SMTP Port" defaultValue={config.emailConfig ? String(config.emailConfig.port) : "587"} />
          <Input name="emailUser" label="SMTP User" defaultValue={config.emailConfig?.user ?? ""} />
          <Input name="emailPass" type="password" label="SMTP Password" defaultValue={config.emailConfig?.pass ?? ""} />
          <Input className="sm:col-span-2" name="fromEmail" type="email" label="Sender Email" defaultValue={config.emailConfig?.fromEmail ?? ""} />
        </div>
        <button
          type="button"
          disabled={testSending || !config.emailConfigured}
          onClick={async () => {
            const to = window.prompt("Send test email to:", config.emailConfig?.fromEmail ?? "");
            if (!to) return;
            setTestSending(true);
            try {
              const response = await fetch(apiUrl + "/api/admin/test-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to }),
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data.error);
              toast.success(`Test email sent to ${to}!`);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not send test email");
            } finally {
              setTestSending(false);
            }
          }}
          className="mt-4 inline-flex items-center gap-2 px-4 h-9 text-sm font-semibold text-primary border border-primary/30 rounded-xl hover:bg-primary/5 transition disabled:opacity-50"
        >
          {testSending ? <FiLoader className="animate-spin" size={14} /> : <FiSend size={14} />} Send Test Email
        </button>
        {!config.emailConfigured && (
          <p className="mt-2 text-xs text-gray-400">Save the SMTP settings above first, then send a test email.</p>
        )}
      </div>

      <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-6">
        <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4">Delivery Couriers</h3>
        <div className="space-y-1">
          <ToggleRow label="Steadfast Courier API" description="Automate order shipments via Steadfast Courier." selected={steadfast} onChange={setSteadfast}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input name="steadfastKey" label="API Key" defaultValue={config.courierConfig?.steadfast?.apiKey ?? ""} />
              <Input name="steadfastSecret" type="password" label="Secret Key" defaultValue={config.courierConfig?.steadfast?.secretKey ?? ""} />
            </div>
          </ToggleRow>
          <ToggleRow label="Pathao Courier API" description="Automate order shipments via Pathao Logistics." selected={pathao} onChange={setPathao}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input name="pathaoId" label="Client ID" defaultValue={config.courierConfig?.pathao?.clientId ?? ""} />
              <Input name="pathaoEmail" label="Client Email" defaultValue={config.courierConfig?.pathao?.clientEmail ?? ""} />
              <Input name="pathaoSecret" type="password" label="Client Secret" defaultValue={config.courierConfig?.pathao?.clientSecret ?? ""} />
            </div>
          </ToggleRow>
          <ToggleRow label="RedX Courier API" description="Automate order shipments via RedX." selected={redx} onChange={setRedx}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input name="redxKey" label="API Key" defaultValue={config.courierConfig?.redx?.apiKey ?? ""} />
            </div>
          </ToggleRow>
        </div>
      </div>

      <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-6">
        <h3 className="font-display font-bold text-gray-900 dark:text-white mb-1">Shipping Charges</h3>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-5">Add named delivery choices and charges for customers to select at checkout.</p>
        <div className="space-y-3 mb-5">
          {shippingOptions.map((option, index) => <div key={option.id} className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] gap-3 items-end">
            <Input label="Option name shown at checkout" placeholder="Standard delivery" value={option.name} onValueChange={(name) => setShippingOptions((prev) => prev.map((item, i) => i === index ? { ...item, name } : item))} />
            <Input type="number" min={0} label="Shipping charge" value={option.charge} onValueChange={(charge) => setShippingOptions((prev) => prev.map((item, i) => i === index ? { ...item, charge } : item))} />
            <button type="button" onClick={() => setShippingOptions((prev) => prev.filter((_, i) => i !== index))} className="h-10 px-3 text-sm font-semibold text-danger hover:bg-danger/5 rounded-xl">Remove</button>
          </div>)}
          <button type="button" onClick={() => setShippingOptions((prev) => [...prev, { id: `shipping-${Date.now()}`, name: "", charge: "" }])} className="inline-flex items-center gap-1.5 px-4 h-9 text-sm font-semibold text-primary border border-primary/30 rounded-xl hover:bg-primary/5 transition">+ Add Shipping Option</button>
        </div>
      </div>

      <FailedEmails token={token} />

      <button type="submit" className="px-5 h-10 bg-primary text-white text-sm font-bold font-display rounded-xl hover:bg-primary-dark transition-colors">
        {saving ? "Saving…" : "Save Delivery Settings"}
      </button>
    </form>
  );
}

type FailedEmailRow = { id: string; to: string; subject: string; error?: string | null; attempts: number; createdAt: string };

function FailedEmails({ token }: { token: string }) {
  const [rows, setRows] = useState<FailedEmailRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    api("/api/admin/failed-emails", token)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => Array.isArray(data) && setRows(data))
      .catch(() => {});
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resend(id: string) {
    setBusy(id);
    const res = await api(`/api/admin/failed-emails/${id}/resend`, token, { method: "POST" });
    setBusy(null);
    if (res.ok) {
      toast.success("Email resent");
      setRows((prev) => prev.filter((row) => row.id !== id));
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not resend email");
    }
  }

  async function remove(id: string) {
    setBusy(id);
    await api(`/api/admin/failed-emails/${id}`, token, { method: "DELETE" });
    setBusy(null);
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  return (
    <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-6">
      <h3 className="font-display font-bold text-gray-900 dark:text-white mb-1">Failed Emails{rows.length ? ` (${rows.length})` : ""}</h3>
      <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">Emails that could not be delivered after 3 attempts. Resend once SMTP is fixed.</p>
      {!rows.length ? (
        <p className="text-sm text-gray-400">No failed emails.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 dark:border-white/6 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">{row.subject}</p>
                <p className="text-xs text-gray-400 truncate">
                  {row.to} · {new Date(row.createdAt).toLocaleString()}
                  {row.error ? ` · ${row.error}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={busy === row.id}
                  onClick={() => resend(row.id)}
                  className="h-8 px-3 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 disabled:opacity-50"
                >
                  Resend
                </button>
                <button
                  type="button"
                  disabled={busy === row.id}
                  onClick={() => remove(row.id)}
                  className="h-8 px-3 text-xs font-semibold text-danger border border-danger/30 rounded-lg hover:bg-danger/5 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================== MEDIA LIBRARY ==================== */
type MediaItem = { id: string; url: string; filename: string; size: number; modifiedAt: string; altText?: string | null; title?: string | null; description?: string | null };

function MediaLibrary({ token }: { token: string }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const refresh = async () => {
    const response = await api("/api/admin/media", token);
    if (!response.ok) throw new Error((await response.json()).error ?? "Could not load media");
    setItems(await response.json());
  };
  useEffect(() => { refresh().catch((error) => toast.error(error.message)).finally(() => setLoading(false)); }, []);

  async function upload(event: FormEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const body = new FormData(); body.append("image", file);
        const response = await fetch(`${apiUrl}/api/admin/media`, { method: "POST", body, credentials: "same-origin" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? `Could not upload ${file.name}`);
      }
      await refresh(); toast.success(files.length === 1 ? "Image uploaded" : `${files.length} images uploaded`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed"); }
    finally { setUploading(false); input.value = ""; }
  }

  async function save(item: MediaItem) {
    setBusy(item.id);
    try {
      const response = await api(`/api/admin/media/${item.id}`, token, { method: "PATCH", body: JSON.stringify({ altText: item.altText || null, title: item.title || null, description: item.description || null }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Could not save image details");
      setItems((all) => all.map((entry) => entry.id === item.id ? { ...entry, ...data } : entry)); toast.success("Image details saved");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save image details"); }
    finally { setBusy(""); }
  }

  async function remove(item: MediaItem) {
    if (!window.confirm(`Permanently delete ${item.filename}? Any store content using this image will have its reference removed.`)) return;
    setBusy(item.id);
    try {
      const response = await api(`/api/admin/media/${item.id}`, token, { method: "DELETE" });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error ?? "Could not delete image"); }
      setItems((all) => all.filter((entry) => entry.id !== item.id)); setSelectedId(null); toast.success("Image and its store references deleted");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete image"); }
    finally { setBusy(""); }
  }

  async function copy(url: string) {
    try { await navigator.clipboard.writeText(url); toast.success("Image URL copied"); }
    catch { toast.error("Could not copy URL"); }
  }

  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/6 dark:bg-white/4 sm:p-5">
      <div><h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">Media Library</h2><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{selectedId ? "Image details" : `${items.length} images`}</p></div>
      <div className="flex items-center gap-2">{selectedId && <button type="button" onClick={() => setSelectedId(null)} className="h-10 rounded-xl border border-gray-200 px-3 text-sm font-semibold dark:border-white/10">← All images</button>}<label className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold text-white sm:px-4 ${uploading ? "pointer-events-none opacity-60" : ""}`}><FiUpload />{uploading ? "Uploading…" : "Upload"}<input type="file" accept="image/*" multiple className="hidden" onChange={upload} disabled={uploading} /></label></div>
    </div>
    {loading ? <p className="p-8 text-center text-sm text-gray-500">Loading media…</p> : !items.length ? <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center text-sm text-gray-500 dark:border-white/10">No images yet. Upload an image here or add one while editing a product.</div> :
      <div className={selectedId ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"}>{items.filter((item) => !selectedId || item.id === selectedId).map((item) => <article key={item.id} onClick={() => !selectedId && setSelectedId(item.id)} onKeyDown={(event) => { if (!selectedId && (event.key === "Enter" || event.key === " ")) setSelectedId(item.id); }} role="button" tabIndex={0} className={`overflow-hidden border border-gray-100 bg-white dark:border-white/6 dark:bg-white/4 ${selectedId ? "rounded-2xl" : "aspect-square cursor-pointer rounded-xl p-1.5 transition hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary sm:rounded-2xl sm:p-2"}`}>
        <div className={selectedId ? "grid min-w-0 grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]" : "h-full w-full"}>
          <div className={`flex items-center justify-center bg-gray-50 dark:bg-black/20 ${selectedId ? "min-h-56 p-4 sm:min-h-80" : "h-full w-full rounded-lg p-1"}`}><img src={item.url} alt={selectedId ? item.altText || item.filename : ""} loading="lazy" className={selectedId ? "max-h-[55vh] max-w-full rounded-lg object-contain" : "h-full w-full rounded-lg object-contain"} /></div>
          <div className={`${selectedId ? "space-y-3 p-4 sm:p-6" : "hidden"}`}>
            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-bold text-gray-800 dark:text-slate-100" title={item.filename}>{item.filename}</p><p className="text-xs text-gray-400">{(item.size / 1024).toFixed(1)} KB · {new Date(item.modifiedAt).toLocaleDateString()}</p></div><button type="button" onClick={() => remove(item)} disabled={busy === item.id} aria-label="Delete image" className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 disabled:opacity-50"><FiTrash2 /></button></div>
            <div className="flex gap-2"><input readOnly value={item.url} className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-xs text-gray-600 dark:border-white/10 dark:bg-black/20 dark:text-slate-300" /><button type="button" onClick={() => copy(item.url)} title="Copy image URL" className="rounded-lg border border-gray-200 px-3 text-primary hover:bg-primary/5 dark:border-white/10"><FiCopy /></button></div>
            <Input size="sm" label="Title" value={item.title ?? ""} onValueChange={(value) => setItems((all) => all.map((entry) => entry.id === item.id ? { ...entry, title: value } : entry))} />
            <Input size="sm" label="Alt text" value={item.altText ?? ""} onValueChange={(value) => setItems((all) => all.map((entry) => entry.id === item.id ? { ...entry, altText: value } : entry))} />
            <Textarea size="sm" label="Description" minRows={2} value={item.description ?? ""} onValueChange={(value) => setItems((all) => all.map((entry) => entry.id === item.id ? { ...entry, description: value } : entry))} />
            <button type="button" onClick={() => save(item)} disabled={busy === item.id} className="h-9 rounded-lg bg-primary px-4 text-xs font-bold text-white disabled:opacity-50">{busy === item.id ? "Saving…" : "Save details"}</button>
          </div>
        </div>
      </article>)}</div>}
  </section>;
}

/* ==================== STORAGE ==================== */
function StorageSettings({ save, saving, configured, storage }: {
  save: (payload: object) => Promise<void>;
  saving: boolean;
  configured: boolean;
  storage: NonNullable<Config["storageConfig"]> | undefined;
}) {
  const [provider, setProvider] = useState<"local" | "hostinger-object-storage">(storage?.provider === "hostinger-object-storage" ? "hostinger-object-storage" : "local");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const payload =
      provider === "local"
        ? { storageConfig: { provider: "local", folderPath: f.get("folderPath"), publicBaseUrl: f.get("publicBaseUrl") } }
        : {
            storageConfig: {
              provider: "hostinger-object-storage",
              endpoint: f.get("endpoint"),
              region: f.get("region"),
              bucket: f.get("bucket"),
              accessKeyId: f.get("accessKeyId"),
              secretAccessKey: f.get("secretAccessKey"),
              publicBaseUrl: f.get("objPublicUrl") || undefined,
            },
          };
    save(payload);
  }

  return (
    <form onSubmit={submit} className="space-y-6 max-w-3xl">
      <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-6">
        <h3 className="font-display font-bold text-gray-900 dark:text-white mb-3">Image Storage</h3>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-5">
          Configure public folder paths or Object Storage for product images. {configured && <span className="text-emerald font-bold">Active ✓</span>}
        </p>

        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-white/6 mb-5">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-slate-200">Use Object Storage</p>
            <p className="text-xs text-gray-400 dark:text-slate-500">Switch to S3 compatible object storage endpoint.</p>
          </div>
          <Switch isSelected={provider === "hostinger-object-storage"} onValueChange={(v: boolean) => setProvider(v ? "hostinger-object-storage" : "local")} color="primary" />
        </div>

        {provider === "local" ? (
          <div className="grid grid-cols-1 gap-4">
            <Input isRequired name="folderPath" label="Absolute Upload Folder Path" placeholder="/home/hosting-user/domains/your-domain/uploads/products" defaultValue={storage?.folderPath ?? ""} />
            <p className="text-xs text-gray-500 dark:text-slate-400">Use a writable absolute folder outside public_html and the app deployment folder, so deploys do not replace uploaded images.</p>
            <Input isRequired name="publicBaseUrl" label="Public Base URL" placeholder="https://your-domain.com/uploads/products" defaultValue={storage?.publicBaseUrl ?? ""} />
            <p className="text-xs text-gray-500 dark:text-slate-400">Use this site's HTTPS URL ending in /uploads/products. The app serves files from the absolute folder above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input className="sm:col-span-2" name="endpoint" label="Endpoint URL" defaultValue={storage?.endpoint ?? ""} />
            <Input name="region" label="Region" defaultValue={storage?.region ?? ""} />
            <Input name="bucket" label="Bucket Name" defaultValue={storage?.bucket ?? ""} />
            <Input name="accessKeyId" label="Access Key ID" defaultValue={storage?.accessKeyId ?? ""} />
            <Input name="secretAccessKey" type="password" label="Secret Access Key" defaultValue={storage?.secretAccessKey ?? ""} />
            <Input name="objPublicUrl" label="Public Base URL (Optional)" defaultValue={storage?.publicBaseUrl ?? ""} />
          </div>
        )}

        <button type="submit" className="mt-6 px-5 h-10 bg-primary text-white text-sm font-bold font-display rounded-xl hover:bg-primary-dark transition-colors">
          {saving ? "Saving…" : "Save Storage Settings"}
        </button>
      </div>
    </form>
  );
}

/* ==================== CHECKOUT FORM ==================== */
type CheckoutFieldEditor = { enabled: boolean; required: boolean; label: string; placeholder: string };
const DEFAULT_CHECKOUT_FORM: Record<string, CheckoutFieldEditor> = {
  name: { enabled: true, required: true, label: "Full name", placeholder: "Rahim Ahmed" },
  phone: { enabled: true, required: true, label: "Phone number", placeholder: "+1 555 0100" },
  email: { enabled: false, required: false, label: "Email address (optional)", placeholder: "you@example.com" },
  addressLine1: { enabled: true, required: true, label: "Address line 1", placeholder: "Street address" },
  addressLine2: { enabled: true, required: false, label: "Address line 2", placeholder: "Apartment, suite, unit (optional)" },
  city: { enabled: true, required: true, label: "City", placeholder: "City" },
  state: { enabled: true, required: true, label: "State / Region", placeholder: "State or region" },
  postalCode: { enabled: true, required: true, label: "Postal code", placeholder: "Postal code" },
  country: { enabled: true, required: true, label: "Country", placeholder: "Country" },
};
const CHECKOUT_KEYS = ["name", "phone", "email", "addressLine1", "addressLine2", "city", "state", "postalCode", "country"];
const CHECKOUT_HINTS: Record<string, string> = {
  email: "Shown only when enabled. Customers receive an order confirmation email (requires SMTP).",
};

function CheckoutFormSettings({ save, saving, config }: { save: (payload: object) => Promise<void>; saving: boolean; config: Config }) {
  const [fields, setFields] = useState<Record<string, CheckoutFieldEditor>>(() => {
    const saved = config.checkoutForm ?? {};
    return Object.fromEntries(
      CHECKOUT_KEYS.map((key) => [key, { ...DEFAULT_CHECKOUT_FORM[key], ...(saved[key] ?? {}) }]),
    );
  });
  const setField = (key: string, patch: Partial<CheckoutFieldEditor>) => setFields((f) => ({ ...f, [key]: { ...f[key], ...patch } }));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save({
      checkoutForm: Object.fromEntries(
        CHECKOUT_KEYS.map((key) => [
          key,
          { enabled: fields[key].enabled, required: fields[key].required, label: fields[key].label, placeholder: fields[key].placeholder },
        ]),
      ),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6 max-w-3xl">
      <div className="bg-white dark:bg-white/4 rounded-2xl border border-gray-100 dark:border-white/6 p-6">
        <h3 className="font-display font-bold text-gray-900 dark:text-white mb-3">Checkout Form Fields</h3>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-5">
          Turn fields on/off, set which are required, and change the label &amp; placeholder. Disabled fields are hidden on checkout.
        </p>

        {CHECKOUT_KEYS.map((key) => (
          <div key={key} className="pb-6 border-b border-gray-100 dark:border-white/6 last:border-0" style={{ opacity: fields[key].enabled ? 1 : 0.55 }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-slate-200">
                  {key.charAt(0).toUpperCase() + key.slice(1)} field
                </p>
                {CHECKOUT_HINTS[key] && <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{CHECKOUT_HINTS[key]}</p>}
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                  Required
                  <Switch size="sm" isSelected={fields[key].required} onValueChange={(v: boolean) => setField(key, { required: v })} color="primary" />
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                  Show
                  <Switch size="sm" isSelected={fields[key].enabled} onValueChange={(v: boolean) => setField(key, { enabled: v })} color="primary" />
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Label" value={fields[key].label} onValueChange={(v) => setField(key, { label: v })} />
              <Input label="Placeholder" value={fields[key].placeholder} onValueChange={(v) => setField(key, { placeholder: v })} />
            </div>
          </div>
        ))}

        <button type="submit" className="mt-6 px-5 h-10 bg-primary text-white text-sm font-bold font-display rounded-xl hover:bg-primary-dark transition-colors">
          {saving ? "Saving…" : "Save Checkout Form"}
        </button>
      </div>
    </form>
  );
}
