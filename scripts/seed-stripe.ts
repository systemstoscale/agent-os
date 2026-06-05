import { config } from "dotenv";
import Stripe from "stripe";

config({ path: ".env.local" });

// biome-ignore lint: Forbidden non-null assertion.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function seedStripeProducts() {
  console.log("Seeding Stripe products...");

  // Base Plan - $8/month, 100 credits
  const baseProduct = await stripe.products.create({
    name: "Base",
    description: "For individuals getting started",
    metadata: {
      credits_per_month: "100",
      features: "Access to all agents,Email support",
    },
  });

  const basePrice = await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 800,
    currency: "usd",
    recurring: {
      interval: "month",
      trial_period_days: 7,
    },
  });

  await stripe.products.update(baseProduct.id, {
    default_price: basePrice.id,
  });

  console.log(`Created Base product: ${baseProduct.id}`);

  // Plus Plan - $12/month, 500 credits
  const plusProduct = await stripe.products.create({
    name: "Plus",
    description: "For power users who need more",
    metadata: {
      credits_per_month: "500",
      features:
        "Access to all agents,Priority support,Early access to features",
    },
  });

  const plusPrice = await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 1200,
    currency: "usd",
    recurring: {
      interval: "month",
      trial_period_days: 7,
    },
  });

  await stripe.products.update(plusProduct.id, {
    default_price: plusPrice.id,
  });

  console.log(`Created Plus product: ${plusProduct.id}`);

  console.log("Done!");
}

seedStripeProducts().catch(console.error);
