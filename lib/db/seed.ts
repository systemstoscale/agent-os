import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { genSaltSync, hashSync } from "bcrypt-ts";
import Stripe from "stripe";
import { user, agent, siteConfig } from "./schema";

config({ path: ".env.local" });

function hashPassword(password: string) {
  const salt = genSaltSync(10);
  return hashSync(password, salt);
}

async function createStripeProducts(stripe: Stripe) {
  const existing = await stripe.products.list({ active: true, limit: 100 });
  if (existing.data.length > 0) {
    console.log("⏭️  Stripe products already exist, skipping");
    return;
  }

  console.log("Creating Stripe products and prices...");

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

  console.log(`  Created Base product: ${baseProduct.id}`);

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

  console.log(`  Created Plus product: ${plusProduct.id}`);
}

async function seed() {
  if (!process.env.POSTGRES_URL) {
    console.log("⏭️  POSTGRES_URL not defined, skipping seed");
    process.exit(0);
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  // 1. Create default admin user (if not exists).
  // Override via ADMIN_EMAIL / ADMIN_PASSWORD env vars. Change these after deploy.
  const email = process.env.ADMIN_EMAIL || "name@domain.com";
  const password = process.env.ADMIN_PASSWORD || "@Password0";

  const existingUsers = await db
    .select()
    .from(user)
    .where(eq(user.email, email));

  if (existingUsers.length === 0) {
    console.log("Creating default admin user...");
    await db.insert(user).values({
      email,
      password: hashPassword(password),
      role: "admin",
    });
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
  } else {
    console.log("⏭️  Default admin user already exists, skipping");
  }

  // 2. Create default agent (if none exist)
  const existingAgents = await db.select().from(agent);

  if (existingAgents.length === 0) {
    console.log("Creating default agent...");
    await db.insert(agent).values({
      name: "General Assistant",
      description: "A helpful general-purpose AI assistant.",
      systemPrompt:
        "You are a helpful AI assistant. Answer questions clearly and concisely. Be friendly and professional.",
      suggestions: [
        "What can you help me with?",
        "Tell me about yourself",
        "Help me brainstorm ideas",
      ],
      isPublished: true,
      isDefault: true,
      order: 0,
      documentToolsEnabled: false,
      fileUploadEnabled: false,
    });
    console.log("  Created General Assistant (default)");
  } else {
    console.log("⏭️  Agents already exist, skipping");
  }

  // 3. Set default site name
  await db
    .insert(siteConfig)
    .values({
      key: "siteName",
      value: process.env.NEXT_PUBLIC_APP_NAME || "Agent OS",
    })
    .onConflictDoNothing();

  // 4. Create Stripe products (if Stripe is configured)
  if (process.env.STRIPE_SECRET_KEY) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    await createStripeProducts(stripe);
  } else {
    console.log(
      "⏭️  STRIPE_SECRET_KEY not set, skipping Stripe products"
    );
  }

  await connection.end();
  console.log("✅ Seed completed!");
}

seed()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
