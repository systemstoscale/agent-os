import "server-only";

import Stripe from "stripe";

// Stripe is OPTIONAL. The key may be absent at build time and on free-tier
// deploys, so we fall back to a harmless placeholder string at construction
// (the Stripe SDK only validates the key when an API call is actually made).
// This lets every page that imports this module build and run without Stripe;
// real Stripe calls (checkout, webhooks, product seeding) only happen when a
// real STRIPE_SECRET_KEY is configured, and the seed guards on that.
// No explicit apiVersion: use the SDK's pinned default so it never drifts out
// of sync with the installed stripe package's types on a fresh install.
export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || "sk_placeholder_stripe_not_configured"
);

export type CreditPackPrice = {
  packId: string;
  priceId: string;
  productName: string;
  credits: number;
  amountCents: number;
  currency: string;
};

// Lists active one-time prices that carry a credits metadata value, mapping
// each back to its pack id. The webhook and pricing page rely on the same
// metadata.credits stamped by scripts/seed-stripe.ts.
export async function getCreditPackPrices(): Promise<CreditPackPrice[]> {
  const prices = await stripe.prices.list({
    active: true,
    expand: ["data.product"],
  });

  return prices.data
    .filter((p) => p.type === "one_time" && p.metadata.credits)
    .map((p) => {
      const product = typeof p.product === "string" ? null : p.product;
      const productName =
        product && !product.deleted ? product.name : "Credits";
      return {
        packId: p.metadata.packId || "",
        priceId: p.id,
        productName,
        credits: Number.parseInt(p.metadata.credits || "0", 10),
        amountCents: p.unit_amount || 0,
        currency: p.currency,
      };
    })
    .sort((a, b) => a.amountCents - b.amountCents);
}

export async function createTopupCheckoutSession({
  userId,
  userEmail,
  priceId,
}: {
  userId: string;
  userEmail: string;
  priceId: string;
}): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/settings/billing?success=1`,
    cancel_url: `${baseUrl}/settings/billing?canceled=1`,
    customer_email: userEmail,
    client_reference_id: userId,
    metadata: {
      userId,
    },
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session");
  }

  return session.url;
}
