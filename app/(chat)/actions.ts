"use server";

import { generateText, type UIMessage } from "ai";
import { cookies } from "next/headers";
import { auth } from "@/app/(auth)/auth";
import type { VisibilityType } from "@/components/visibility-selector";
import { titlePrompt } from "@/lib/ai/prompts";
import { getTitleModel } from "@/lib/ai/providers";
import {
  cloneChatWithMessages,
  deleteMessagesByChatIdAfterTimestamp,
  getChatById,
  getMessageById,
  updateChatAgentById,
  updateChatStarredById,
  updateChatTitleById,
  updateChatVisibilityById,
} from "@/lib/db/queries";
import { getTextFromMessage } from "@/lib/utils";

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  const { text } = await generateText({
    model: getTitleModel(),
    system: titlePrompt,
    prompt: getTextFromMessage(message),
  });
  return text
    .replace(/^[#*"\s]+/, "")
    .replace(/["]+$/, "")
    .trim();
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisibilityById({ chatId, visibility });
}

export async function updateChatStarred({
  chatId,
  isStarred,
}: {
  chatId: string;
  isStarred: boolean;
}) {
  await updateChatStarredById({ chatId, isStarred });
}

export async function updateChatTitle({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  await updateChatTitleById({ chatId, title });
}

export async function updateChatAgent({
  chatId,
  agentId,
}: {
  chatId: string;
  agentId: string | null;
}) {
  await updateChatAgentById({ chatId, agentId });
}

export async function cloneChat({
  chatId,
}: {
  chatId: string;
}): Promise<
  { success: true; newChatId: string } | { success: false; error: string }
> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in to clone a chat" };
  }

  const sourceChat = await getChatById({ id: chatId });

  if (!sourceChat) {
    return { success: false, error: "Chat not found" };
  }

  // Check access: user must own the chat OR it must be public
  const isOwner = sourceChat.userId === session.user.id;
  const isPublic = sourceChat.visibility === "public";

  if (!isOwner && !isPublic) {
    return { success: false, error: "You do not have access to this chat" };
  }

  try {
    const { newChatId } = await cloneChatWithMessages({
      sourceChatId: chatId,
      newUserId: session.user.id,
    });

    return { success: true, newChatId };
  } catch (_error) {
    return { success: false, error: "Failed to clone chat" };
  }
}
