import { redirect } from "next/navigation";

// Credit top-ups are granted by the Stripe webhook on
// checkout.session.completed. Checkout success_url now points directly at
// /settings/billing, so this legacy callback just forwards there.
export function GET() {
  redirect("/settings/billing");
}
