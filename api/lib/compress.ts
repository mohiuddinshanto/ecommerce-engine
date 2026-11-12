import { brotliCompressSync, gzipSync, constants as zlibConstants } from "node:zlib";
import type { Request, Response, NextFunction } from "express";

export type CompressionEncoding = "br" | "gzip";

export const MIN_COMPRESS_SIZE = 1024;
/** Choose the best encoding the client accepts, preferring Brotli over gzip. */
export function pickEncoding(acceptEncoding: string | undefined): CompressionEncoding | null {
  const header = (acceptEncoding || "").toLowerCase();
  if (/\bbr\b/.test(header)) return "br";
  if (/\bgzip\b/.test(header)) return "gzip";
  return null;
}

/** Only text-ish payloads (JSON, HTML, JS, CSS, XML, SVG) are worth compressing. */
export function isCompressibleType(contentType: string): boolean {
  return /json|javascript|ecmascript|text\/|xml|svg|xhtml/i.test(contentType);
}

export function compressBuffer(buffer: Buffer, encoding: CompressionEncoding): Buffer {
  if (encoding === "br") {
    return brotliCompressSync(buffer, {
      params: {
        [zlibConstants.BROTLI_PARAM_QUALITY]: 4,
        [zlibConstants.BROTLI_PARAM_SIZE_HINT]: buffer.length,
      },
    });
  }
  return gzipSync(buffer, { level: 6 });
}

function toBuffer(chunk: unknown, encoding?: BufferEncoding): Buffer | null {
  if (chunk == null) return null;
  if (Buffer.isBuffer(chunk)) return chunk;
  if (typeof chunk === "string") return Buffer.from(chunk, encoding);
  if (chunk instanceof Uint8Array) return Buffer.from(chunk);
  return Buffer.from(String(chunk));
}

/**
 * Compress JSON/text responses produced by the Express API.
 *
 * Scoped to `/api/*` so Next.js streaming SSR (which the built-in Next server
 * already compresses) is never buffered. The bridge sets `accept-encoding:
 * identity` for its loopback calls, so this is a no-op on that path.
 */
export function apiCompression() {
  return function apiCompressionMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (!req.path.startsWith("/api/")) return next();

    const encoding = pickEncoding(req.headers["accept-encoding"] as string | undefined);
    if (!encoding) return next();

    const chunks: Buffer[] = [];
    const originalEnd = res.end.bind(res);
    let finished = false;

    res.write = ((chunk: unknown, ...args: unknown[]) => {
      const buffer = toBuffer(chunk, typeof args[0] === "string" ? (args[0] as BufferEncoding) : undefined);
      if (buffer) chunks.push(buffer);
      const callback = args.find((arg) => typeof arg === "function");
      if (typeof callback === "function") (callback as () => void)();
      return true;
    }) as typeof res.write;

    res.end = ((chunk?: unknown, ...args: unknown[]) => {
      if (finished) return res;
      finished = true;

      const buffer = toBuffer(chunk, typeof args[0] === "string" ? (args[0] as BufferEncoding) : undefined);
      if (buffer) chunks.push(buffer);

      const body = Buffer.concat(chunks);
      const contentType = String(res.getHeader("Content-Type") || "");
      const status = res.statusCode;
      const alreadyEncoded = Boolean(res.getHeader("Content-Encoding"));

      if (
        body.length < MIN_COMPRESS_SIZE ||
        alreadyEncoded ||
        status === 204 ||
        status === 304 ||
        !isCompressibleType(contentType)
      ) {
        return originalEnd(body);
      }

      const compressed = compressBuffer(body, encoding);
      res.setHeader("Content-Encoding", encoding);
      const vary = String(res.getHeader("Vary") || "");
      if (!/accept-encoding/i.test(vary)) {
        res.setHeader("Vary", vary ? `${vary}, Accept-Encoding` : "Accept-Encoding");
      }
      res.setHeader("Content-Length", String(compressed.length));
      return originalEnd(compressed);
    }) as typeof res.end;

    next();
  };
}
