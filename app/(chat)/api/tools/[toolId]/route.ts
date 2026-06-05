import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { isAdmin } from "@/lib/auth-utils";
import { deleteTool, getToolById, updateTool } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { updateToolSchema } from "../schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ toolId: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  if (!isAdmin(session)) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const { toolId } = await params;

  const tool = await getToolById({ id: toolId });
  if (!tool) {
    return new ChatSDKError(
      "not_found:database",
      "Tool not found"
    ).toResponse();
  }

  return Response.json(tool);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ toolId: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  if (!isAdmin(session)) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  try {
    const { toolId } = await params;

    const existingTool = await getToolById({ id: toolId });
    if (!existingTool) {
      return new ChatSDKError(
        "not_found:database",
        "Tool not found"
      ).toResponse();
    }

    const json = await request.json();
    const input = updateToolSchema.parse(json);

    const updatedTool = await updateTool({
      id: toolId,
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

    return Response.json(updatedTool);
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
    console.error("Failed to update tool:", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ toolId: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  if (!isAdmin(session)) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  try {
    const { toolId } = await params;

    const existingTool = await getToolById({ id: toolId });
    if (!existingTool) {
      return new ChatSDKError(
        "not_found:database",
        "Tool not found"
      ).toResponse();
    }

    await deleteTool({ id: toolId });

    revalidatePath("/admin/tools");
    revalidatePath("/admin/agents", "layout");

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError("bad_request:api").toResponse();
  }
}
