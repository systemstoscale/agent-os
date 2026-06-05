"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import type { Agent, Chat } from "@/lib/db/schema";
import { fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import { Suggestion } from "./elements/suggestion";
import { MultimodalInput } from "./multimodal-input";
import { Button } from "./ui/button";

type AgentViewProps = {
  agent: Agent;
  initialModelId: string;
};

type ChatHistoryResponse = {
  chats: Chat[];
  hasMore: boolean;
};

export function AgentView({ agent, initialModelId }: AgentViewProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [selectedModelId, setSelectedModelId] = useState(initialModelId);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(
    agent.id
  );

  // Generate a stable chatId for this session
  const chatId = useMemo(() => generateUUID(), []);

  // Use refs to get current values in transport callback
  const selectedModelIdRef = useRef(selectedModelId);
  const selectedAgentIdRef = useRef(selectedAgentId);

  useEffect(() => {
    selectedModelIdRef.current = selectedModelId;
  }, [selectedModelId]);

  useEffect(() => {
    selectedAgentIdRef.current = selectedAgentId;
  }, [selectedAgentId]);

  // Use chat hook to send the first message
  const { sendMessage: originalSendMessage, status } = useChat({
    id: chatId,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest(request) {
        const lastMessage = request.messages.at(-1);
        return {
          body: {
            id: request.id,
            message: lastMessage,
            selectedChatModel: selectedModelIdRef.current,
            selectedVisibilityType: "private",
            agentId: selectedAgentIdRef.current ?? undefined,
          },
        };
      },
    }),
  });

  // Wrap sendMessage to navigate immediately after sending
  const sendMessage: typeof originalSendMessage = useCallback(
    async (message, options) => {
      const promise = originalSendMessage(message, options);
      // Navigate immediately - don't wait for response
      router.push(`/chat/${chatId}`);
      return promise;
    },
    [originalSendMessage, router, chatId]
  );

  // Fetch all published agents for the selector
  const { data: agents = [] } = useSWR<Agent[]>(
    "/api/agents?published=true",
    fetcher
  );

  const getKey = (
    pageIndex: number,
    previousPageData: ChatHistoryResponse | null
  ) => {
    if (previousPageData && !previousPageData.hasMore) {
      return null;
    }
    if (pageIndex === 0) {
      return `/api/history?agentId=${agent.id}&limit=20`;
    }
    const lastChat = previousPageData?.chats.at(-1);
    return `/api/history?agentId=${agent.id}&limit=20&ending_before=${lastChat?.id}`;
  };

  const { data, isLoading, size, setSize } =
    useSWRInfinite<ChatHistoryResponse>(getKey, fetcher);

  const chats = data?.flatMap((page) => page.chats) ?? [];
  const hasMore = data?.[data.length - 1]?.hasMore ?? false;

  // Handle suggestion clicks - send message via API
  const handleSuggestionClick = (suggestion: string) => {
    sendMessage({
      role: "user",
      parts: [{ type: "text", text: suggestion }],
    });
  };

  return (
    <div className="relative flex h-dvh flex-col">
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-content px-4 py-6">
          {/* Agent Header */}
          <div className="mb-6">
            <h1 className="font-semibold text-xl">{agent.name}</h1>
            {agent.description && (
              <p className="mt-1 text-muted-foreground text-sm">
                {agent.description}
              </p>
            )}
          </div>

          {/* Chat Input */}
          <div className="mb-8">
            {agent.suggestions && agent.suggestions.length > 0 && (
              <div
                className="mb-4 grid w-full gap-2 sm:grid-cols-2"
                data-testid="suggested-actions"
              >
                {agent.suggestions.slice(0, 4).map((suggestion, index) => (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    initial={{ opacity: 0, y: 20 }}
                    key={suggestion}
                    transition={{ delay: 0.05 * index }}
                  >
                    <Suggestion
                      className="h-auto w-full whitespace-normal p-3 text-left"
                      onClick={(s) => handleSuggestionClick(s)}
                      suggestion={suggestion}
                    >
                      {suggestion}
                    </Suggestion>
                  </motion.div>
                ))}
              </div>
            )}
            <MultimodalInput
              agents={agents}
              chatId={chatId}
              input={input}
              onAgentChange={setSelectedAgentId}
              onModelChange={setSelectedModelId}
              placeholder={`Message ${agent.name}...`}
              selectedAgentId={selectedAgentId}
              selectedModelId={selectedModelId}
              sendMessage={sendMessage}
              setInput={setInput}
              showAgentSelector={agents.length > 0}
              status={status}
            />
          </div>

          {/* Chat History */}
          <div>
            <h2 className="mb-4 font-medium text-lg">Chats</h2>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    className="h-16 animate-pulse rounded-lg bg-muted"
                    key={i}
                  />
                ))}
              </div>
            ) : chats.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">
                  No chats yet. Start a conversation above!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {chats.map((chat) => (
                  <Link
                    className="block rounded-lg border p-4 transition-colors hover:bg-muted"
                    href={`/chat/${chat.id}`}
                    key={chat.id}
                  >
                    <p className="font-medium">{chat.title}</p>
                    <p className="mt-1 text-muted-foreground text-xs">
                      {new Date(chat.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </Link>
                ))}

                {hasMore && (
                  <Button
                    className="w-full"
                    onClick={() => setSize(size + 1)}
                    variant="outline"
                  >
                    Load more
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
