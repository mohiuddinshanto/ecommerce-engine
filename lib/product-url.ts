export function productUrl(slug: string, name?: string, id?: string): string {
  let decodedSlug = slug;
  try { decodedSlug = decodeURIComponent(slug); } catch {}
  if (/[\u0980-\u09ff]/u.test(decodedSlug) && name?.trim() && id) {
    return `/products/${encodeURIComponent(name.trim())}?productId=${encodeURIComponent(id)}`;
  }
  return `/products/${encodeURIComponent(slug)}`;
}
