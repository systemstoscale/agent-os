import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { isAdmin } from "@/lib/auth-utils";
import {
  deleteAgentFile,
  getAgentById,
  getAgentFileById,
  updateAgentFile,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

const updateFileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const { id: agentId, fileId } = await params;

  const agent = await getAgentById({ id: agentId });
  if (!agent) {
    return new ChatSDKError(
      "not_found:database",
      "Agent not found"
    ).toResponse();
  }

  // Non-admins can only see files for published agents
  if (!isAdmin(session) && !agent.isPublished) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const file = await getAgentFileById({ id: fileId });
  if (!file || file.agentId !== agentId) {
    return new ChatSDKError(
      "not_found:database",
      "File not found"
    ).toResponse();
  }

  return Response.json(file);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  if (!isAdmin(session)) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  try {
    const { id: agentId, fileId } = await params;

    const agent = await getAgentById({ id: agentId });
    if (!agent) {
      return new ChatSDKError(
        "not_found:database",
        "Agent not found"
      ).toResponse();
    }

    const existingFile = await getAgentFileById({ id: fileId });
    if (!existingFile || existingFile.agentId !== agentId) {
      return new ChatSDKError(
        "not_found:database",
        "File not found"
      ).toResponse();
    }

    const json = await request.json();
    const input = updateFileSchema.parse(json);

    const updatedFile = await updateAgentFile({
      id: fileId,
      name: input.name,
      content: input.content,
    });

    return Response.json(updatedFile);
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError("bad_request:api").toResponse();
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  if (!isAdmin(session)) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  try {
    const { id: agentId, fileId } = await params;

    const agent = await getAgentById({ id: agentId });
    if (!agent) {
      return new ChatSDKError(
        "not_found:database",
        "Agent not found"
      ).toResponse();
    }

    const existingFile = await getAgentFileById({ id: fileId });
    if (!existingFile || existingFile.agentId !== agentId) {
      return new ChatSDKError(
        "not_found:database",
        "File not found"
      ).toResponse();
    }

    await deleteAgentFile({ id: fileId });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError("bad_request:api").toResponse();
  }
}
