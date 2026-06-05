"use client";

import {
  Bot,
  MessagesSquare,
  PanelLeft,
  Pencil,
  PenSquare,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "next-auth";
import { useSession } from "next-auth/react";
import { Suspense } from "react";
import useSWR from "swr";
import { AgentsList } from "@/components/agents-list";
import { SidebarHistory } from "@/components/sidebar-history";
import { SidebarUserNav } from "@/components/sidebar-user-nav";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { Agent } from "@/lib/db/schema";
import { fetcher, generateUUID } from "@/lib/utils";

export function AppSidebar({
  user,
  siteName = process.env.NEXT_PUBLIC_APP_NAME || "Agent OS",
}: {
  user: User | undefined;
  siteName?: string;
}) {
  const { setOpenMobile, toggleSidebar, state } = useSidebar();
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const isCollapsed = state === "collapsed";
  const { data: agents } = useSWR<Agent[]>(
    user ? "/api/agents?published=true" : null,
    fetcher
  );

  const defaultAgent = agents?.find((agent) => agent.isDefault) ?? agents?.[0];

  const handleNewChat = () => {
    if (defaultAgent) {
      const chatId = generateUUID();
      router.push(`/chat/${chatId}?agentId=${defaultAgent.id}`);
      setOpenMobile(false);
    } else {
      router.push("/");
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar className="group-data-[side=left]:border-r-0" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row items-center justify-between">
            <Link
              className="flex flex-row items-center gap-3 group-data-[collapsible=icon]:hidden"
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
            >
              <span className="cursor-pointer rounded-md px-2 font-semibold text-lg hover:bg-muted">
                {siteName}
              </span>
            </Link>
            <button
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
              onClick={toggleSidebar}
              type="button"
            >
              <PanelLeft className="size-4" />
            </button>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {user ? (
          <>
            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleNewChat} tooltip="New chat">
                    <PenSquare className="size-4" />
                    <span className="group-data-[collapsible=icon]:hidden">
                      New chat
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem className="group/agents-menu">
                  <SidebarMenuButton asChild tooltip="Agents">
                    <Link
                      href="/agents"
                      onClick={() => {
                        setOpenMobile(false);
                      }}
                    >
                      <Bot className="size-4" />
                      <span className="group-data-[collapsible=icon]:hidden">
                        Agents
                      </span>
                    </Link>
                  </SidebarMenuButton>
                  {isAdmin && (
                    <Link
                      aria-label="Manage agents"
                      className="absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded opacity-0 transition-opacity hover:bg-muted-foreground/10 group-hover/agents-menu:opacity-100 group-data-[collapsible=icon]:hidden"
                      href="/admin/agents"
                    >
                      <Pencil className="size-3 text-muted-foreground" />
                    </Link>
                  )}
                </SidebarMenuItem>

                <Collapsible
                  className="group/agents group-data-[collapsible=icon]:hidden"
                  defaultOpen
                >
                  <CollapsibleContent>
                    <div className="pl-8">
                      <Suspense
                        fallback={
                          <div className="flex flex-col gap-1">
                            {[1, 2, 3].map((i) => (
                              <div
                                className="h-7 animate-pulse rounded-md bg-muted"
                                key={i}
                              />
                            ))}
                          </div>
                        }
                      >
                        <AgentsList />
                      </Suspense>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Chats">
                    <Link
                      href="/recents"
                      onClick={() => {
                        setOpenMobile(false);
                      }}
                    >
                      <MessagesSquare className="size-4" />
                      <span className="group-data-[collapsible=icon]:hidden">
                        Chats
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup className="flex-1 overflow-y-auto group-data-[collapsible=icon]:hidden">
              <SidebarHistory user={user} />
            </SidebarGroup>
          </>
        ) : (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Sign in to see agents
          </div>
        )}
      </SidebarContent>
      <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
