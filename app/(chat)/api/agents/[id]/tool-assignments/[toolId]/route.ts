import { auth } from "@/app/(auth)/auth";
import { isAdmin } from "@/lib/auth-utils";
import { deleteToolAssignment, getAgentById } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; toolId: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  if (!isAdmin(session)) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  try {
    const { id: agentId, toolId } = await params;

    const agent = await getAgentById({ id: agentId });
    if (!agent) {
      return new ChatSDKError(
        "not_found:database",
        "Agent not found"
      ).toResponse();
    }

    await deleteToolAssignment({ agentId, toolId });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError("bad_request:api").toResponse();
  }
}
