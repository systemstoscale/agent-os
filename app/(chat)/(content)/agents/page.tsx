import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { getPublishedAgents } from "@/lib/db/queries";
import { AgentsPageClient } from "./agents-page-client";

export default async function AgentsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const agents = await getPublishedAgents();

  return <AgentsPageClient agents={agents} />;
}
