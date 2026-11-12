import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Toaster } from "react-hot-toast";
import { MarketingScripts, type MarketingPixels } from "../components/marketing-scripts";
import { StoreBottomNav } from "../components/store-bottom-nav";
import { StoreTheme } from "../components/store-theme";
import { internalApiUrl } from "../lib/internal-api";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "আমাদের স্টোর",
    template: "%s | আমাদের স্টোর",
  },
  description: "সেরা মানের পণ্য সংগ্রহ করুন। দ্রুত ডেলিভারি, নিরাপদ পেমেন্ট এবং সহজ রিটার্ন পলিসি।",
};

type ThemeSettings = { primaryColor?: string; secondaryColor?: string; font?: string };

function shade(hex: string, amt: number): string {
  const c = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(c)) return hex;
  const num = parseInt(c, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let theme: ThemeSettings = {};
  let pixels: MarketingPixels = {};
  try {
    const response = await fetch(internalApiUrl("/api/store/status"), {
      cache: "no-store",
      signal: AbortSignal.timeout(1_500),
    });
    const config = (await response.json()).config ?? {};
    theme = (config.themeSettings ?? {}) as ThemeSettings;
    pixels = (config.marketingPixels ?? {}) as MarketingPixels;
  } catch {
    /* The onboarding page remains usable before the API is available. */
  }

  const primary = /^#[0-9a-fA-F]{6}$/.test(theme.primaryColor ?? "") ? theme.primaryColor! : "#4f46e5";
  const secondary = theme.secondaryColor ?? "#ffffff";
  const style = {
    "--color-primary": primary,
    "--color-primary-dark": shade(primary, -14),
    "--primary": primary,
    "--primary-hover": shade(primary, -18),
    "--primary-light": shade(primary, 160),
    "--primary-gradient": `linear-gradient(135deg, ${primary} 0%, ${shade(primary, 40)} 100%)`,
    "--secondary": secondary,
    "--store-font": theme.font && theme.font !== "Arial" ? theme.font : "'Plus Jakarta Sans', sans-serif",
    "--font-sans": theme.font && theme.font !== "Arial" ? `'${theme.font}', sans-serif` : "'Plus Jakarta Sans', sans-serif",
    "--font-display": theme.font && theme.font !== "Arial" ? `'${theme.font}', sans-serif` : "'Outfit', sans-serif",
  } as CSSProperties;

  return (
    <html lang="bn">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+Bengali:wght@400;500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&family=Tiro+Bangla:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={style}>
        <Toaster position="top-center" toastOptions={{ duration: 3000, style: { borderRadius: '12px', background: '#0f172a', color: '#fff' } }} />
        <StoreTheme />
        {children}
        <StoreBottomNav />
        <MarketingScripts pixels={pixels} />
      </body>
    </html>
  );
}
