import { redirect } from "next/navigation";

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  if (!order) redirect("/account");
  redirect(`/order-success?order=${encodeURIComponent(order)}`);
}
