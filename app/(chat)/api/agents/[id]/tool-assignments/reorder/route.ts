import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { isAdmin } from "@/lib/auth-utils";
import { getAgentById, reorderToolAssignments } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

const reorderSchema = z.object({
  orderedToolIds: z.array(z.string().uuid()),
});

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
    const { orderedToolIds } = reorderSchema.parse(json);

    await reorderToolAssignments({ agentId, orderedToolIds });

    return Response.json({ success: true });
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
    console.error("Failed to reorder tool assignments:", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }
}
