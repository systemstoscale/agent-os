ALTER TABLE "AgentTool" ADD COLUMN "sortOrder" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "AgentToolAssignment" ADD COLUMN "sortOrder" integer DEFAULT 0 NOT NULL;