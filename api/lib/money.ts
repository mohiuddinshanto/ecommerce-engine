const currency = process.env.NEXT_PUBLIC_CURRENCY || process.env.PAYMENT_CURRENCY || "USD";

export function formatMoney(value: number | string | null | undefined): string {
  const amount = Number(value) || 0;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
