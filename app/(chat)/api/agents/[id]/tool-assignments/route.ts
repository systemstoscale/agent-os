import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { isAdmin } from "@/lib/auth-utils";
import {
  getAgentById,
  getToolAssignmentsForAgent,
  upsertToolAssignment,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

const createAssignmentSchema = z.object({
  toolId: z.string().uuid(),
  isEnabled: z.boolean(),
});

export async function GET(
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

  const { id: agentId } = await params;

  const agent = await getAgentById({ id: agentId });
  if (!agent) {
    return new ChatSDKError(
      "not_found:database",
      "Agent not found"
    ).toResponse();
  }

  const toolsWithAssignments = await getToolAssignmentsForAgent({ agentId });
  return Response.json(toolsWithAssignments);
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
    const input = createAssignmentSchema.parse(json);

    const assignment = await upsertToolAssignment({
      agentId,
      toolId: input.toolId,
      isEnabled: input.isEnabled,
    });

    return Response.json(assignment, { status: 201 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError("bad_request:api").toResponse();
  }
}
