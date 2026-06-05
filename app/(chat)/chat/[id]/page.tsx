import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { auth } from "@/app/(auth)/auth";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import {
  getAgentById,
  getChatById,
  getDefaultAgent,
  getMessagesByChatId,
  getToolVisibilityForAgent,
  getUserById,
} from "@/lib/db/queries";
import { convertToUIMessages, getUserFirstName } from "@/lib/utils";

export default function Page(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ agentId?: string; query?: string }>;
}) {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <ChatPage params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ agentId?: string; query?: string }>;
}) {
  const { id } = await params;
  const { agentId: agentIdParam } = await searchParams;

  const session = await auth();
  const chat = await getChatById({ id });

  // Handle public/shared chats - allow viewing without login
  if (chat && chat.visibility === "public") {
    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = convertToUIMessages(messagesFromDb);

    // Get agent info for the chat
    let agentName: string | undefined;
    let toolVisibility: Record<string, boolean> = {};
    if (chat.agentId) {
      const chatAgent = await getAgentById({ id: chat.agentId });
      agentName = chatAgent?.name;
      toolVisibility = await getToolVisibilityForAgent({
        agentId: chat.agentId,
      });
    }

    const cookieStore = await cookies();
    const chatModelFromCookie = cookieStore.get("chat-model");

    // Determine if current user is the owner
    const isOwner = session?.user?.id === chat.userId;
    const isAdmin = session?.user?.role === "admin";

    return (
      <>
        <Chat
          agentId={chat.agentId ?? undefined}
          agentName={agentName}
          autoResume={false}
          chatTitle={chat.title}
          id={chat.id}
          initialChatModel={chatModelFromCookie?.value || DEFAULT_CHAT_MODEL}
          initialMessages={uiMessages}
          initialVisibilityType={chat.visibility}
          isAdmin={isAdmin}
          isLoggedIn={!!session?.user}
          isReadonly={!isOwner}
          isStarred={chat.isStarred ?? false}
          toolVisibility={toolVisibility}
        />
        <DataStreamHandler />
      </>
    );
  }

  // For non-public chats or new chats, require authentication
  if (!session?.user) {
    redirect("/login");
  }

  const currentUser = await getUserById(session.user.id);
  const userName = currentUser
    ? getUserFirstName(currentUser) || undefined
    : undefined;

  // New chat - chat doesn't exist yet
  if (!chat) {
    let agentId = agentIdParam;
    let agent = agentIdParam ? await getAgentById({ id: agentIdParam }) : null;

    // Use default agent if no agentId provided
    if (!agent) {
      const defaultAgent = await getDefaultAgent();
      if (defaultAgent) {
        agent = defaultAgent;
        agentId = defaultAgent.id;
      }
    }

    if (!agent) {
      redirect("/");
    }

    // Non-admins can only use published agents
    const isAdmin = session.user.role === "admin";
    if (!agent.isPublished && !isAdmin) {
      redirect("/");
    }

    const toolVisibility = await getToolVisibilityForAgent({
      agentId: agent.id,
    });
    const cookieStore = await cookies();
    const chatModelFromCookie = cookieStore.get("chat-model");

    return (
      <>
        <Chat
          agentId={agentId}
          agentName={agent.name}
          agentSuggestions={agent.suggestions ?? undefined}
          autoResume={false}
          chatTitle="New Chat"
          fileUploadEnabled={agent.fileUploadEnabled}
          id={id}
          initialChatModel={chatModelFromCookie?.value || DEFAULT_CHAT_MODEL}
          initialMessages={[]}
          initialVisibilityType="private"
          isAdmin={isAdmin}
          isReadonly={false}
          isStarred={false}
          toolVisibility={toolVisibility}
          userName={userName}
        />
        <DataStreamHandler />
      </>
    );
  }

  // Existing private chat - verify ownership
  if (chat.visibility === "private" && session.user.id !== chat.userId) {
    return notFound();
  }

  const messagesFromDb = await getMessagesByChatId({ id });
  const uiMessages = convertToUIMessages(messagesFromDb);

  // Get agent info for existing chat
  let agentSuggestions: string[] | undefined;
  let agentName: string | undefined;
  let fileUploadEnabled = false;
  let toolVisibility: Record<string, boolean> = {};
  if (chat.agentId) {
    const chatAgent = await getAgentById({ id: chat.agentId });
    agentSuggestions = chatAgent?.suggestions ?? undefined;
    agentName = chatAgent?.name;
    fileUploadEnabled = chatAgent?.fileUploadEnabled ?? false;
    toolVisibility = await getToolVisibilityForAgent({ agentId: chat.agentId });
  }

  const isAdmin = session.user.role === "admin";
  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");

  return (
    <>
      <Chat
        agentId={chat.agentId ?? undefined}
        agentName={agentName}
        agentSuggestions={agentSuggestions}
        autoResume={true}
        chatTitle={chat.title}
        fileUploadEnabled={fileUploadEnabled}
        id={chat.id}
        initialChatModel={chatModelFromCookie?.value || DEFAULT_CHAT_MODEL}
        initialMessages={uiMessages}
        initialVisibilityType={chat.visibility}
        isAdmin={isAdmin}
        isReadonly={session.user.id !== chat.userId}
        isStarred={chat.isStarred ?? false}
        toolVisibility={toolVisibility}
        userName={userName}
      />
      <DataStreamHandler />
    </>
  );
}
