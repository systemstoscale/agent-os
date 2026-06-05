import { revalidatePath } from "next/cache";
import { auth } from "@/app/(auth)/auth";
import { isAdmin } from "@/lib/auth-utils";
import { deleteAgent, getAgentById, updateAgent } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { updateAgentSchema } from "../schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const { id } = await params;
  const agent = await getAgentById({ id });

  if (!agent) {
    return new ChatSDKError(
      "not_found:database",
      "Agent not found"
    ).toResponse();
  }

  // Non-admins can only see published agents
  if (!isAdmin(session) && !agent.isPublished) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  return Response.json(agent);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  if (!isAdmin(session)) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  try {
    const { id } = await params;

    const json = await request.json();
    const input = updateAgentSchema.parse(json);

    const existingAgent = await getAgentById({ id });
    if (!existingAgent) {
      return new ChatSDKError(
        "not_found:database",
        "Agent not found"
      ).toResponse();
    }

    const updatedAgent = await updateAgent({
      id,
      name: input.name,
      description: input.description,
      systemPrompt: input.systemPrompt,
      suggestions: input.suggestions,
      isPublished: input.isPublished,
      isDefault: input.isDefault,
      documentToolsEnabled: input.documentToolsEnabled,
      documentToolsPrompt: input.documentToolsPrompt,
      fileUploadEnabled: input.fileUploadEnabled,
    });

    revalidatePath("/admin/agents");

    return Response.json(updatedAgent);
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError("bad_request:api").toResponse();
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  if (!isAdmin(session)) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  try {
    const { id } = await params;

    const deleted = await deleteAgent({ id });

    if (!deleted) {
      return new ChatSDKError(
        "not_found:database",
        "Agent not found"
      ).toResponse();
    }

    revalidatePath("/admin/agents");

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError("bad_request:api").toResponse();
  }
}
