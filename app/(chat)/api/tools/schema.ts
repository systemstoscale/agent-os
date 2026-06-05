import { z } from "zod";

const aiParameterSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["string", "number", "boolean"]),
  description: z.string().max(500).default(""),
  required: z.boolean().optional(),
});

export const createToolSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
  url: z.string().url(),
  method: z.enum(["GET", "POST"]).optional().default("POST"),
  headers: z.record(z.string()).optional().default({}),
  aiParameters: z.array(aiParameterSchema).optional().default([]),
  staticValues: z.record(z.string()).optional().default({}),
  isEnabled: z.boolean().optional().default(true),
  requiresApproval: z.boolean().optional().default(true),
  showDetailsToUsers: z.boolean().optional().default(false),
  isGlobal: z.boolean().optional().default(false),
  timeout: z.number().min(1).max(600).optional().default(30),
});

export const updateToolSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(2000).optional(),
  url: z.string().url().optional(),
  method: z.enum(["GET", "POST"]).optional(),
  headers: z.record(z.string()).optional(),
  aiParameters: z.array(aiParameterSchema).optional(),
  staticValues: z.record(z.string()).optional(),
  isEnabled: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  showDetailsToUsers: z.boolean().optional(),
  isGlobal: z.boolean().optional(),
  timeout: z.number().min(1).max(600).optional(),
});

export type CreateToolInput = z.infer<typeof createToolSchema>;
export type UpdateToolInput = z.infer<typeof updateToolSchema>;
