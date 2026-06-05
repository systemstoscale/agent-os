import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { getAgents } from "@/lib/db/queries";
import { SortableAgentsList } from "./sortable-agents-list";

export default function Page() {
  return (
    <Suspense fallback={<AgentsPageSkeleton />}>
      <AgentsPage />
    </Suspense>
  );
}

function AgentsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-5 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <div className="h-40 animate-pulse rounded-lg bg-muted" key={i} />
        ))}
      </div>
    </div>
  );
}

async function AgentsPage() {
  noStore();
  const agents = await getAgents();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-2xl tracking-tight">Agents</h2>
          <p className="text-muted-foreground">
            Manage agents that define system prompts and conversation starters.
            Drag to reorder.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/agents/new">Create Agent</Link>
        </Button>
      </div>

      <SortableAgentsList initialAgents={agents} />
    </div>
  );
}
