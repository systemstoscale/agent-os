"use client";

import { Bot } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Agent } from "@/lib/db/schema";
import { generateUUID } from "@/lib/utils";

type AgentsPageClientProps = {
  agents: Agent[];
};

export function AgentsPageClient({ agents }: AgentsPageClientProps) {
  const router = useRouter();

  const handleStartChat = (agentId: string) => {
    const chatId = generateUUID();
    router.push(`/chat/${chatId}?agentId=${agentId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Agents</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Choose an agent to start a conversation
        </p>
      </div>

      {agents.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Bot className="mx-auto size-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">No agents available</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {agents.map((agent) => (
            <div
              className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
              key={agent.id}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="size-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium">{agent.name}</h3>
                {agent.description && (
                  <p className="mt-0.5 text-muted-foreground text-sm line-clamp-1">
                    {agent.description}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  onClick={() => handleStartChat(agent.id)}
                  size="sm"
                  variant="outline"
                >
                  Start Chat
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
