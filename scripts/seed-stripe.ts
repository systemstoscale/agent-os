import { config } from "dotenv";
import Stripe from "stripe";
import { CREDIT_PACKS } from "../lib/payments/packs";

config({ path: ".env.local" });

// biome-ignore lint: Forbidden non-null assertion.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function seedCreditPacks() {
  console.log("Seeding Stripe credit packs...");

  for (const pack of CREDIT_PACKS) {
    const product = await stripe.products.create({
      name: pack.name,
      description: `${pack.credits} message credits (one-time)`,
      metadata: {
        packId: pack.id,
        credits: String(pack.credits),
      },
    });

    // One-time price (no recurring). metadata.credits is the grant amount the
    // webhook reads on checkout.session.completed.
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: pack.amountCents,
      currency: "usd",
      metadata: {
        packId: pack.id,
        credits: String(pack.credits),
      },
    });

    await stripe.products.update(product.id, {
      default_price: price.id,
    });

    console.log(
      `Created ${pack.name}: product ${product.id}, price ${price.id}`
    );
  }

  console.log("Done!");
}

seedCreditPacks().catch(console.error);
