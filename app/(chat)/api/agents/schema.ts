import { z } from "zod";

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().min(1),
  suggestions: z.array(z.string()).max(4).default([]),
  isPublished: z.boolean().default(false),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().min(1).optional(),
  suggestions: z.array(z.string()).max(4).optional(),
  isPublished: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  documentToolsEnabled: z.boolean().optional(),
  documentToolsPrompt: z.string().nullable().optional(),
  fileUploadEnabled: z.boolean().optional(),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
