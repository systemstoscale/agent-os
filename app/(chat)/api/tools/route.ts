import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { isAdmin } from "@/lib/auth-utils";
import { createTool, getAllTools } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { createToolSchema } from "./schema";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  if (!isAdmin(session)) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const tools = await getAllTools();
  return Response.json(tools);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  if (!isAdmin(session)) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  try {
    const json = await request.json();
    const input = createToolSchema.parse(json);

    const newTool = await createTool({
      name: input.name,
      description: input.description,
      url: input.url,
      method: input.method,
      headers: input.headers,
      aiParameters: input.aiParameters,
      staticValues: input.staticValues,
      isEnabled: input.isEnabled,
      requiresApproval: input.requiresApproval,
      isGlobal: input.isGlobal,
      timeout: input.timeout,
    });

    revalidatePath("/admin/tools");
    revalidatePath("/admin/agents", "layout");

    return Response.json(newTool, { status: 201 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to create tool:", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }
}
