const trimSlashes = (value: string) => value.replace(/\/+$/, "");

export function internalApiOrigin(): string {
  const configured = process.env.INTERNAL_API_URL?.trim();
  if (configured) return trimSlashes(configured);
  return `http://127.0.0.1:${process.env.PORT || "3000"}`;
}

export function internalApiUrl(path: string): string {
  return `${internalApiOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}