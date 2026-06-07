import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { genSaltSync, hashSync } from "bcrypt-ts";
import Stripe from "stripe";
import { CREDIT_PACKS } from "../payments/packs";
import { agent, agentFile, siteConfig, user } from "./schema";

config({ path: ".env.local" });

function hashPassword(password: string) {
  const salt = genSaltSync(10);
  return hashSync(password, salt);
}

async function createStripeProducts(stripe: Stripe) {
  console.log("Creating Stripe credit packs (idempotent)...");
  // Idempotent per pack id. Safe on a Stripe account shared with other
  // products: we only create agent-os packs that don't already exist and
  // never touch unrelated products.
  const existing = await stripe.products.list({ active: true, limit: 100 });

  for (const pack of CREDIT_PACKS) {
    const already = existing.data.find((p) => p.metadata?.packId === pack.id);
    if (already) {
      console.log(`  ⏭️  ${pack.name} already exists, skipping`);
      continue;
    }

    const product = await stripe.products.create({
      name: pack.name,
      description: `${pack.credits} message credits (one-time)`,
      metadata: { packId: pack.id, credits: String(pack.credits) },
    });

    // One-time price (no recurring); metadata.credits is the grant amount the
    // webhook reads on checkout.session.completed.
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: pack.amountCents,
      currency: "usd",
      metadata: { packId: pack.id, credits: String(pack.credits) },
    });

    await stripe.products.update(product.id, { default_price: price.id });
    console.log(`  Created ${pack.name}: ${product.id}`);
  }
}

async function seed() {
  if (!process.env.POSTGRES_URL) {
    console.log("⏭️  POSTGRES_URL not defined, skipping seed");
    process.exit(0);
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  // 1. Upsert the admin user.
  // ADMIN_EMAIL / ADMIN_PASSWORD are the source of truth (there is no in-app
  // password change UI), so the env is the canonical credential store. To
  // ROTATE the admin password: change ADMIN_PASSWORD (and ADMIN_EMAIL) in your
  // environment and redeploy. The password is never logged.
  const PLACEHOLDER_EMAIL = "name@domain.com";
  const email = process.env.ADMIN_EMAIL || PLACEHOLDER_EMAIL;
  const password = process.env.ADMIN_PASSWORD || "@Password0";

  const existingUsers = await db
    .select()
    .from(user)
    .where(eq(user.email, email));

  if (existingUsers.length === 0) {
    console.log(`Creating admin user: ${email}`);
    await db.insert(user).values({
      email,
      password: hashPassword(password),
      role: "admin",
    });
  } else {
    console.log(`Syncing admin password from env: ${email}`);
    await db
      .update(user)
      .set({ password: hashPassword(password), role: "admin" })
      .where(eq(user.email, email));
  }

  // Security: if a real ADMIN_EMAIL was configured, delete the public
  // placeholder admin so the well-known default credentials can never log in.
  if (email !== PLACEHOLDER_EMAIL) {
    await db.delete(user).where(eq(user.email, PLACEHOLDER_EMAIL));
  }

  // 2. Seed agents (only when none exist). If lib/db/seed-agents.json is
  // present, seed those agents and their knowledge files; otherwise create a
  // single generic default agent. The JSON file is private (gitignored) and is
  // only added to private deployments, so public clones get the generic agent.
  const agentsPath = join(process.cwd(), "lib", "db", "seed-agents.json");
  const existingAgents = await db.select().from(agent);

  if (existsSync(agentsPath)) {
    // Private deployment: upsert the real agents by name (idempotent), seed
    // their knowledge files, and remove the generic placeholder if present.
    const defs = JSON.parse(readFileSync(agentsPath, "utf8")) as Array<{
      name: string;
      description?: string;
      systemPrompt: string;
      suggestions?: string[];
      isPublished?: boolean;
      isDefault?: boolean;
      files?: Array<{ name: string; content: string }>;
    }>;

    let order = 0;
    for (const def of defs) {
      const [already] = await db
        .select()
        .from(agent)
        .where(eq(agent.name, def.name))
        .limit(1);
      if (already) {
        console.log(`⏭️  Agent "${def.name}" exists, skipping`);
        order++;
        continue;
      }
      const [created] = await db
        .insert(agent)
        .values({
          name: def.name,
          description: def.description ?? null,
          systemPrompt: def.systemPrompt,
          suggestions: def.suggestions ?? [],
          isPublished: def.isPublished ?? true,
          isDefault: def.isDefault ?? false,
          order: order++,
          documentToolsEnabled: false,
          fileUploadEnabled: false,
        })
        .returning();

      for (const f of def.files ?? []) {
        await db
          .insert(agentFile)
          .values({ agentId: created.id, name: f.name, content: f.content });
      }
      console.log(
        `  Created agent: ${def.name} (${(def.files ?? []).length} files)`
      );
    }

    // Best-effort: drop the generic placeholder so it does not linger next to
    // the real agents. Ignore if it has dependent chats (FK).
    try {
      await db.delete(agent).where(eq(agent.name, "General Assistant"));
    } catch (_e) {
      console.log("  (kept General Assistant; it has dependent rows)");
    }
  } else if (existingAgents.length === 0) {
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
