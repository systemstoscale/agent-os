"use client";

import { formatDistanceToNow } from "date-fns";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWRInfinite from "swr/infinite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Chat } from "@/lib/db/schema";
import { fetcher, generateUUID } from "@/lib/utils";

type ChatHistoryResponse = {
  chats: Chat[];
  hasMore: boolean;
};

export function RecentsView() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const getKey = (
    pageIndex: number,
    previousPageData: ChatHistoryResponse | null
  ) => {
    if (previousPageData && !previousPageData.hasMore) {
      return null;
    }
    if (pageIndex === 0) {
      return "/api/history?limit=50";
    }
    const lastChat = previousPageData?.chats.at(-1);
    return `/api/history?limit=50&ending_before=${lastChat?.id}`;
  };

  const { data, isLoading, size, setSize } =
    useSWRInfinite<ChatHistoryResponse>(getKey, fetcher);

  const chats = data?.flatMap((page) => page.chats) ?? [];
  const hasMore = data?.[data.length - 1]?.hasMore ?? false;

  // Filter chats by search query
  const filteredChats = searchQuery
    ? chats.filter((chat) =>
        chat.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chats;

  const handleNewChat = () => {
    const chatId = generateUUID();
    router.push(`/chat/${chatId}`);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-xl">Chats</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Your recent conversations
          </p>
        </div>
        <Button onClick={handleNewChat}>
          <Plus className="mr-2 size-4" />
          New chat
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search your chats..."
          value={searchQuery}
        />
      </div>

      {/* Chat Count */}
      {!isLoading && chats.length > 0 && (
        <p className="mb-4 text-muted-foreground text-sm">
          {filteredChats.length} {filteredChats.length === 1 ? "chat" : "chats"}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      )}

      {/* Chat List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div className="h-16 animate-pulse rounded-lg bg-muted" key={i} />
          ))}
        </div>
      ) : filteredChats.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            {searchQuery
              ? "No chats match your search"
              : "No chats yet. Start a conversation above!"}
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {filteredChats.map((chat) => (
            <Link
              className="block py-4 transition-colors hover:bg-muted/50"
              href={`/chat/${chat.id}`}
              key={chat.id}
            >
              <p className="font-medium">{chat.title}</p>
              <p className="mt-1 text-muted-foreground text-sm">
                Last message{" "}
                {formatDistanceToNow(new Date(chat.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </Link>
          ))}

          {hasMore && (
            <div className="pt-4">
              <Button
                className="w-full"
                onClick={() => setSize(size + 1)}
                variant="outline"
              >
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
