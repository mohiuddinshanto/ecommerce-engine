export type CourierSettings = {
  steadfast?: { enabled?: boolean; apiKey?: string; secretKey?: string };
  pathao?: { enabled?: boolean; clientId?: string; clientSecret?: string };
  redx?: { enabled?: boolean; apiKey?: string };
};

export function isCourierConfigured(settings?: CourierSettings | null): boolean {
  if (process.env.STEADFAST_API_KEY && process.env.STEADFAST_SECRET_KEY) return true;
  return Boolean(
    (settings?.steadfast?.enabled && settings.steadfast.apiKey && settings.steadfast.secretKey) ||
    (settings?.pathao?.enabled && settings.pathao.clientId && settings.pathao.clientSecret) ||
    (settings?.redx?.enabled && settings.redx.apiKey),
  );
}
