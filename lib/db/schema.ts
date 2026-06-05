import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  integer,
  json,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
  role: varchar("role", { length: 20 }).notNull().default("subscriber"),
  fullName: varchar("fullName", { length: 100 }),
  // Stripe subscription fields
  stripeCustomerId: text("stripeCustomerId").unique(),
  stripeSubscriptionId: text("stripeSubscriptionId").unique(),
  stripeProductId: text("stripeProductId"),
  planName: varchar("planName", { length: 50 }),
  subscriptionStatus: varchar("subscriptionStatus", { length: 20 }),
  creditsLimit: integer("creditsLimit").notNull().default(10),
  billingPeriodStart: timestamp("billingPeriodStart"),
});

export type User = InferSelectModel<typeof user>;

export type UserRole = "subscriber" | "admin";

export const agent = pgTable("Agent", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  systemPrompt: text("systemPrompt").notNull(),
  suggestions: json("suggestions").$type<string[]>().default([]),
  isPublished: boolean("isPublished").notNull().default(false),
  isDefault: boolean("isDefault").notNull().default(false),
  order: integer("order").notNull().default(0),
  documentToolsEnabled: boolean("documentToolsEnabled")
    .notNull()
    .default(false),
  documentToolsPrompt: text("documentToolsPrompt"),
  fileUploadEnabled: boolean("fileUploadEnabled").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type Agent = InferSelectModel<typeof agent>;

export const agentFile = pgTable("AgentFile", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  agentId: uuid("agentId")
    .notNull()
    .references(() => agent.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type AgentFile = InferSelectModel<typeof agentFile>;

export type AgentToolParameter = {
  name: string;
  type: "string" | "number" | "boolean";
  description: string;
  required?: boolean;
};

export const agentTool = pgTable("AgentTool", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  url: text("url").notNull(),
  method: varchar("method", { length: 10 }).notNull().default("POST"),
  headers: json("headers").$type<Record<string, string>>().default({}),
  aiParameters: json("aiParameters").$type<AgentToolParameter[]>().default([]),
  staticValues: json("staticValues")
    .$type<Record<string, string>>()
    .default({}),
  isEnabled: boolean("isEnabled").notNull().default(true),
  requiresApproval: boolean("requiresApproval").notNull().default(true),
  showDetailsToUsers: boolean("showDetailsToUsers").notNull().default(false),
  isGlobal: boolean("isGlobal").notNull().default(false),
  timeout: integer("timeout").notNull().default(30),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type AgentTool = InferSelectModel<typeof agentTool>;

export const agentToolAssignment = pgTable(
  "AgentToolAssignment",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    agentId: uuid("agentId")
      .notNull()
      .references(() => agent.id, { onDelete: "cascade" }),
    toolId: uuid("toolId")
      .notNull()
      .references(() => agentTool.id, { onDelete: "cascade" }),
    isEnabled: boolean("isEnabled").notNull().default(true),
    sortOrder: integer("sortOrder").notNull().default(0),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    uniqueAgentTool: unique().on(table.agentId, table.toolId),
  })
);

export type AgentToolAssignment = InferSelectModel<typeof agentToolAssignment>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  agentId: uuid("agentId").references(() => agent.id),
  isStarred: boolean("isStarred").notNull().default(false),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable("Message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  content: json("content").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  "Vote",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  }
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

export const siteConfig = pgTable("SiteConfig", {
  key: varchar("key", { length: 50 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type SiteConfig = InferSelectModel<typeof siteConfig>;
