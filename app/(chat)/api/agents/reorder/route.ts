import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { isAdmin } from "@/lib/auth-utils";
import { updateAgentOrder } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
});

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
    const { orderedIds } = reorderSchema.parse(json);

    await updateAgentOrder({ orderedIds });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    if (error instanceof z.ZodError) {
      return new ChatSDKError("bad_request:api").toResponse();
    }
    return new ChatSDKError("bad_request:api").toResponse();
  }
}
