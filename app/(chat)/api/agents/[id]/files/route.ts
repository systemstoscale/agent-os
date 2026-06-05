import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { isAdmin } from "@/lib/auth-utils";
import {
  createAgentFile,
  getAgentById,
  getAgentFilesByAgentId,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

const createFileSchema = z.object({
  name: z.string().min(1).max(255),
  content: z.string(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const { id: agentId } = await params;

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

  const files = await getAgentFilesByAgentId({ agentId });
  return Response.json(files);
}

export async function POST(
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
    const { id: agentId } = await params;

    const agent = await getAgentById({ id: agentId });
    if (!agent) {
      return new ChatSDKError(
        "not_found:database",
        "Agent not found"
      ).toResponse();
    }

    const json = await request.json();
    const input = createFileSchema.parse(json);

    const newFile = await createAgentFile({
      agentId,
      name: input.name,
      content: input.content,
    });

    return Response.json(newFile, { status: 201 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError("bad_request:api").toResponse();
  }
}
