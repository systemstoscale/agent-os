import { Suspense } from "react";
import { getAllTools } from "@/lib/db/queries";
import { ToolsManager } from "./global-tools-manager";

async function ToolsContent() {
  const tools = await getAllTools();
  return <ToolsManager initialTools={tools} />;
}

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl tracking-tight">Webhook Tools</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Manage webhook tools that the AI can use to call external APIs. Global
          tools are available in all agents; other tools must be assigned to
          specific agents.
        </p>
      </div>
      <Suspense
        fallback={<div className="text-muted-foreground">Loading tools...</div>}
      >
        <ToolsContent />
      </Suspense>
    </div>
  );
}
