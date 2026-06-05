import { z } from "zod";

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1).max(100_000),
});

const filePartSchema = z.object({
  type: z.enum(["file"]),
  mediaType: z.string().min(1), // Accept any valid media type (images, text files, etc.)
  filename: z.string().max(255).optional(), // AI SDK uses "filename", not "name"
  url: z.string().min(1), // Data URLs don't pass .url() validation
});

const partSchema = z.union([textPartSchema, filePartSchema]);

const userMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["user"]),
  parts: z.array(partSchema),
});

// For tool approval flows, we accept all messages (more permissive schema)
const messageSchema = z.object({
  id: z.string(),
  role: z.string(),
  parts: z.array(z.any()),
});

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  // Either a single new message or all messages (for tool approvals)
  message: userMessageSchema.optional(),
  messages: z.array(messageSchema).optional(),
  selectedChatModel: z.string(),
  selectedVisibilityType: z.enum(["public", "private"]),
  agentId: z.string().uuid().optional(),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
