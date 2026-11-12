import Link from "next/link";

export default function CheckoutCancelPage() {
  return <main className="mx-auto max-w-xl px-6 py-20 text-center"><h1 className="text-3xl font-bold">Payment cancelled</h1><p className="mt-4">Your payment was not completed and your cart is still saved. You can try again whenever you are ready.</p><Link className="mt-8 inline-block underline" href="/checkout">Return to checkout</Link></main>;
}
