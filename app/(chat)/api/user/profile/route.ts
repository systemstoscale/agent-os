import { auth } from "@/app/(auth)/auth";
import { getUserById, updateUserProfile } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:auth").toResponse();
  }

  const user = await getUserById(session.user.id);

  if (!user) {
    return new ChatSDKError("not_found:api").toResponse();
  }

  return Response.json(
    {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    },
    { status: 200 }
  );
}

export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:auth").toResponse();
  }

  const { fullName }: { fullName?: string } = await request.json();

  const updatedUser = await updateUserProfile({
    id: session.user.id,
    fullName,
  });

  if (!updatedUser) {
    return new ChatSDKError("not_found:api").toResponse();
  }

  return Response.json(
    {
      id: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
    },
    { status: 200 }
  );
}
