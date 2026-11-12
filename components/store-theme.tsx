"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { getStoreStatus } from "../lib/store-status";

const CATALOG_VARS: Record<string, string> = {
  "--color-primary": "#093d2b",
  "--color-primary-dark": "#0c4e37",
  "--primary": "#093d2b",
  "--primary-hover": "#0c4e37",
  "--primary-light": "#ecfdf5",
  "--primary-gradient": "linear-gradient(135deg, #093d2b 0%, #12573d 100%)",
};

export function StoreTheme() {
  const pathname = usePathname();
  const original = useRef<Record<string, string> | null>(null);

  useEffect(() => {
    if (pathname?.startsWith("/admin") || pathname?.startsWith("/onboarding")) {
      if (original.current) {
        for (const key of Object.keys(CATALOG_VARS)) {
          document.body.style.setProperty(key, original.current[key] ?? "");
        }
      }
      return;
    }

    let alive = true;
    getStoreStatus()
      .then((s) => {
        if (!alive) return;
        if (!original.current) {
          original.current = {};
          for (const key of Object.keys(CATALOG_VARS)) {
            original.current[key] = document.body.style.getPropertyValue(key);
          }
        }
        const layout = s?.config?.homePageConfig?.layout ?? "classic";
        const target = layout === "catalog" ? CATALOG_VARS : original.current;
        for (const key of Object.keys(CATALOG_VARS)) {
          document.body.style.setProperty(key, target[key] ?? "");
        }
      })
      .catch(() => {
        if (!alive) return;
        if (original.current) {
          for (const key of Object.keys(CATALOG_VARS)) {
            document.body.style.setProperty(key, original.current[key] ?? "");
          }
        }
      });
    return () => {
      alive = false;
    };
  }, [pathname]);

  return null;
}