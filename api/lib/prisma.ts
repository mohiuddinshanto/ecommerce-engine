import { PrismaClient } from "@prisma/client";

/**
 * Append connection-pool limits to DATABASE_URL unless the URL (or the host)
 * already sets them. Hostinger's shared MySQL has a low `max_connections`, so
 * a small, explicit pool keeps a single Node process from exhausting it under
 * load. Both values can be overridden with env vars or directly in the URL.
 */
function withPoolParams(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return rawUrl;
  try {
    const url = new URL(rawUrl);
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", process.env.DATABASE_CONNECTION_LIMIT || "5");
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", process.env.DATABASE_POOL_TIMEOUT || "10");
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

// Reuse one client across the whole process (Express API + Next render share
// the same Node process), so we never open more pools than intended.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const pooledUrl = withPoolParams(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient(pooledUrl ? { datasources: { db: { url: pooledUrl } } } : undefined);

globalForPrisma.prisma = prisma;
