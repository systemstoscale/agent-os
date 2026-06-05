"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import useSWR from "swr";
import type { Agent } from "@/lib/db/schema";
import { fetcher, generateUUID } from "@/lib/utils";
import { useSidebar } from "./ui/sidebar";

export function AgentsList() {
  const searchParams = useSearchParams();
  const { setOpenMobile } = useSidebar();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const { data: agents, isLoading } = useSWR<Agent[]>(
    "/api/agents?published=true",
    fetcher
  );

  // Get the agentId from URL search params (for new chats)
  const currentAgentIdFromParams = searchParams.get("agentId");

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1">
        {[1, 2, 3].map((i) => (
          <div className="h-7 animate-pulse rounded-md bg-muted" key={i} />
        ))}
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="px-2 py-1.5 text-muted-foreground text-sm">
        No agents available
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {agents.map((agent) => {
        // Agent is active if we're on a new chat page with this agent's ID in search params
        const isActive = currentAgentIdFromParams === agent.id;
        return (
          <AgentListItem
            agent={agent}
            isActive={isActive}
            isAdmin={isAdmin}
            key={agent.id}
            setOpenMobile={setOpenMobile}
          />
        );
      })}
    </div>
  );
}

function AgentListItem({
  agent,
  isActive,
  isAdmin,
  setOpenMobile,
}: {
  agent: Agent;
  isActive: boolean;
  isAdmin: boolean;
  setOpenMobile: (open: boolean) => void;
}) {
  // Generate a new chat ID for this agent link
  const chatId = useMemo(() => generateUUID(), []);

  return (
    <div
      className={`group/agent flex items-center justify-between rounded-md transition-colors hover:bg-muted ${
        isActive ? "bg-muted" : ""
      }`}
    >
      <Link
        className="flex-1 px-2 py-1.5 text-sm"
        href={`/chat/${chatId}?agentId=${agent.id}`}
        onClick={() => setOpenMobile(false)}
      >
        {agent.name}
      </Link>
      {isAdmin && (
        <Link
          aria-label={`Edit ${agent.name}`}
          className="mr-1 flex size-6 items-center justify-center rounded opacity-0 transition-opacity hover:bg-muted-foreground/10 group-hover/agent:opacity-100"
          href={`/admin/agents/${agent.id}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Pencil className="size-3 text-muted-foreground" />
        </Link>
      )}
    </div>
  );
}
