"use client";

import { Copy, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import {
  cloneChat,
  updateChatStarred,
  updateChatTitle,
} from "@/app/(chat)/actions";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import {
  CheckCircleFillIcon,
  GlobeIcon,
  LockIcon,
  PencilEditIcon,
  ShareIcon,
  TrashIcon,
} from "./icons";
import { getChatHistoryPaginationKey } from "./sidebar-history";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import type { VisibilityType } from "./visibility-selector";

type ChatMenuProps = {
  chatId: string;
  chatTitle: string;
  isStarred: boolean;
  initialVisibilityType: VisibilityType;
  onDelete: (chatId: string) => void;
  onStarChange?: (chatId: string, isStarred: boolean) => void;
  onTitleChange?: (chatId: string, title: string) => void;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
};

export function ChatMenu({
  chatId,
  chatTitle,
  isStarred,
  initialVisibilityType,
  onDelete,
  onStarChange,
  onTitleChange,
  children,
  align = "end",
}: ChatMenuProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { visibilityType, setVisibilityType } = useChatVisibility({
    chatId,
    initialVisibilityType,
  });

  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameValue, setRenameValue] = useState(chatTitle);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  const handleStar = async () => {
    const newStarredState = !isStarred;
    await updateChatStarred({ chatId, isStarred: newStarredState });
    onStarChange?.(chatId, newStarredState);
    router.refresh();
  };

  const handleRename = async () => {
    if (!renameValue.trim() || renameValue === chatTitle) {
      setShowRenameDialog(false);
      return;
    }

    setIsRenaming(true);
    await updateChatTitle({ chatId, title: renameValue.trim() });
    onTitleChange?.(chatId, renameValue.trim());
    setIsRenaming(false);
    setShowRenameDialog(false);
    router.refresh();
  };

  const handleClone = async () => {
    setIsCloning(true);
    toast.info("Cloning chat...");

    const result = await cloneChat({ chatId });

    if (result.success) {
      toast.success("Chat cloned successfully");
      mutate(unstable_serialize(getChatHistoryPaginationKey));
      router.push(`/chat/${result.newChatId}`);
    } else {
      toast.error(result.error);
    }

    setIsCloning(false);
  };

  return (
    <>
      <DropdownMenu modal={true}>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>

        <DropdownMenuContent align={align} side="bottom">
          <DropdownMenuItem className="cursor-pointer" onSelect={handleStar}>
            <Star className={`size-4 ${isStarred ? "fill-current" : ""}`} />
            <span>{isStarred ? "Unstar" : "Star"}</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => {
              setRenameValue(chatTitle);
              setShowRenameDialog(true);
            }}
          >
            <PencilEditIcon size={16} />
            <span>Rename</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="cursor-pointer"
            disabled={isCloning}
            onSelect={handleClone}
          >
            <Copy className="size-4" />
            <span>{isCloning ? "Cloning..." : "Clone"}</span>
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <ShareIcon />
              <span>Share</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  className="cursor-pointer flex-row justify-between"
                  onClick={() => {
                    setVisibilityType("private");
                  }}
                >
                  <div className="flex flex-row items-center gap-2">
                    <LockIcon size={12} />
                    <span>Private</span>
                  </div>
                  {visibilityType === "private" ? (
                    <CheckCircleFillIcon />
                  ) : null}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer flex-row justify-between"
                  onClick={() => setVisibilityType("public")}
                >
                  <div className="flex flex-row items-center gap-2">
                    <GlobeIcon />
                    <span>Public</span>
                  </div>
                  {visibilityType === "public" ? <CheckCircleFillIcon /> : null}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
            onSelect={() => onDelete(chatId)}
          >
            <TrashIcon />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog onOpenChange={setShowRenameDialog} open={showRenameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleRename();
              }
            }}
            placeholder="Chat title"
            value={renameValue}
          />
          <DialogFooter>
            <Button
              onClick={() => setShowRenameDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isRenaming} onClick={handleRename}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
