# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent OS: an AI agent orchestration platform built on Next.js 16 (App Router) with Vercel AI SDK for multi-provider LLM support, PostgreSQL/Drizzle ORM for persistence, and NextAuth 5 for authentication. Admins create gated AI agents (custom prompts, knowledge files, webhook tools) and monetize access with Stripe credits. Owned and maintained by Skalers. Runs on Bun.

## Commands

```bash
# Development
bun dev                    # Start dev server with Turbo

# Database
bun db:migrate             # Run migrations
bun db:generate            # Generate migration files after schema changes
bun db:studio              # Open Drizzle Studio for database inspection
bun db:push                # Push schema directly (skip migration files)

# Code Quality
bun lint                   # Check with Biome (ultracite rules)
bun format                 # Auto-format with Biome

# Testing
PLAYWRIGHT=True bun test   # Run Playwright E2E tests

# Production
bun build                  # Build (runs migrations first)
bun start                  # Start production server
```

## Architecture

### Route Groups
- `app/(auth)/` - Authentication: login, register, NextAuth API routes, server actions
- `app/(chat)/` - Chat interface: main chat page, individual chat routes, API routes for streaming, history, voting, documents, file uploads
- `app/(admin)/` - Admin dashboard: agent management with CRUD, ordering, and role-based access control (protected by `isAdmin()` check in layout)

### Core Libraries (`lib/`)
- `lib/ai/` - AI SDK integration: model configs, providers (gateway), system prompts, entitlements (rate limits), and tools
- `lib/db/` - Drizzle ORM: schema definitions, queries, migrations, utilities
- `lib/artifacts/` - Artifact handling for documents created by AI
- `lib/auth-utils.ts` - Authorization utilities including `isAdmin()` for role-based access

### AI Provider System (`lib/ai/`)
- `models.ts` - Model catalog with `chatModels[]` array and `DEFAULT_CHAT_MODEL`
- `providers.ts` - `getLanguageModel(modelId)`, `getTitleModel()`, `getArtifactModel()` functions; reasoning models wrapped with `extractReasoningMiddleware()`
- `prompts.ts` - System prompt builder combining: base prompt, agent files, geolocation, artifacts guide
- `entitlements.ts` - Rate limits by role (subscriber: 50/day, admin: 1000/day)

### Agent System
Agents are customizable chat personas with:
- Custom system prompts and conversation starter suggestions
- Attachable reference files (`AgentFile` table)
- Draft/published workflow with ordering
- Dual interfaces: user-facing browse (`/agents`) and admin CRUD (`/admin/agents`)

### AI Tools (`lib/ai/tools/`)
Tools available to the AI during conversations:
- `create-document.ts` - Create new artifacts (code, text, image, sheet)
- `update-document.ts` - Modify existing artifacts
- `request-suggestions.ts` - Get AI editing suggestions
- `get-weather.ts` - Weather information

### Key Patterns

**Server Actions:** Located in `app/(auth)/actions.ts` and `app/(chat)/actions.ts` - use `"use server"` directive for database operations and sensitive logic.

**Streaming Chat:** Main endpoint at `app/(chat)/api/chat/route.ts` uses `streamText()` with `createUIMessageStream()` for real-time responses. Supports resumable streams via Redis. Reasoning models (with `-thinking` suffix) use `extractReasoningMiddleware()` and thinking budgets.

**Document Artifacts:** Documents use composite keys (id + createdAt) for versioning. Kinds: `text`, `code`, `image`, `sheet`.

**User Entitlements:** Rate limiting in `lib/ai/entitlements.ts` - subscriber: 50 messages/day, admin: 1000 messages/day.

### Database Schema (`lib/db/schema.ts`)
Key tables: User, Chat, Message_v2, Vote_v2, Document, Suggestion, Stream, Agent, AgentFile

### UI Components
- `components/ui/` - shadcn/ui primitives (Radix-based)
- `components/ai-elements/` - AI response element rendering
- `components/artifact.tsx` - Main artifact display
- `components/chat.tsx` - Chat interface
- `components/code-editor.tsx` - CodeMirror-based editor

## Testing

E2E tests use Playwright in `tests/e2e/`. Test environment is detected via `isTestEnvironment` constant (`lib/constants.ts`) which triggers mocked AI models from `models.mock.ts`.

```bash
# Run specific test file
PLAYWRIGHT=True bunx playwright test tests/e2e/auth.test.ts

# Run with UI mode for debugging
PLAYWRIGHT=True bunx playwright test --ui
```

## Code Style

This project uses Ultracite rules via Biome. Key conventions from `.cursor/rules/ultracite.mdc`:
- Prefer `type` over `interface` for TypeScript
- Use named exports, not default exports
- Functional components with arrow functions
- Early returns for cleaner logic flow
- All interactive elements require accessibility attributes (aria-label, role, keyboard handlers)

## Environment Variables

Required (see `.env.example`):
- `AUTH_SECRET` - NextAuth secret
- `AI_GATEWAY_API_KEY` - Vercel AI Gateway key
- `POSTGRES_URL` - PostgreSQL connection string
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob for file uploads
- `REDIS_URL` - Optional, for stream resumption
