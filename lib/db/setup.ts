import { exec } from "node:child_process";
import { promises as fs } from "node:fs";
import { promisify } from "node:util";
import readline from "node:readline";
import crypto from "node:crypto";
import path from "node:path";

const execAsync = promisify(exec);

function question(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function checkStripeCLI() {
  console.log("Step 1: Checking Stripe CLI...");
  try {
    await execAsync("stripe --version");
    console.log("  Stripe CLI is installed.");

    try {
      await execAsync("stripe config --list");
      console.log("  Stripe CLI is authenticated.");
    } catch {
      console.log("  Stripe CLI is not authenticated.");
      console.log("  Please run: stripe login");
      const answer = await question(
        "  Have you completed authentication? (y/n): "
      );
      if (answer.toLowerCase() !== "y") {
        console.log("  Please authenticate and run this script again.");
        process.exit(1);
      }

      try {
        await execAsync("stripe config --list");
        console.log("  Stripe CLI authentication confirmed.");
      } catch {
        console.error("  Failed to verify Stripe CLI authentication.");
        process.exit(1);
      }
    }
  } catch {
    console.error("  Stripe CLI is not installed.");
    console.log("  Install it from: https://docs.stripe.com/stripe-cli");
    console.log("  Then run: stripe login");
    console.log("  After that, run this setup script again.");
    process.exit(1);
  }
}

async function getPostgresURL(): Promise<string> {
  console.log("\nStep 2: Setting up Postgres...");
  const dbChoice = await question(
    "  Use local Postgres with Docker (L) or remote Postgres URL (R)? (L/R): "
  );

  if (dbChoice.toLowerCase() === "l") {
    console.log("  Setting up local Postgres with Docker...");
    await setupLocalPostgres();
    return "postgres://postgres:postgres@localhost:54322/postgres";
  }

  console.log(
    "  You can find Postgres databases at: https://vercel.com/marketplace?category=databases"
  );
  return await question("  Enter your POSTGRES_URL: ");
}

async function setupLocalPostgres() {
  try {
    await execAsync("docker --version");
    console.log("  Docker is installed.");
  } catch {
    console.error("  Docker is not installed.");
    console.log("  Install from: https://docs.docker.com/get-docker/");
    process.exit(1);
  }

  const dockerComposeContent = `
services:
  postgres:
    image: postgres:16.4-alpine
    container_name: ai_chatbot_postgres
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "54322:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
`;

  await fs.writeFile(
    path.join(process.cwd(), "docker-compose.yml"),
    dockerComposeContent
  );
  console.log("  Created docker-compose.yml");

  try {
    await execAsync("docker compose up -d");
    console.log("  Docker container started.");
  } catch {
    console.error("  Failed to start Docker container.");
    process.exit(1);
  }
}

async function getStripeSecretKey(): Promise<string> {
  console.log("\nStep 3: Stripe Secret Key...");
  console.log(
    "  Find it at: https://dashboard.stripe.com/test/apikeys"
  );
  return await question("  Enter your Stripe Secret Key: ");
}

async function getStripePublishableKey(): Promise<string> {
  console.log("\nStep 4: Stripe Publishable Key...");
  console.log(
    "  Find it at: https://dashboard.stripe.com/test/apikeys"
  );
  return await question("  Enter your Stripe Publishable Key: ");
}

async function createStripeWebhook(): Promise<string> {
  console.log("\nStep 5: Creating Stripe webhook...");
  try {
    const { stdout } = await execAsync("stripe listen --print-secret");
    const match = stdout.match(/whsec_[a-zA-Z0-9]+/);
    if (!match) {
      throw new Error("Failed to extract webhook secret");
    }
    console.log("  Stripe webhook created.");
    return match[0];
  } catch {
    console.log("  Could not auto-create webhook.");
    const secret = await question(
      "  Enter your STRIPE_WEBHOOK_SECRET manually (or press Enter to skip): "
    );
    return secret || "whsec_placeholder";
  }
}

function generateAuthSecret(): string {
  console.log("\nStep 6: Generating AUTH_SECRET...");
  const secret = crypto.randomBytes(32).toString("hex");
  console.log("  Generated.");
  return secret;
}

async function writeEnvFile(envVars: Record<string, string>) {
  console.log("\nStep 7: Writing .env.local...");
  const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  await fs.writeFile(path.join(process.cwd(), ".env.local"), envContent);
  console.log("  .env.local created.");
}

async function main() {
  console.log("Agent OS Setup\n");

  await checkStripeCLI();

  const POSTGRES_URL = await getPostgresURL();
  const STRIPE_SECRET_KEY = await getStripeSecretKey();
  const NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = await getStripePublishableKey();
  const STRIPE_WEBHOOK_SECRET = await createStripeWebhook();
  const AUTH_SECRET = generateAuthSecret();

  const freeCredits = await question(
    "\nFree credits per month (default 10): "
  );
  const FREE_CREDITS_PER_MONTH = freeCredits || "10";

  await writeEnvFile({
    AUTH_SECRET,
    POSTGRES_URL,
    STRIPE_SECRET_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_WEBHOOK_SECRET,
    FREE_CREDITS_PER_MONTH,
  });

  console.log("\nSetup complete! Next steps:");
  console.log("  bun db:migrate    # Create database tables");
  console.log("  bun db:seed       # Seed admin user, default agent, and Stripe products");
  console.log("  bun dev           # Start development server");
}

main().catch(console.error);
