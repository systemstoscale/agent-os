"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useEffect, useRef, useState } from "react";
import { updateChatTitle } from "@/app/(chat)/actions";
import type { Chat } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { ChatMenu } from "./chat-menu";
import { MoreHorizontalIcon } from "./icons";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";

const PureChatItem = ({
  chat,
  isActive,
  onDelete,
  setOpenMobile,
  onStarChange,
  onTitleChange,
}: {
  chat: Chat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  setOpenMobile: (open: boolean) => void;
  onStarChange?: (chatId: string, isStarred: boolean) => void;
  onTitleChange?: (chatId: string, title: string) => void;
}) => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedTitle(chat.title);
  }, [chat.title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleTitleSave = async () => {
    const trimmedTitle = editedTitle.trim();
    if (trimmedTitle && trimmedTitle !== chat.title) {
      await updateChatTitle({ chatId: chat.id, title: trimmedTitle });
      onTitleChange?.(chat.id, trimmedTitle);
      router.refresh();
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === "Escape") {
      setEditedTitle(chat.title);
      setIsEditing(false);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
  };

  return (
    <SidebarMenuItem>
      {isEditing ? (
        <input
          className={cn(
            "h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          )}
          onBlur={handleTitleSave}
          onChange={(e) => setEditedTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          ref={inputRef}
          type="text"
          value={editedTitle}
        />
      ) : (
        <>
          <SidebarMenuButton asChild isActive={isActive}>
            <Link
              href={`/chat/${chat.id}`}
              onClick={() => setOpenMobile(false)}
              onDoubleClick={handleDoubleClick}
            >
              <span>{chat.title}</span>
            </Link>
          </SidebarMenuButton>

          <ChatMenu
            chatId={chat.id}
            chatTitle={chat.title}
            initialVisibilityType={chat.visibility}
            isStarred={chat.isStarred ?? false}
            onDelete={onDelete}
            onStarChange={onStarChange}
            onTitleChange={onTitleChange}
          >
            <SidebarMenuAction
              className="mr-0.5 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              showOnHover={!isActive}
            >
              <MoreHorizontalIcon />
              <span className="sr-only">More</span>
            </SidebarMenuAction>
          </ChatMenu>
        </>
      )}
    </SidebarMenuItem>
  );
};

export const ChatItem = memo(PureChatItem, (prevProps, nextProps) => {
  if (prevProps.isActive !== nextProps.isActive) {
    return false;
  }
  if (prevProps.chat.isStarred !== nextProps.chat.isStarred) {
    return false;
  }
  if (prevProps.chat.title !== nextProps.chat.title) {
    return false;
  }
  return true;
});
