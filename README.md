# Agent OS

**Build, gate, and monetize your own AI agents.** Replace your custom GPTs with a branded platform: create unlimited AI agents (custom prompts, knowledge files, webhook tools) through an admin UI, gate access behind Stripe subscriptions with a built-in credit system, and let your users chat with them.

Runs on **Bun**. One-click deploy to **Vercel**. Built by [Skalers](https://skalers.io).

---

## Table of Contents

1. [Deploy to Vercel (One-Click)](#1-deploy-to-vercel-one-click)
2. [Log In](#2-log-in)
3. [Create Your First Agent](#3-create-your-first-agent)
4. [Set Up Billing with Stripe](#4-set-up-billing-with-stripe-optional)
5. [Customize Your Branding](#5-customize-your-branding)
6. [Environment Variables (Full Reference)](#environment-variables-full-reference)
7. [Running Locally](#running-locally)
8. [Troubleshooting](#troubleshooting)
9. [What's Inside](#whats-inside)

---

## 1. Deploy to Vercel (One-Click)

Click the button to deploy your own instance. Vercel automatically provisions **Postgres, Blob Storage, and Redis**, and uses its **AI Gateway** for model access.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsystemstoscale%2Fagent-os&env=AUTH_SECRET&envDescription=A%2032-byte%20random%20secret%20for%20session%20encryption.&envLink=https%3A%2F%2Fgenerate-secret.vercel.app%2F32&project-name=agent-os&stores=%5B%7B%22type%22%3A%22postgres%22%7D%2C%7B%22type%22%3A%22blob%22%7D%2C%7B%22type%22%3A%22kv%22%7D%5D)

During deploy you'll be prompted for **one value**:

- **`AUTH_SECRET`** — a random secret used to encrypt sessions. Generate it by running this in your terminal:
  ```bash
  openssl rand -base64 32
  ```
  (or use [generate-secret.vercel.app/32](https://generate-secret.vercel.app/32)).

**The build does the rest automatically:**
- Creates all database tables (migrations)
- Seeds an **admin user**
- Seeds a **default agent** so the app works immediately
- Creates your **Stripe products** (only if you add Stripe keys — see step 4)

Wait for the build to finish (about 2 minutes). Your app is now live at `https://YOUR-APP.vercel.app`.

---

## 2. Log In

Go to your deployed app and sign in with the default admin account:

- **Email:** `name@domain.com`
- **Password:** `@Password0`

This account has **full admin access**.

> **Change this immediately.** Either update the password in **Settings** after logging in, or set your own credentials *before* deploying by adding `ADMIN_EMAIL` and `ADMIN_PASSWORD` as environment variables (see the reference table below).

---

## 3. Create Your First Agent

As an admin, go to **`/admin/agents`** and click **New Agent**. Each agent has:

- **Name + description** — what your users see when they pick an agent
- **System prompt** — the agent's instructions, personality, and rules
- **Conversation starters** — up to 4 suggested prompts shown to users
- **Knowledge files** — markdown documents that get injected into the agent's context (your frameworks, docs, examples)
- **Webhook tools** (optional) — connect the agent to external APIs via `/admin/tools`
- **Publish toggle** — published agents appear at `/agents` for your users
- **Default toggle** — the agent that loads on a fresh chat

Click **Publish**, then visit `/agents` to chat with it. That's the whole loop: no code required.

---

## 4. Set Up Billing with Stripe (Optional)

Agent OS works out of the box on a **free credit tier** (`FREE_CREDITS_PER_MONTH`, default 10 messages/month). To charge for access, connect Stripe. This takes about 5 minutes.

### Step 4.1 — Add your Stripe API keys

1. Get your keys from [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys).
2. In your **Vercel project → Settings → Environment Variables**, add:
   - `STRIPE_SECRET_KEY` — starts with `sk_live_` (or `sk_test_` for test mode)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — starts with `pk_live_` (or `pk_test_`)

### Step 4.2 — Create the webhook

1. Go to [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint**.
2. **Endpoint URL:**
   ```
   https://YOUR-APP.vercel.app/api/stripe/webhook
   ```
3. **Select these events:**
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Click **Add endpoint**, then copy the **Signing secret** (starts with `whsec_`).

### Step 4.3 — Add the webhook secret + redeploy

1. Back in **Vercel → Settings → Environment Variables**, add:
   - `STRIPE_WEBHOOK_SECRET` = the `whsec_...` value from step 4.2
   - `FREE_CREDITS_PER_MONTH` = `10` (or whatever you want the free tier to be)
2. **Redeploy** your app (Vercel → Deployments → ... → Redeploy) so it picks up the new variables.

On that redeploy, your **Stripe products are created automatically**:

| Plan | Price | Credits / month |
|------|-------|-----------------|
| Base | $8/mo (7-day trial) | 100 |
| Plus | $12/mo (7-day trial) | 500 |

(Edit prices/credits in `scripts/seed-stripe.ts` and re-run before going live if you want different tiers.)

Your `/pricing` page now shows these plans, checkout works, and the webhook keeps each user's credits in sync with their subscription.

---

## 5. Customize Your Branding

- **App name:** set `NEXT_PUBLIC_APP_NAME` (e.g. your business name). It appears across the UI and metadata. You can also edit the site name live from **`/admin/settings`**.
- **App URL:** set `NEXT_PUBLIC_APP_URL` to your final domain (used for Stripe checkout redirects + link previews).
- **Custom domain:** in Vercel → Settings → Domains, add your domain and follow the DNS instructions.

---

## Environment Variables (Full Reference)

| Variable | Required? | Set by | Purpose |
|----------|-----------|--------|---------|
| `AUTH_SECRET` | **Yes** | You (prompted at deploy) | Session encryption. Generate with `openssl rand -base64 32`. |
| `POSTGRES_URL` | Yes | Auto (Vercel Postgres) | Database connection. |
| `BLOB_READ_WRITE_TOKEN` | Yes | Auto (Vercel Blob) | File uploads / knowledge files. |
| `REDIS_URL` | No | Auto (Vercel KV/Redis) | Resumable chat streams. |
| `AI_GATEWAY_API_KEY` | No | Auto (Vercel OIDC) | Model access. Only needed for non-Vercel hosting. |
| `NEXT_PUBLIC_APP_NAME` | No | You | Your brand name. Defaults to "Agent OS". |
| `NEXT_PUBLIC_APP_URL` | No | You | Public URL for redirects + metadata. |
| `ADMIN_EMAIL` | No | You | Seed your own admin email. Defaults to `name@domain.com`. |
| `ADMIN_PASSWORD` | No | You | Seed your own admin password. Defaults to `@Password0`. |
| `STRIPE_SECRET_KEY` | No | You | Enables billing. Without it, app runs on the free credit tier. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | You | Required if `STRIPE_SECRET_KEY` is set. |
| `STRIPE_WEBHOOK_SECRET` | No | You | Required for subscriptions to sync credits. |
| `FREE_CREDITS_PER_MONTH` | No | You | Free-tier messages/month. Defaults to 10. |

---

## Running Locally

You'll need [Bun](https://bun.sh) and a Postgres database (the setup script can spin up a local one with Docker).

```bash
bun install
bun db:setup        # interactive: configures Postgres + writes .env.local
bun db:migrate      # create database tables
bun db:seed         # seed admin user, default agent, and Stripe products
bun dev             # start the dev server at http://localhost:3000
```

### Receive Stripe webhooks locally

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Other useful commands

```bash
bun db:generate     # generate a migration after changing lib/db/schema.ts
bun db:studio       # open Drizzle Studio to inspect the database
bun lint            # check code with Biome
bun build           # production build (runs migrations + seed first)
```

---

## Troubleshooting

- **App loads but chat/login 500s** → the database tables weren't created. Trigger a redeploy (the build runs migrations), or run `bun db:migrate` against your database.
- **"Stripe is not configured" / billing disabled** → you haven't set `STRIPE_SECRET_KEY`. The app intentionally runs on the free tier until you add Stripe (step 4).
- **Subscriptions don't update credits** → `STRIPE_WEBHOOK_SECRET` is missing or the webhook URL/events are wrong. Recheck step 4.2 and redeploy.
- **AI replies fail** → on Vercel, the AI Gateway is automatic; your Vercel team may need a payment method on file to unlock AI credits. On other hosts, set `AI_GATEWAY_API_KEY`.
- **Can't access `/admin`** → you're not signed in as the admin user. Log in with your admin credentials (step 2).

---

## What's Inside

- **Multi-agent admin** — create / edit / reorder / publish agents, each with a system prompt, conversation starters, knowledge files, and webhook tools (`/admin/agents`, `/admin/tools`).
- **User management** — registration, login (NextAuth 5), profiles, role-based access (admin vs subscriber).
- **Billing + credits** — Stripe subscriptions (Base / Plus), per-period credit metering, free tier, and usage gating before each message.
- **Chat** — agent picker, streaming responses, history, voting, and artifacts (code / text / image / sheet) with versioning.
- **Site configuration** — admin-editable site name and branding.

**Stack:** Next.js 16 (App Router) · Vercel AI SDK · PostgreSQL + Drizzle ORM · NextAuth 5 · Stripe · Bun.

---

## Want this installed and customized for your business?

If you'd rather have us install this inside your business — your agents, your branding, your domain, your Stripe, fully done-for-you — book an **AI Systems call at [skalers.io](https://skalers.io)**.

Skalers has installed AI systems inside Russ Ruffino ($100M), Brian Moncada ($350K/mo), Mike Rama ($250K/mo), and 10+ other 7-figure businesses. This repo is what we install.

---

## License

Provided as-is by Skalers, for you to deploy, customize, and run. Built on the Next.js + Vercel AI SDK ecosystem.
