import { gunzipSync, inflateSync, brotliDecompressSync } from "node:zlib";
import {
  HOP_BY_HOP,
  proxyRequest,
  startApiServer,
} from "../../../lib/api-bridge";
import { compressBuffer, isCompressibleType, pickEncoding } from "../../../api/lib/compress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function forward(request: Request): Promise<Response> {
  await startApiServer();
  const incoming = new URL(request.url);
  const method = request.method.toUpperCase();

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers[key] = value;
  });
  // Request uncompressed response from loopback express
  headers["accept-encoding"] = "identity";

  const body =
    method === "GET" || method === "HEAD" ? null : Buffer.from(await request.arrayBuffer());

  const upstream = await proxyRequest(
    `${incoming.pathname}${incoming.search}`,
    method,
    headers,
    body,
  );

  let bodyBuffer: Buffer = upstream.body;
  const encoding = typeof upstream.headers["content-encoding"] === "string"
    ? upstream.headers["content-encoding"].toLowerCase().trim()
    : undefined;

  if (encoding === "gzip") {
    try { bodyBuffer = gunzipSync(bodyBuffer); } catch { /* ignore */ }
  } else if (encoding === "deflate") {
    try { bodyBuffer = inflateSync(bodyBuffer); } catch { /* ignore */ }
  } else if (encoding === "br") {
    try { bodyBuffer = brotliDecompressSync(bodyBuffer); } catch { /* ignore */ }
  }

  const responseHeaders = new Headers();
  for (const [key, value] of Object.entries(upstream.headers)) {
    if (value === undefined || HOP_BY_HOP.has(key.toLowerCase()) || key.toLowerCase() === "content-encoding") continue;
    if (Array.isArray(value)) {
      for (const item of value) responseHeaders.append(key, item);
    } else {
      responseHeaders.set(key, value);
    }
  }

  // The loopback call asked for an identity body, so compress here for the
  // real client (covers the `next start` fallback where Express is not the
  // request handler).
  const clientEncoding = pickEncoding(request.headers.get("accept-encoding") || undefined);
  const upstreamContentType = typeof upstream.headers["content-type"] === "string" ? upstream.headers["content-type"] : "";
  if (
    clientEncoding &&
    ![204, 205, 304].includes(upstream.status) &&
    bodyBuffer.length >= 1024 &&
    isCompressibleType(upstreamContentType)
  ) {
    bodyBuffer = compressBuffer(bodyBuffer, clientEncoding);
    responseHeaders.set("Content-Encoding", clientEncoding);
    const vary = responseHeaders.get("vary");
    if (!vary || !/accept-encoding/i.test(vary)) {
      responseHeaders.set("Vary", vary ? `${vary}, Accept-Encoding` : "Accept-Encoding");
    }
  }

  // Preserve the cache policy chosen by the API: public read endpoints send an
  // explicit public policy, everything else (auth, admin, cart, orders) sends
  // no-store. Only fall back to no-store when the upstream is silent.
  if (!responseHeaders.has("cache-control")) {
    responseHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  }
  if (!responseHeaders.has("pragma")) responseHeaders.set("Pragma", "no-cache");
  if (!responseHeaders.has("expires")) responseHeaders.set("Expires", "0");

  const responseBody = [204, 205, 304].includes(upstream.status) ? null : new Uint8Array(bodyBuffer);
  return new Response(responseBody, {
    status: upstream.status,
    statusText: upstream.statusText || undefined,
    headers: responseHeaders,
  });
}

function handle(request: Request): Promise<Response> {
  return forward(request).catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[api-bridge] request failed:", error);
    return new Response(JSON.stringify({ error: "API bridge unavailable", detail }), {
      status: 502,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        pragma: "no-cache",
        expires: "0",
      },
    });
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
export const OPTIONS = handle;
