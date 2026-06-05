"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { cloneChat } from "@/app/(chat)/actions";
import { ChatHeader } from "@/components/chat-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useArtifactSelector } from "@/hooks/use-artifact";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import type { Agent, Chat as ChatType, Vote } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import { fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import { Artifact } from "./artifact";
import { useDataStream } from "./data-stream-provider";
import { Greeting } from "./greeting";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { getChatHistoryPaginationKey } from "./sidebar-history";
import { toast } from "./toast";
import type { VisibilityType } from "./visibility-selector";

type AgentChatHistory = {
  chats: ChatType[];
  hasMore: boolean;
};

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  autoResume,
  agentId,
  userName,
  agentSuggestions,
  chatTitle,
  agentName,
  isStarred,
  fileUploadEnabled = false,
  isLoggedIn = false,
  isAdmin = false,
  toolVisibility = {},
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  autoResume: boolean;
  agentId?: string;
  userName?: string;
  agentSuggestions?: string[];
  chatTitle?: string;
  agentName?: string;
  isStarred?: boolean;
  fileUploadEnabled?: boolean;
  isLoggedIn?: boolean;
  isAdmin?: boolean;
  toolVisibility?: Record<string, boolean>;
}) {
  const router = useRouter();

  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      // When user navigates back/forward, refresh to sync with URL
      router.refresh();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [router]);
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>("");
  const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  const handleDeleteChat = async () => {
    setShowDeleteDialog(false);
    await fetch(`/api/chat?id=${id}`, { method: "DELETE" });
    mutate(unstable_serialize(getChatHistoryPaginationKey));
    router.push("/");
    router.refresh();
  };

  const handleCloneChat = useCallback(async () => {
    setIsCloning(true);

    const result = await cloneChat({ chatId: id });

    if (result.success) {
      toast({
        type: "success",
        description: "Chat cloned successfully",
      });
      mutate(unstable_serialize(getChatHistoryPaginationKey));
      router.push(`/chat/${result.newChatId}`);
    } else {
      toast({
        type: "error",
        description: result.error,
      });
    }

    setIsCloning(false);
  }, [id, router, mutate]);
  const [currentModelId, setCurrentModelId] = useState(initialChatModel);
  const currentModelIdRef = useRef(currentModelId);

  // Agent state for new chats - allows changing agent before first message
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(
    agentId ?? null
  );
  const selectedAgentIdRef = useRef(selectedAgentId);

  useEffect(() => {
    selectedAgentIdRef.current = selectedAgentId;
  }, [selectedAgentId]);

  // Fetch agents for the selector (only for new chats)
  const { data: agents = [] } = useSWR<Agent[]>(
    initialMessages.length === 0 ? "/api/agents?published=true" : null,
    fetcher
  );

  // Fetch agent's past chats (only for new chats with an agent)
  const { data: agentHistory, isLoading: isLoadingHistory } =
    useSWR<AgentChatHistory>(
      initialMessages.length === 0 && selectedAgentId
        ? `/api/history?agentId=${selectedAgentId}&limit=10`
        : null,
      fetcher
    );

  // Get selected agent details
  const selectedAgent = selectedAgentId
    ? agents.find((a) => a.id === selectedAgentId)
    : null;
  const currentSuggestions = selectedAgent?.suggestions ?? agentSuggestions;
  // Derive file upload setting: use selected agent's setting if available, otherwise use initial prop
  const currentFileUploadEnabled =
    selectedAgent?.fileUploadEnabled ?? fileUploadEnabled;

  useEffect(() => {
    currentModelIdRef.current = currentModelId;
  }, [currentModelId]);

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
    addToolApprovalResponse,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    generateId: generateUUID,
    sendAutomaticallyWhen: ({ messages: currentMessages }) => {
      const lastMessage = currentMessages.at(-1);
      const shouldContinue =
        lastMessage?.parts?.some(
          (part) =>
            part &&
            "state" in part &&
            part.state === "approval-responded" &&
            "approval" in part &&
            (part.approval as { approved?: boolean })?.approved === true
        ) ?? false;
      return shouldContinue;
    },
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest(request) {
        const lastMessage = request.messages.at(-1);
        const isToolApprovalContinuation =
          lastMessage?.role !== "user" ||
          request.messages.some((msg) =>
            msg.parts?.some((part) => {
              if (!part) {
                return false;
              }
              const state = (part as { state?: string }).state;
              return (
                state === "approval-responded" || state === "output-denied"
              );
            })
          );

        return {
          body: {
            id: request.id,
            ...(isToolApprovalContinuation
              ? { messages: request.messages }
              : { message: lastMessage }),
            selectedChatModel: currentModelIdRef.current,
            selectedVisibilityType: visibilityType,
            agentId: selectedAgentIdRef.current ?? undefined,
            ...request.body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
    },
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        if (
          error.message?.includes("AI Gateway requires a valid credit card")
        ) {
          setShowCreditCardAlert(true);
        } else {
          toast({
            type: "error",
            description: error.message,
          });
        }
      }
    },
  });

  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get("query");

  const hasAppendedQueryRef = useRef(false);

  useEffect(() => {
    if (hasAppendedQueryRef.current) {
      return;
    }

    let initialQuery: string | null = null;
    try {
      initialQuery = sessionStorage.getItem(`chat-query-${id}`);
      if (initialQuery) {
        sessionStorage.removeItem(`chat-query-${id}`);
      }
    } catch {
      // sessionStorage unavailable
    }

    if (!initialQuery && queryFromUrl) {
      initialQuery = queryFromUrl;
    }

    if (initialQuery) {
      hasAppendedQueryRef.current = true;

      if (queryFromUrl) {
        window.history.replaceState({}, "", `/chat/${id}`);
      }

      sendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: initialQuery }],
      });
    }
  }, [queryFromUrl, sendMessage, id]);

  const { data: votes } = useSWR<Vote[]>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher
  );

  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  const isNewChat = messages.length === 0;

  return (
    <>
      <div className="overscroll-behavior-contain relative flex h-dvh min-w-0 touch-pan-y flex-col bg-background">
        {isNewChat ? (
          // New chat view with input above center and optional past chats below
          <div className="flex flex-1 flex-col overflow-auto">
            <div className="mx-auto w-full max-w-content px-4 pt-[20vh]">
              {selectedAgent ? (
                <div className="mb-8 text-center">
                  <h1 className="font-semibold text-2xl">
                    {selectedAgent.name}
                  </h1>
                  {selectedAgent.description && (
                    <p className="mt-2 text-muted-foreground">
                      {selectedAgent.description}
                    </p>
                  )}
                </div>
              ) : (
                <Greeting centered userName={userName} />
              )}
              <div className="mt-8">
                {!isReadonly && (
                  <MultimodalInput
                    agentSuggestions={currentSuggestions}
                    agents={agents}
                    chatId={id}
                    fileUploadEnabled={currentFileUploadEnabled}
                    input={input}
                    messages={messages}
                    onAgentChange={setSelectedAgentId}
                    onModelChange={setCurrentModelId}
                    placeholder="How can I help you today?"
                    selectedAgentId={selectedAgentId}
                    selectedModelId={currentModelId}
                    selectedVisibilityType={visibilityType}
                    sendMessage={sendMessage}
                    setInput={setInput}
                    setMessages={setMessages}
                    showAgentSelector={agents.length > 0}
                    status={status}
                    stop={stop}
                  />
                )}
              </div>

              {/* Agent chat history */}
              {selectedAgentId && (
                <div className="mt-12 pb-8">
                  {isLoadingHistory ? (
                    <div className="space-y-2">
                      <div className="text-muted-foreground text-sm font-medium">
                        Past Chats
                      </div>
                      {[1, 2, 3].map((i) => (
                        <div
                          className="h-16 animate-pulse rounded-lg bg-muted"
                          key={i}
                        />
                      ))}
                    </div>
                  ) : agentHistory && agentHistory.chats.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-muted-foreground text-sm font-medium">
                        Past Chats
                      </div>
                      {agentHistory.chats.map((chat) => (
                        <Link
                          className="block rounded-lg border p-4 transition-colors hover:bg-muted"
                          href={`/chat/${chat.id}`}
                          key={chat.id}
                        >
                          <p className="font-medium">{chat.title}</p>
                          <p className="mt-1 text-muted-foreground text-xs">
                            {new Date(chat.createdAt).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Normal chat view with messages
          <>
            <ChatHeader
              agentId={agentId}
              agentName={agentName}
              chatId={id}
              chatTitle={chatTitle}
              isCloning={isCloning}
              isReadonly={isReadonly}
              isStarred={isStarred}
              onClone={isReadonly && isLoggedIn ? handleCloneChat : undefined}
              onDelete={() => setShowDeleteDialog(true)}
              selectedVisibilityType={visibilityType}
              showLoginToClone={isReadonly && !isLoggedIn}
            />

            <Messages
              addToolApprovalResponse={addToolApprovalResponse}
              chatId={id}
              isAdmin={isAdmin}
              isArtifactVisible={isArtifactVisible}
              isReadonly={isReadonly}
              messages={messages}
              regenerate={regenerate}
              selectedModelId={initialChatModel}
              setMessages={setMessages}
              status={status}
              toolVisibility={toolVisibility}
              userName={userName}
              votes={votes}
            />

            <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-content gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
              {!isReadonly && (
                <MultimodalInput
                  agentSuggestions={agentSuggestions}
                  chatId={id}
                  fileUploadEnabled={currentFileUploadEnabled}
                  input={input}
                  messages={messages}
                  onModelChange={setCurrentModelId}
                  selectedModelId={currentModelId}
                  selectedVisibilityType={visibilityType}
                  sendMessage={sendMessage}
                  setInput={setInput}
                  setMessages={setMessages}
                  status={status}
                  stop={stop}
                />
              )}
            </div>
          </>
        )}
      </div>

      <Artifact
        addToolApprovalResponse={addToolApprovalResponse}
        chatId={id}
        input={input}
        isReadonly={isReadonly}
        messages={messages}
        regenerate={regenerate}
        selectedModelId={currentModelId}
        selectedVisibilityType={visibilityType}
        sendMessage={sendMessage}
        setInput={setInput}
        setMessages={setMessages}
        status={status}
        stop={stop}
        votes={votes}
      />

      <AlertDialog
        onOpenChange={setShowCreditCardAlert}
        open={showCreditCardAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate AI Gateway</AlertDialogTitle>
            <AlertDialogDescription>
              This application requires{" "}
              {process.env.NODE_ENV === "production" ? "the owner" : "you"} to
              activate Vercel AI Gateway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.open(
                  "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card",
                  "_blank"
                );
                window.location.href = "/";
              }}
            >
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this chat and remove it from our
              servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChat}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
