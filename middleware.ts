import { NextResponse, type NextRequest } from "next/server";
import { internalApiUrl } from "./lib/internal-api";

const PUBLIC_FILES = /\.(?:png|jpg|jpeg|webp|avif|svg|ico|css|js|woff|woff2|ttf|eot|otf|json|map|mp4|webm)$/i;
const IP_HOST = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const TWO_PART_TLDS = new Set(["co.uk", "com.bd", "org.bd", "edu.bd", "gov.bd", "com.au", "co.nz", "co.in", "co.za"]);

type StoreStatusResult = {
  known: boolean;
  isOnboarded: boolean;
};

let cachedOnboarded: { value: boolean; expiresAt: number } | null = null;

async function checkStoreOnboarded(requestUrl: string, bustCache = false): Promise<StoreStatusResult> {
  const now = Date.now();
  if (!bustCache && cachedOnboarded && cachedOnboarded.expiresAt > now) {
    return { known: true, isOnboarded: cachedOnboarded.value };
  }

  const urlsToTry = [internalApiUrl("/api/store/status")];
  try {
    const originUrl = new URL("/api/store/status", requestUrl).toString();
    if (!urlsToTry.includes(originUrl)) {
      urlsToTry.push(originUrl);
    }
  } catch {
    // ignore URL parsing error
  }

  for (const statusUrl of urlsToTry) {
    try {
      const response = await fetch(statusUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(3_000),
      });
      if (!response.ok) continue;
      const data = (await response.json()) as { onboarded: boolean };
      const isOnboarded = Boolean(data.onboarded);

      // Once onboarded, the store stays onboarded; cache that for 10 minutes to
      // avoid an internal status fetch on every navigation. Unconfirmed/off
      // states stay short so onboarding still reacts quickly.
      cachedOnboarded = {
        value: isOnboarded,
        expiresAt: now + (isOnboarded ? 600_000 : 3_000),
      };
      return { known: true, isOnboarded };
    } catch {
      // Continue to next URL attempt
    }
  }

  // If previous valid status was cached, reuse it; otherwise status is unconfirmed
  if (cachedOnboarded) {
    return { known: true, isOnboarded: cachedOnboarded.value };
  }
  return { known: false, isOnboarded: false };
}

function subdomainFrom(hostname: string): string | undefined {
  const host = hostname.toLowerCase().split(":")[0].trim();
  if (!host || IP_HOST.test(host)) return undefined;

  const ignored = new Set(["www", "woocommerce", "store", "shop", "app", "dev", "staging", "api", "admin"]);

  const labels = host.split(".");
  if (labels.length < 2) return undefined;

  // Localhost (e.g. "shoes.localhost")
  if (labels.length === 2 && labels[1] === "localhost") {
    return ignored.has(labels[0]) ? undefined : labels[0];
  }

  // Two-part TLD (e.g. "shoes.mystore.com.bd")
  const lastTwo = labels.slice(-2).join(".");
  if (TWO_PART_TLDS.has(lastTwo)) {
    if (labels.length <= 3) return undefined;
    const first = labels[0];
    return ignored.has(first) ? undefined : first;
  }

  // Standard TLD (e.g. "shoes.mystore.com")
  if (labels.length > 2) {
    const first = labels[0];
    return ignored.has(first) ? undefined : first;
  }

  return undefined;
}

export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;

  // Skip static files, Next.js assets, API routes, and uploads
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/uploads") ||
    PUBLIC_FILES.test(pathname)
  ) {
    return NextResponse.next();
  }

  const bustCache = request.nextUrl.searchParams.has("refresh_onboarding");
  const { known, isOnboarded } = await checkStoreOnboarded(request.url, bustCache);

  if (known && !isOnboarded && pathname !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (known && isOnboarded && pathname === "/onboarding") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Rewrite root request to category page when visiting via a valid subdomain
  const subdomain = subdomainFrom(hostname);
  if (subdomain && pathname === "/") {
    return NextResponse.rewrite(new URL(`/categories/${subdomain}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
};
