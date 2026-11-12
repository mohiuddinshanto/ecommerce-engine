import type { NextFunction, Request, Response } from "express";

type Bucket = { count: number; resetAt: number };

const SWEEP_INTERVAL_MS = 60_000;

export interface RateLimitOptions {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Maximum requests allowed per key within the window. */
  max: number;
  /** Optional bucket-key override. Defaults to the client IP. */
  keyGenerator?: (req: Request) => string;
  /** Message returned with the 429 response. */
  message?: string;
}

/**
 * Minimal in-memory fixed-window rate limiter. Good enough for a single
 * process deployment; swap for a shared store (e.g. Redis) if the app is ever
 * scaled horizontally.
 */
export function rateLimit(options: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();
  let lastSweep = Date.now();

  function sweep(now: number) {
    if (now - lastSweep < SWEEP_INTERVAL_MS) return;
    lastSweep = now;
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const now = Date.now();
    sweep(now);
    const identity = options.keyGenerator ? options.keyGenerator(req) : req.ip ?? "unknown";
    const key = `${identity}:${req.method}:${req.baseUrl}${req.path}`;
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    res.setHeader("X-RateLimit-Limit", String(options.max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, options.max - bucket.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > options.max) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({ error: options.message ?? "Too many requests. Please try again later." });
      return;
    }
    next();
  };
}
