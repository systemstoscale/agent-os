"use client";

import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "next-auth";
import { useState } from "react";
import { toast } from "sonner";
import useSWRInfinite from "swr/infinite";
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
import { useSidebar } from "@/components/ui/sidebar";
import type { Chat } from "@/lib/db/schema";
import { fetcher } from "@/lib/utils";
import { LoaderIcon } from "./icons";
import { ChatItem } from "./sidebar-history-item";

export type ChatHistory = {
  chats: Chat[];
  hasMore: boolean;
};

const PAGE_SIZE = 20;

export function getChatHistoryPaginationKey(
  pageIndex: number,
  previousPageData: ChatHistory
) {
  if (previousPageData && previousPageData.hasMore === false) {
    return null;
  }

  if (pageIndex === 0) {
    return `/api/history?limit=${PAGE_SIZE}`;
  }

  const firstChatFromPage = previousPageData.chats.at(-1);

  if (!firstChatFromPage) {
    return null;
  }

  return `/api/history?ending_before=${firstChatFromPage.id}&limit=${PAGE_SIZE}`;
}

export function SidebarHistory({ user }: { user: User | undefined }) {
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const id = pathname?.startsWith("/chat/") ? pathname.split("/")[2] : null;

  const {
    data: paginatedChatHistories,
    setSize,
    isValidating,
    isLoading,
    mutate,
  } = useSWRInfinite<ChatHistory>(getChatHistoryPaginationKey, fetcher, {
    fallbackData: [],
  });

  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const hasReachedEnd = paginatedChatHistories
    ? paginatedChatHistories.some((page) => page.hasMore === false)
    : false;

  const hasEmptyChatHistory = paginatedChatHistories
    ? paginatedChatHistories.every((page) => page.chats.length === 0)
    : false;

  const handleDelete = () => {
    const chatToDelete = deleteId;
    const isCurrentChat = pathname === `/chat/${chatToDelete}`;

    setShowDeleteDialog(false);

    const deletePromise = fetch(`/api/chat?id=${chatToDelete}`, {
      method: "DELETE",
    });

    toast.promise(deletePromise, {
      loading: "Deleting chat...",
      success: () => {
        mutate((chatHistories) => {
          if (chatHistories) {
            return chatHistories.map((chatHistory) => ({
              ...chatHistory,
              chats: chatHistory.chats.filter(
                (chat) => chat.id !== chatToDelete
              ),
            }));
          }
        });

        if (isCurrentChat) {
          router.replace("/");
          router.refresh();
        }

        return "Chat deleted successfully";
      },
      error: "Failed to delete chat",
    });
  };

  if (!user) {
    return (
      <div className="px-2 py-1.5 text-muted-foreground text-sm">
        Login to save and revisit previous chats!
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <div className="px-2 py-1.5 text-muted-foreground/70 text-xs font-medium">
          Recents
        </div>
        {[44, 32, 28, 64, 52].map((item) => (
          <div
            className="flex h-8 items-center gap-2 rounded-md px-2"
            key={item}
          >
            <div
              className="h-4 max-w-(--skeleton-width) flex-1 rounded-md bg-muted"
              style={
                {
                  "--skeleton-width": `${item}%`,
                } as React.CSSProperties
              }
            />
          </div>
        ))}
      </div>
    );
  }

  if (hasEmptyChatHistory) {
    return (
      <div className="px-2 py-1.5 text-muted-foreground text-sm">
        Your conversations will appear here once you start chatting!
      </div>
    );
  }

  const chatsFromHistory = paginatedChatHistories
    ? paginatedChatHistories.flatMap(
        (paginatedChatHistory) => paginatedChatHistory.chats
      )
    : [];

  const starredChats = chatsFromHistory.filter((chat) => chat.isStarred);
  const recentChats = chatsFromHistory.filter((chat) => !chat.isStarred);

  const handleStarChange = (chatId: string, isStarred: boolean) => {
    mutate((chatHistories) => {
      if (chatHistories) {
        return chatHistories.map((chatHistory) => ({
          ...chatHistory,
          chats: chatHistory.chats.map((chat) =>
            chat.id === chatId ? { ...chat, isStarred } : chat
          ),
        }));
      }
    }, false);
  };

  const handleTitleChange = (chatId: string, title: string) => {
    mutate((chatHistories) => {
      if (chatHistories) {
        return chatHistories.map((chatHistory) => ({
          ...chatHistory,
          chats: chatHistory.chats.map((chat) =>
            chat.id === chatId ? { ...chat, title } : chat
          ),
        }));
      }
    }, false);
  };

  return (
    <>
      <div className="flex flex-col">
        {starredChats.length > 0 && (
          <div>
            <div className="px-2 py-1.5 text-muted-foreground/70 text-xs font-medium">
              Starred
            </div>
            {starredChats.map((chat) => (
              <ChatItem
                chat={chat}
                isActive={chat.id === id}
                key={chat.id}
                onDelete={(chatId) => {
                  setDeleteId(chatId);
                  setShowDeleteDialog(true);
                }}
                onStarChange={handleStarChange}
                onTitleChange={handleTitleChange}
                setOpenMobile={setOpenMobile}
              />
            ))}
          </div>
        )}

        {recentChats.length > 0 && (
          <div>
            <div className="px-2 py-1.5 text-muted-foreground/70 text-xs font-medium">
              Recents
            </div>
            {recentChats.map((chat) => (
              <ChatItem
                chat={chat}
                isActive={chat.id === id}
                key={chat.id}
                onDelete={(chatId) => {
                  setDeleteId(chatId);
                  setShowDeleteDialog(true);
                }}
                onStarChange={handleStarChange}
                onTitleChange={handleTitleChange}
                setOpenMobile={setOpenMobile}
              />
            ))}
          </div>
        )}

        <motion.div
          onViewportEnter={() => {
            if (!isValidating && !hasReachedEnd) {
              setSize((size) => size + 1);
            }
          }}
        />

        {!hasReachedEnd && (
          <div className="flex flex-row items-center justify-center gap-2 px-2 py-3 text-muted-foreground">
            <div className="animate-spin">
              <LoaderIcon />
            </div>
          </div>
        )}
      </div>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              chat and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
