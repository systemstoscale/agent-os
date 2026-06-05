import { auth } from "@/app/(auth)/auth";
import { isAdmin } from "@/lib/auth-utils";
import { getSiteName, updateSiteConfig } from "@/lib/db/queries";

export async function GET() {
  const siteName = await getSiteName();
  return Response.json({ siteName });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user || !isAdmin(session)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { siteName } = body;

  if (!siteName || typeof siteName !== "string") {
    return Response.json({ error: "Site name is required" }, { status: 400 });
  }

  if (siteName.trim().length === 0) {
    return Response.json(
      { error: "Site name cannot be empty" },
      { status: 400 }
    );
  }

  if (siteName.length > 50) {
    return Response.json(
      { error: "Site name must be 50 characters or less" },
      { status: 400 }
    );
  }

  await updateSiteConfig({ key: "siteName", value: siteName.trim() });

  return Response.json({ success: true });
}
