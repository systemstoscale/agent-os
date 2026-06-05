import "server-only";

import Stripe from "stripe";
import { updateUserSubscription } from "@/lib/db/queries";

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

export type StripeProduct = {
  id: string;
  name: string;
  description: string | null;
  creditsPerMonth: number;
  features: string[];
  defaultPriceId: string | null;
};

export type StripePrice = {
  id: string;
  productId: string;
  unitAmount: number | null;
  currency: string;
  interval: string | null;
  trialPeriodDays: number | null;
};

export async function getStripeProducts(): Promise<StripeProduct[]> {
  const products = await stripe.products.list({
    active: true,
    expand: ["data.default_price"],
  });

  return products.data.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    creditsPerMonth: Number.parseInt(p.metadata.credits_per_month || "0", 10),
    features: (p.metadata.features || "").split(",").filter(Boolean),
    defaultPriceId:
      typeof p.default_price === "string"
        ? p.default_price
        : p.default_price?.id || null,
  }));
}

export async function getStripePrices(): Promise<StripePrice[]> {
  const prices = await stripe.prices.list({
    active: true,
    expand: ["data.product"],
  });

  return prices.data.map((p) => ({
    id: p.id,
    productId: typeof p.product === "string" ? p.product : p.product.id,
    unitAmount: p.unit_amount,
    currency: p.currency,
    interval: p.recurring?.interval || null,
    trialPeriodDays: p.recurring?.trial_period_days || null,
  }));
}

export async function createCheckoutSession({
  userId,
  userEmail,
  priceId,
}: {
  userId: string;
  userEmail: string;
  priceId: string;
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/pricing`,
    customer_email: userEmail,
    client_reference_id: userId,
    subscription_data: {
      metadata: {
        userId,
      },
    },
    metadata: {
      userId,
    },
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session");
  }

  return session.url;
}

export async function createCustomerPortalSession(
  stripeCustomerId: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings/billing`,
  });

  return session.url;
}

export async function handleSubscriptionChange(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata.userId;
  if (!userId) {
    console.error("No userId in subscription metadata", subscription.id);
    return;
  }

  const productId =
    typeof subscription.items.data[0]?.price.product === "string"
      ? subscription.items.data[0].price.product
      : subscription.items.data[0]?.price.product.id;

  let creditsLimit = 10;
  let planName = "Free";

  if (productId) {
    const product = await stripe.products.retrieve(productId);
    creditsLimit = Number.parseInt(
      product.metadata.credits_per_month || "10",
      10
    );
    planName = product.name;
  }

  // Determine effective status - Stripe keeps status "active" even when canceling
  const effectiveStatus = subscription.cancel_at_period_end
    ? "canceling"
    : subscription.status;

  // Safely create billing period start date (moved to items in newer Stripe API)
  const currentPeriodStart = subscription.items.data[0]?.current_period_start;
  const billingPeriodStart = currentPeriodStart
    ? new Date(currentPeriodStart * 1000)
    : new Date();

  await updateUserSubscription({
    id: userId,
    stripeCustomerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id,
    stripeSubscriptionId: subscription.id,
    stripeProductId: productId || null,
    planName,
    subscriptionStatus: effectiveStatus,
    creditsLimit,
    billingPeriodStart,
  });
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata.userId;
  if (!userId) {
    console.error("No userId in subscription metadata", subscription.id);
    return;
  }

  const freeCredits = Number.parseInt(
    process.env.FREE_CREDITS_PER_MONTH || "10",
    10
  );

  await updateUserSubscription({
    id: userId,
    stripeSubscriptionId: null,
    stripeProductId: null,
    planName: null,
    subscriptionStatus: "canceled",
    creditsLimit: freeCredits,
    billingPeriodStart: null,
  });
}
