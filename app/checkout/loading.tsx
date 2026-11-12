import { CheckoutSkeleton } from "../../components/skeletons";

export default function CheckoutLoading() {
  return (
    <main className="checkout-page" aria-busy="true" aria-live="polite">
      <CheckoutSkeleton />
    </main>
  );
}
