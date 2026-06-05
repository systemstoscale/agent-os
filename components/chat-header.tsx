"use client";

import { ChevronDown, Copy, Link2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useWindowSize } from "usehooks-ts";
import { updateChatTitle } from "@/app/(chat)/actions";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { cn, generateUUID } from "@/lib/utils";
import { ChatMenu } from "./chat-menu";
import { PlusIcon } from "./icons";
import { useSidebar } from "./ui/sidebar";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
  chatTitle,
  agentName,
  agentId,
  isStarred,
  onDelete,
  isCloning,
  onClone,
  showLoginToClone,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  chatTitle?: string;
  agentName?: string;
  agentId?: string;
  isStarred?: boolean;
  onDelete?: (chatId: string) => void;
  isCloning?: boolean;
  onClone?: () => void;
  showLoginToClone?: boolean;
}) {
  const router = useRouter();
  const { open } = useSidebar();
  const { width: windowWidth } = useWindowSize();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(chatTitle ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate a new chat ID for the agent link
  const newChatIdForAgent = useMemo(() => generateUUID(), []);

  useEffect(() => {
    setEditedTitle(chatTitle ?? "");
  }, [chatTitle]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleTitleSave = async () => {
    const trimmedTitle = editedTitle.trim();
    if (trimmedTitle && trimmedTitle !== chatTitle) {
      await updateChatTitle({ chatId, title: trimmedTitle });
      router.refresh();
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === "Escape") {
      setEditedTitle(chatTitle ?? "");
      setIsEditing(false);
    }
  };

  return (
    <header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
      {/* Mobile-only sidebar toggle */}
      <div className="md:hidden">
        <SidebarToggle />
      </div>

      {/* Agent name / Chat title - shown on desktop */}
      <div className="hidden flex-1 items-center gap-1 truncate text-sm md:flex">
        {agentName && (
          <>
            {agentId ? (
              <Link
                className="font-medium hover:underline"
                href={`/chat/${newChatIdForAgent}?agentId=${agentId}`}
              >
                {agentName}
              </Link>
            ) : (
              <span className="font-medium">{agentName}</span>
            )}
            {chatTitle && <span className="text-muted-foreground">/</span>}
          </>
        )}
        {chatTitle &&
          (isEditing ? (
            <input
              className={cn(
                "min-w-[100px] max-w-[300px] rounded border border-input bg-background px-2 py-0.5 text-sm font-medium text-foreground outline-none focus:ring-1 focus:ring-ring"
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
              <button
                className={cn(
                  "truncate font-medium text-left",
                  !isReadonly &&
                    "cursor-text rounded px-1 py-0.5 hover:bg-muted"
                )}
                disabled={isReadonly}
                onClick={() => !isReadonly && setIsEditing(true)}
                title={isReadonly ? chatTitle : "Click to edit"}
                type="button"
              >
                {chatTitle}
              </button>
              {!isReadonly && onDelete && (
                <ChatMenu
                  align="start"
                  chatId={chatId}
                  chatTitle={chatTitle}
                  initialVisibilityType={selectedVisibilityType}
                  isStarred={isStarred ?? false}
                  onDelete={onDelete}
                >
                  <button
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-muted"
                    type="button"
                  >
                    <ChevronDown className="size-4 text-muted-foreground" />
                  </button>
                </ChatMenu>
              )}
            </>
          ))}
      </div>

      {/* Mobile-only new chat button */}
      {(!open || windowWidth < 768) && (
        <Button
          className="ml-auto h-8 px-2 md:hidden"
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
          variant="outline"
        >
          <PlusIcon />
          <span className="sr-only">New Chat</span>
        </Button>
      )}

      {/* Copy link button - shown when public */}
      {!isReadonly && selectedVisibilityType === "public" && (
        <Button
          className="ml-auto md:ml-0"
          onClick={() => {
            navigator.clipboard.writeText(
              `${window.location.origin}/chat/${chatId}`
            );
            toast.success("Link copied");
          }}
          size="sm"
          variant="outline"
        >
          <Link2 className="size-4" />
          <span className="hidden sm:inline">Copy link</span>
        </Button>
      )}

      {/* Clone button - shown for logged-in non-owners viewing public chats */}
      {isReadonly && selectedVisibilityType === "public" && onClone && (
        <Button
          className="ml-auto md:ml-0"
          disabled={isCloning}
          onClick={onClone}
          size="sm"
          variant="outline"
        >
          {isCloning ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Copy className="size-4" />
          )}
          <span className="hidden sm:inline">Clone</span>
        </Button>
      )}

      {/* Login to clone button - shown for guests viewing public chats */}
      {isReadonly &&
        selectedVisibilityType === "public" &&
        showLoginToClone && (
          <Button
            asChild
            className="ml-auto md:ml-0"
            size="sm"
            variant="outline"
          >
            <Link href="/login">
              <Copy className="size-4" />
              <span className="hidden sm:inline">Log in to clone</span>
            </Link>
          </Button>
        )}

      {/* Share/visibility selector */}
      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          className={
            selectedVisibilityType === "public" ? "" : "ml-auto md:ml-0"
          }
          selectedVisibilityType={selectedVisibilityType}
        />
      )}
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly &&
    prevProps.chatTitle === nextProps.chatTitle &&
    prevProps.agentName === nextProps.agentName &&
    prevProps.agentId === nextProps.agentId &&
    prevProps.isStarred === nextProps.isStarred &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.isCloning === nextProps.isCloning &&
    prevProps.onClone === nextProps.onClone &&
    prevProps.showLoginToClone === nextProps.showLoginToClone
  );
});
