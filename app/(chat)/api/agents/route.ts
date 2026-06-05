import { revalidatePath } from "next/cache";
import { auth } from "@/app/(auth)/auth";
import { isAdmin } from "@/lib/auth-utils";
import { createAgent, getAgents, getPublishedAgents } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { createAgentSchema } from "./schema";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const { searchParams } = new URL(request.url);
  const publishedOnly = searchParams.get("published") === "true";

  // If publishedOnly is requested, always return only published agents
  // Otherwise, admins see all agents, subscribers see only published agents
  const agents =
    publishedOnly || !isAdmin(session)
      ? await getPublishedAgents()
      : await getAgents();

  return Response.json(agents);
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
    const input = createAgentSchema.parse(json);

    const newAgent = await createAgent({
      name: input.name,
      description: input.description,
      systemPrompt: input.systemPrompt,
      suggestions: input.suggestions,
      isPublished: input.isPublished,
    });

    revalidatePath("/admin/agents");

    return Response.json(newAgent, { status: 201 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError("bad_request:api").toResponse();
  }
}
