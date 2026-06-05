import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AgentEditor } from "@/components/agent-editor";
import {
  getAgentById,
  getAgentFilesByAgentId,
  getAllTools,
  getToolAssignmentsForAgent,
} from "@/lib/db/queries";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<EditAgentSkeleton />}>
      <EditAgentPage params={params} />
    </Suspense>
  );
}

function EditAgentSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-5 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

async function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (id === "new") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-semibold text-2xl tracking-tight">
            Create Agent
          </h2>
          <p className="text-muted-foreground">
            Create a new agent with a custom system prompt and suggestions
          </p>
        </div>
        <AgentEditor />
      </div>
    );
  }

  const agent = await getAgentById({ id });

  if (!agent) {
    notFound();
  }

  const files = await getAgentFilesByAgentId({ agentId: id });

  // Fetch all tools and assignments for this agent
  const allTools = await getAllTools();
  const globalTools = allTools.filter((t) => t.isGlobal);
  const toolsWithAssignments = await getToolAssignmentsForAgent({
    agentId: id,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl tracking-tight">Edit Agent</h2>
        <p className="text-muted-foreground">
          Update the agent&apos;s system prompt and settings
        </p>
      </div>
      <AgentEditor
        agent={agent}
        availableTools={toolsWithAssignments}
        globalTools={globalTools}
        initialFiles={files}
      />
    </div>
  );
}
