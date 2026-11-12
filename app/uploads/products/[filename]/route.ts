import { readProductImage } from "../../../../api/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ filename: string }> };

async function serve(filename: string): Promise<Response> {
  try {
    const image = await readProductImage(filename);
    if (!image) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(image.buffer), {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(image.buffer.byteLength),
        "Content-Type": image.contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Product image read failed:", error);
    return new Response(null, { status: 500 });
  }
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  return serve((await context.params).filename);
}

export async function HEAD(_request: Request, context: RouteContext): Promise<Response> {
  const response = await serve((await context.params).filename);
  return new Response(null, { status: response.status, headers: response.headers });
}
