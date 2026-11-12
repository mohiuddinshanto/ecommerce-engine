import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function checkIpCooldown(req: Request, res: Response, next: NextFunction) {
  // `app.set("trust proxy", 1)` already resolves req.ip from the trusted proxy,
  // so reading x-forwarded-for directly would let a client spoof/spam-bypass.
  const ipAddress = req.ip || "127.0.0.1";
  try {
    const config = await prisma.storeConfig.findUnique({ where: { id: "store-config-singleton" } });
    if (!config?.enableIpLimit) return next();
    const lastOrder = await prisma.order.findFirst({ where: { ipAddress, deletedAt: null }, orderBy: { createdAt: "desc" } });
    if (!lastOrder) return next();
    const waitMs = config.cooldownMinutes * 60_000 - (Date.now() - lastOrder.createdAt.getTime());
    if (waitMs > 0) return res.status(429).json({ error: "Spam guard activated", message: `Please try again in ${Math.ceil(waitMs / 60_000)} minutes.` });
    next();
  } catch { res.status(500).json({ error: "Spam check failed" }); }
}

type ScopedUser = { role: string; allowedCategories?: unknown };

function scopedCategoryIds(user: ScopedUser): string[] | null {
  if (user.role === "ADMIN") return null;
  const allowed = Array.isArray(user.allowedCategories) ? user.allowedCategories.filter((id): id is string => typeof id === "string") : [];
  return allowed.length ? allowed : null;
}

function itemCategoryId(item: unknown): string | null {
  if (item && typeof item === "object" && "categoryId" in item) {
    const value = (item as { categoryId?: unknown }).categoryId;
    return value == null ? null : String(value);
  }
  return null;
}

function filterVisibleItems(orderItems: unknown, allowed: string[] | null) {
  if (allowed === null || !Array.isArray(orderItems)) return orderItems;
  return orderItems.filter((item) => {
    const id = itemCategoryId(item);
    return id !== null && allowed.includes(id);
  });
}

export function staffCanAccessOrderItems(user: ScopedUser, orderItems: unknown): boolean {
  const allowed = scopedCategoryIds(user);
  if (allowed === null) return true;
  if (!Array.isArray(orderItems)) return true;
  return orderItems.some((item) => {
    const id = itemCategoryId(item);
    return id !== null && allowed.includes(id);
  });
}

function restrictedSubtotal(items: unknown[]) {
  return items.reduce((sum: number, item) => sum + Number((item as { price?: unknown }).price) * Number((item as { qty?: unknown }).qty), 0);
}

export function restrictStaffOrderView(req: Request & { user?: ScopedUser }, res: Response, next: NextFunction) {
  if (!req.user) return next();
  const allowed = scopedCategoryIds(req.user);
  if (allowed === null) return next();
  const originalJson = res.json.bind(res);
  res.json = ((data: unknown) => {
    if (Array.isArray(data)) {
      const orders = data
        .map((order) => {
          if (order && typeof order === "object" && "orderItems" in order) {
            const items = (filterVisibleItems((order as { orderItems?: unknown }).orderItems, allowed) as unknown[]) ?? [];
            return { ...(order as Record<string, unknown>), orderItems: items, restrictedSubtotal: restrictedSubtotal(items) };
          }
          return order;
        })
        .filter((order) => !(order && typeof order === "object" && "orderItems" in order) || ((order as { orderItems?: unknown }).orderItems as unknown[]).length > 0);
      return originalJson(orders);
    }
    if (data && typeof data === "object" && "orderItems" in data) {
      const items = (filterVisibleItems((data as { orderItems?: unknown }).orderItems, allowed) as unknown[]) ?? [];
      return originalJson({ ...(data as Record<string, unknown>), orderItems: items, restrictedSubtotal: restrictedSubtotal(items) });
    }
    return originalJson(data);
  }) as Response["json"];
  next();
}
