import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export type AuthUser = { id: string; name: string; email: string; emailVerified: boolean; role: "ADMIN" | "STAFF" | "CUSTOMER" | "REVIEWER"; staffType: "ORDER_MANAGER" | "PRODUCT_MANAGER" | null; allowedCategories: unknown };
declare global { namespace Express { interface Request { user?: AuthUser; sessionToken?: string; } } }

export const SESSION_COOKIE = "epic_session";
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const makeSessionToken = () => randomBytes(32).toString("hex");
export const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) throw new Error("JWT_SECRET must be set to a random secret of at least 32 characters");

export function issueAuthToken(user: Pick<AuthUser, "id" | "role">): string {
  return jwt.sign({ role: user.role }, jwtSecret!, { subject: user.id, expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions);
}

function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const index = part.indexOf("="); if (index < 0) continue;
    try { cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim()); }
    catch { cookies[part.slice(0, index).trim()] = part.slice(index + 1).trim(); }
  }
  return cookies;
}

export function readSessionToken(req: Request): string | undefined {
  const header = req.header("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return header || parseCookies(req.headers.cookie)[SESSION_COOKIE];
}

export function setSessionCookie(req: Request, res: Response, token: string): void {
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  const match = expiresIn.match(/^(\d+)(s|m|h|d)$/i);
  const factor = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
  const maxAge = match ? Number(match[1]) * factor[match[2].toLowerCase() as keyof typeof factor] : SESSION_MAX_AGE_MS;
  res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: req.secure, path: "/", maxAge });
}
export function clearSessionCookie(req: Request, res: Response): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", secure: req.secure, path: "/" });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = readSessionToken(req);
  if (!token) return res.status(401).json({ error: "Authentication required" });
  let subject: string;
  try {
    const payload = jwt.verify(token, jwtSecret!) as jwt.JwtPayload;
    if (!payload.sub) return res.status(401).json({ error: "Session expired" });
    subject = payload.sub;
  } catch { return res.status(401).json({ error: "Session expired" }); }
  const user = await prisma.user.findUnique({ where: { id: subject } });
  if (!user) return res.status(401).json({ error: "Session expired" });
  req.user = { id: user.id, name: user.name, email: user.email, emailVerified: user.emailVerified, role: user.role, staffType: user.staffType, allowedCategories: user.allowedCategories };
  req.sessionToken = token;
  next();
}
export function requireRole(...roles: AuthUser["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(403).json({ error: "Insufficient permissions" });
    if (req.user.role === "REVIEWER") {
      const allowed = (req.method === "GET" || req.method === "HEAD") && ["/api/admin/config", "/api/admin/dashboard"].includes(req.path);
      return allowed ? next() : res.status(403).json({ error: "Reviewer demo access is read-only" });
    }
    return roles.includes(req.user.role) ? next() : res.status(403).json({ error: "Insufficient permissions" });
  };
}

export function requireStaffArea(area: "orders" | "products") {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(403).json({ error: "Insufficient permissions" });
    if (user.role === "STAFF") {
      const blocked = area === "orders" ? user.staffType === "PRODUCT_MANAGER" : user.staffType === "ORDER_MANAGER";
      if (blocked) return res.status(403).json({ error: "This section is not available for your staff role" });
    }
    next();
  };
}
