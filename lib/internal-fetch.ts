import { internalApiUrl } from "./internal-api";

export async function fetchInternalJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(internalApiUrl(path), {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}