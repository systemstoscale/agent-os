import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  max,
  sql,
  type SQL,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { revalidateTag, unstable_cache } from "next/cache";
import postgres from "postgres";
import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import { ChatSDKError } from "../errors";
import {
  type Agent,
  type AgentFile,
  type AgentTool,
  type AgentToolAssignment,
  agent,
  agentFile,
  agentTool,
  agentToolAssignment,
  type Chat,
  chat,
  type DBMessage,
  document,
  message,
  type Suggestion,
  siteConfig,
  stream,
  suggestion,
  type User,
  user,
  vote,
} from "./schema";
import { generateHashedPassword } from "./utils";

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<User[]> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user by email"
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create user");
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const [selectedUser] = await db.select().from(user).where(eq(user.id, id));
    return selectedUser || null;
  } catch (error) {
    console.error("getUserById error:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get user by id");
  }
}

export async function updateUserProfile({
  id,
  fullName,
}: {
  id: string;
  fullName?: string;
}): Promise<User | null> {
  try {
    const updateData: Partial<User> = {};
    if (fullName !== undefined) {
      updateData.fullName = fullName;
    }

    const [updatedUser] = await db
      .update(user)
      .set(updateData)
      .where(eq(user.id, id))
      .returning();
    return updatedUser || null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update user profile"
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
  agentId,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
  agentId?: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
      agentId,
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete chat by id"
    );
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  try {
    const userChats = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.userId, userId));

    if (userChats.length === 0) {
      return { deletedCount: 0 };
    }

    const chatIds = userChats.map((c) => c.id);

    await db.delete(vote).where(inArray(vote.chatId, chatIds));
    await db.delete(message).where(inArray(message.chatId, chatIds));
    await db.delete(stream).where(inArray(stream.chatId, chatIds));

    const deletedChats = await db
      .delete(chat)
      .where(eq(chat.userId, userId))
      .returning();

    return { deletedCount: deletedChats.length };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete all chats by user id"
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id)
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    if (!selectedChat) {
      return null;
    }

    return selectedChat;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get chat by id");
  }
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  try {
    return await db.insert(message).values(messages);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save messages");
  }
}

export async function updateMessage({
  id,
  parts,
}: {
  id: string;
  parts: DBMessage["parts"];
}) {
  try {
    return await db.update(message).set({ parts }).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to update message");
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get messages by chat id"
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to vote message");
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get votes by chat id"
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save document");
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get documents by id"
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp"
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save suggestions"
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(eq(suggestion.documentId, documentId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get suggestions by document id"
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message by id"
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map(
      (currentMessage) => currentMessage.id
    );

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds))
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete messages by chat id after timestamp"
    );
  }
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update chat visibility by id"
    );
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    return await db.update(chat).set({ title }).where(eq(chat.id, chatId));
  } catch (error) {
    console.warn("Failed to update title for chat", chatId, error);
    return;
  }
}

export async function updateChatStarredById({
  chatId,
  isStarred,
}: {
  chatId: string;
  isStarred: boolean;
}) {
  try {
    return await db.update(chat).set({ isStarred }).where(eq(chat.id, chatId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update chat starred status"
    );
  }
}

export async function updateChatAgentById({
  chatId,
  agentId,
}: {
  chatId: string;
  agentId: string | null;
}) {
  try {
    return await db.update(chat).set({ agentId }).where(eq(chat.id, chatId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update chat agent"
    );
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, "user")
        )
      )
      .execute();

    return stats?.count ?? 0;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message count by user id"
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create stream id"
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get stream ids by chat id"
    );
  }
}

// Agent queries

export async function getAgents(): Promise<Agent[]> {
  try {
    return await db.select().from(agent).orderBy(asc(agent.order));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get agents");
  }
}

export async function getPublishedAgents(): Promise<Agent[]> {
  try {
    return await db
      .select()
      .from(agent)
      .where(eq(agent.isPublished, true))
      .orderBy(asc(agent.order));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get published agents"
    );
  }
}

export async function getAgentById({
  id,
}: {
  id: string;
}): Promise<Agent | null> {
  try {
    const [selectedAgent] = await db
      .select()
      .from(agent)
      .where(eq(agent.id, id));
    return selectedAgent || null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get agent by id");
  }
}

export async function getDefaultAgent(): Promise<Agent | null> {
  try {
    const [defaultAgent] = await db
      .select()
      .from(agent)
      .where(eq(agent.isDefault, true));
    return defaultAgent || null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get default agent"
    );
  }
}

export async function createAgent({
  name,
  description,
  systemPrompt,
  suggestions,
  isPublished,
}: {
  name: string;
  description?: string;
  systemPrompt: string;
  suggestions?: string[];
  isPublished?: boolean;
}): Promise<Agent> {
  try {
    const [maxOrderResult] = await db
      .select({ maxOrder: max(agent.order) })
      .from(agent);
    const nextOrder = (maxOrderResult?.maxOrder ?? -1) + 1;

    const [newAgent] = await db
      .insert(agent)
      .values({
        name,
        description,
        systemPrompt,
        suggestions: suggestions || [],
        isPublished: isPublished || false,
        isDefault: false,
        order: nextOrder,
      })
      .returning();
    return newAgent;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create agent");
  }
}

export async function updateAgent({
  id,
  name,
  description,
  systemPrompt,
  suggestions,
  isPublished,
  isDefault,
  documentToolsEnabled,
  documentToolsPrompt,
  fileUploadEnabled,
}: {
  id: string;
  name?: string;
  description?: string;
  systemPrompt?: string;
  suggestions?: string[];
  isPublished?: boolean;
  isDefault?: boolean;
  documentToolsEnabled?: boolean;
  documentToolsPrompt?: string | null;
  fileUploadEnabled?: boolean;
}): Promise<Agent | null> {
  try {
    // If setting this agent as default, first unset the current default
    if (isDefault === true) {
      await db
        .update(agent)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(agent.isDefault, true));
    }

    const updateData: Partial<Agent> = {
      updatedAt: new Date(),
    };
    if (name !== undefined) {
      updateData.name = name;
    }
    if (description !== undefined) {
      updateData.description = description;
    }
    if (systemPrompt !== undefined) {
      updateData.systemPrompt = systemPrompt;
    }
    if (suggestions !== undefined) {
      updateData.suggestions = suggestions;
    }
    if (isPublished !== undefined) {
      updateData.isPublished = isPublished;
    }
    if (isDefault !== undefined) {
      updateData.isDefault = isDefault;
      // Default agent must be published
      if (isDefault) {
        updateData.isPublished = true;
      }
    }
    if (documentToolsEnabled !== undefined) {
      updateData.documentToolsEnabled = documentToolsEnabled;
    }
    if (documentToolsPrompt !== undefined) {
      updateData.documentToolsPrompt = documentToolsPrompt;
    }
    if (fileUploadEnabled !== undefined) {
      updateData.fileUploadEnabled = fileUploadEnabled;
    }

    const [updatedAgent] = await db
      .update(agent)
      .set(updateData)
      .where(eq(agent.id, id))
      .returning();
    return updatedAgent || null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to update agent");
  }
}

export async function deleteAgent({ id }: { id: string }): Promise<boolean> {
  try {
    // Check if this is the default agent
    const [existingAgent] = await db
      .select()
      .from(agent)
      .where(eq(agent.id, id));
    if (existingAgent?.isDefault) {
      throw new ChatSDKError(
        "bad_request:database",
        "Cannot delete the default agent"
      );
    }

    const result = await db.delete(agent).where(eq(agent.id, id)).returning();
    return result.length > 0;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError("bad_request:database", "Failed to delete agent");
  }
}

export async function updateAgentOrder({
  orderedIds,
}: {
  orderedIds: string[];
}): Promise<void> {
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(agent)
        .set({ order: i, updatedAt: new Date() })
        .where(eq(agent.id, orderedIds[i]));
    }
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update agent order"
    );
  }
}

export async function getChatsByAgentId({
  agentId,
  userId,
  limit,
  startingAfter,
  endingBefore,
}: {
  agentId: string;
  userId: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(
                whereCondition,
                eq(chat.userId, userId),
                eq(chat.agentId, agentId)
              )
            : and(eq(chat.userId, userId), eq(chat.agentId, agentId))
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chats by agent id"
    );
  }
}

// Agent File queries

export async function getAgentFilesByAgentId({
  agentId,
}: {
  agentId: string;
}): Promise<AgentFile[]> {
  try {
    return await db
      .select()
      .from(agentFile)
      .where(eq(agentFile.agentId, agentId))
      .orderBy(asc(agentFile.createdAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get agent files by agent id"
    );
  }
}

export async function getAgentFileById({
  id,
}: {
  id: string;
}): Promise<AgentFile | null> {
  try {
    const [file] = await db
      .select()
      .from(agentFile)
      .where(eq(agentFile.id, id));
    return file || null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get agent file by id"
    );
  }
}

export async function createAgentFile({
  agentId,
  name,
  content,
}: {
  agentId: string;
  name: string;
  content: string;
}): Promise<AgentFile> {
  try {
    const [newFile] = await db
      .insert(agentFile)
      .values({
        agentId,
        name,
        content,
      })
      .returning();
    return newFile;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create agent file"
    );
  }
}

export async function updateAgentFile({
  id,
  name,
  content,
}: {
  id: string;
  name?: string;
  content?: string;
}): Promise<AgentFile | null> {
  try {
    const updateData: Partial<AgentFile> = {
      updatedAt: new Date(),
    };
    if (name !== undefined) {
      updateData.name = name;
    }
    if (content !== undefined) {
      updateData.content = content;
    }

    const [updatedFile] = await db
      .update(agentFile)
      .set(updateData)
      .where(eq(agentFile.id, id))
      .returning();
    return updatedFile || null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update agent file"
    );
  }
}

export async function deleteAgentFile({
  id,
}: {
  id: string;
}): Promise<boolean> {
  try {
    const result = await db
      .delete(agentFile)
      .where(eq(agentFile.id, id))
      .returning();
    return result.length > 0;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete agent file"
    );
  }
}

// Tool queries

export async function getAllTools(): Promise<AgentTool[]> {
  try {
    return await db.select().from(agentTool).orderBy(asc(agentTool.sortOrder));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get all tools");
  }
}

export async function getToolById({
  id,
}: {
  id: string;
}): Promise<AgentTool | null> {
  try {
    const [tool] = await db
      .select()
      .from(agentTool)
      .where(eq(agentTool.id, id));
    return tool || null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get tool by id");
  }
}

export async function getEnabledGlobalTools(): Promise<AgentTool[]> {
  try {
    return await db
      .select()
      .from(agentTool)
      .where(and(eq(agentTool.isGlobal, true), eq(agentTool.isEnabled, true)))
      .orderBy(asc(agentTool.sortOrder));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get enabled global tools"
    );
  }
}

export async function getEnabledAssignedToolsForAgent({
  agentId,
}: {
  agentId: string;
}): Promise<AgentTool[]> {
  try {
    return await db
      .select({
        id: agentTool.id,
        name: agentTool.name,
        description: agentTool.description,
        url: agentTool.url,
        method: agentTool.method,
        headers: agentTool.headers,
        aiParameters: agentTool.aiParameters,
        staticValues: agentTool.staticValues,
        isEnabled: agentTool.isEnabled,
        requiresApproval: agentTool.requiresApproval,
        showDetailsToUsers: agentTool.showDetailsToUsers,
        isGlobal: agentTool.isGlobal,
        timeout: agentTool.timeout,
        sortOrder: agentTool.sortOrder,
        createdAt: agentTool.createdAt,
        updatedAt: agentTool.updatedAt,
      })
      .from(agentToolAssignment)
      .innerJoin(agentTool, eq(agentToolAssignment.toolId, agentTool.id))
      .where(
        and(
          eq(agentToolAssignment.agentId, agentId),
          eq(agentToolAssignment.isEnabled, true),
          eq(agentTool.isEnabled, true),
          eq(agentTool.isGlobal, false)
        )
      )
      .orderBy(asc(agentToolAssignment.sortOrder));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get enabled assigned tools for agent"
    );
  }
}

export async function getToolVisibilityForAgent({
  agentId,
}: {
  agentId: string;
}): Promise<Record<string, boolean>> {
  try {
    // Get global tools
    const globalTools = await db
      .select({
        name: agentTool.name,
        showDetailsToUsers: agentTool.showDetailsToUsers,
      })
      .from(agentTool)
      .where(and(eq(agentTool.isGlobal, true), eq(agentTool.isEnabled, true)));

    // Get assigned tools for this agent
    const assignedTools = await db
      .select({
        name: agentTool.name,
        showDetailsToUsers: agentTool.showDetailsToUsers,
      })
      .from(agentToolAssignment)
      .innerJoin(agentTool, eq(agentToolAssignment.toolId, agentTool.id))
      .where(
        and(
          eq(agentToolAssignment.agentId, agentId),
          eq(agentToolAssignment.isEnabled, true),
          eq(agentTool.isEnabled, true),
          eq(agentTool.isGlobal, false)
        )
      );

    const allTools = [...globalTools, ...assignedTools];
    const visibility: Record<string, boolean> = {};

    for (const tool of allTools) {
      // Sanitize tool name to match how it appears in tool parts (replace non-alphanumeric with _)
      const sanitizedName = tool.name.replace(/[^a-zA-Z0-9_]/g, "_");
      visibility[sanitizedName] = tool.showDetailsToUsers ?? false;
    }

    return visibility;
  } catch (error) {
    console.error("getToolVisibilityForAgent error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get tool visibility for agent"
    );
  }
}

export type ToolWithAssignment = AgentTool & {
  assignment: AgentToolAssignment | null;
};

export async function getToolAssignmentsForAgent({
  agentId,
}: {
  agentId: string;
}): Promise<ToolWithAssignment[]> {
  try {
    const results = await db
      .select({
        tool: agentTool,
        assignment: agentToolAssignment,
      })
      .from(agentTool)
      .leftJoin(
        agentToolAssignment,
        and(
          eq(agentToolAssignment.toolId, agentTool.id),
          eq(agentToolAssignment.agentId, agentId)
        )
      )
      .where(eq(agentTool.isGlobal, false))
      .orderBy(asc(agentTool.sortOrder));

    return results.map((r) => ({
      ...r.tool,
      assignment: r.assignment,
    }));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get tool assignments for agent"
    );
  }
}

export async function upsertToolAssignment({
  agentId,
  toolId,
  isEnabled,
}: {
  agentId: string;
  toolId: string;
  isEnabled: boolean;
}): Promise<AgentToolAssignment> {
  try {
    const [result] = await db
      .insert(agentToolAssignment)
      .values({
        agentId,
        toolId,
        isEnabled,
      })
      .onConflictDoUpdate({
        target: [agentToolAssignment.agentId, agentToolAssignment.toolId],
        set: { isEnabled },
      })
      .returning();
    return result;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to upsert tool assignment"
    );
  }
}

export async function deleteToolAssignment({
  agentId,
  toolId,
}: {
  agentId: string;
  toolId: string;
}): Promise<boolean> {
  try {
    const result = await db
      .delete(agentToolAssignment)
      .where(
        and(
          eq(agentToolAssignment.agentId, agentId),
          eq(agentToolAssignment.toolId, toolId)
        )
      )
      .returning();
    return result.length > 0;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete tool assignment"
    );
  }
}

export async function createTool({
  name,
  description,
  url,
  method,
  headers,
  aiParameters,
  staticValues,
  isEnabled,
  requiresApproval,
  showDetailsToUsers,
  isGlobal,
  timeout,
}: {
  name: string;
  description: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  aiParameters?: AgentTool["aiParameters"];
  staticValues?: Record<string, string>;
  isEnabled?: boolean;
  requiresApproval?: boolean;
  showDetailsToUsers?: boolean;
  isGlobal?: boolean;
  timeout?: number;
}): Promise<AgentTool> {
  try {
    const [newTool] = await db
      .insert(agentTool)
      .values({
        name,
        description,
        url,
        method: method || "POST",
        headers: headers || {},
        aiParameters: aiParameters || [],
        staticValues: staticValues || {},
        isEnabled: isEnabled ?? true,
        requiresApproval: requiresApproval ?? true,
        showDetailsToUsers: showDetailsToUsers ?? false,
        isGlobal: isGlobal ?? false,
        timeout: timeout ?? 30,
      })
      .returning();
    return newTool;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create tool");
  }
}

export async function updateTool({
  id,
  name,
  description,
  url,
  method,
  headers,
  aiParameters,
  staticValues,
  isEnabled,
  requiresApproval,
  showDetailsToUsers,
  isGlobal,
  timeout,
}: {
  id: string;
  name?: string;
  description?: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  aiParameters?: AgentTool["aiParameters"];
  staticValues?: Record<string, string>;
  isEnabled?: boolean;
  requiresApproval?: boolean;
  showDetailsToUsers?: boolean;
  isGlobal?: boolean;
  timeout?: number;
}): Promise<AgentTool | null> {
  try {
    const updateData: Partial<AgentTool> = {
      updatedAt: new Date(),
    };
    if (name !== undefined) {
      updateData.name = name;
    }
    if (description !== undefined) {
      updateData.description = description;
    }
    if (url !== undefined) {
      updateData.url = url;
    }
    if (method !== undefined) {
      updateData.method = method;
    }
    if (headers !== undefined) {
      updateData.headers = headers;
    }
    if (aiParameters !== undefined) {
      updateData.aiParameters = aiParameters;
    }
    if (staticValues !== undefined) {
      updateData.staticValues = staticValues;
    }
    if (isEnabled !== undefined) {
      updateData.isEnabled = isEnabled;
    }
    if (requiresApproval !== undefined) {
      updateData.requiresApproval = requiresApproval;
    }
    if (showDetailsToUsers !== undefined) {
      updateData.showDetailsToUsers = showDetailsToUsers;
    }
    if (isGlobal !== undefined) {
      updateData.isGlobal = isGlobal;
    }
    if (timeout !== undefined) {
      updateData.timeout = timeout;
    }

    const [updatedTool] = await db
      .update(agentTool)
      .set(updateData)
      .where(eq(agentTool.id, id))
      .returning();
    return updatedTool || null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to update tool");
  }
}

export async function deleteTool({ id }: { id: string }): Promise<boolean> {
  try {
    const result = await db
      .delete(agentTool)
      .where(eq(agentTool.id, id))
      .returning();
    return result.length > 0;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to delete tool");
  }
}

export async function reorderTools({
  orderedIds,
}: {
  orderedIds: string[];
}): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(agentTool)
          .set({ sortOrder: i, updatedAt: new Date() })
          .where(eq(agentTool.id, orderedIds[i]));
      }
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to reorder tools");
  }
}

export async function reorderToolAssignments({
  agentId,
  orderedToolIds,
}: {
  agentId: string;
  orderedToolIds: string[];
}): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      for (let i = 0; i < orderedToolIds.length; i++) {
        await tx
          .update(agentToolAssignment)
          .set({ sortOrder: i })
          .where(
            and(
              eq(agentToolAssignment.agentId, agentId),
              eq(agentToolAssignment.toolId, orderedToolIds[i])
            )
          );
      }
    });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to reorder tool assignments"
    );
  }
}

// Subscription queries

export async function getUserByStripeCustomerId(
  customerId: string
): Promise<User | null> {
  try {
    const [selectedUser] = await db
      .select()
      .from(user)
      .where(eq(user.stripeCustomerId, customerId));
    return selectedUser || null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user by Stripe customer ID"
    );
  }
}

export async function updateUserSubscription({
  id,
  stripeCustomerId,
  stripeSubscriptionId,
  stripeProductId,
  planName,
  subscriptionStatus,
  creditsLimit,
  billingPeriodStart,
}: {
  id: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string | null;
  stripeProductId?: string | null;
  planName?: string | null;
  subscriptionStatus?: string;
  creditsLimit?: number;
  billingPeriodStart?: Date | null;
}): Promise<User | null> {
  try {
    const updateData: Partial<User> = {};
    if (stripeCustomerId !== undefined) {
      updateData.stripeCustomerId = stripeCustomerId;
    }
    if (stripeSubscriptionId !== undefined) {
      updateData.stripeSubscriptionId = stripeSubscriptionId;
    }
    if (stripeProductId !== undefined) {
      updateData.stripeProductId = stripeProductId;
    }
    if (planName !== undefined) {
      updateData.planName = planName;
    }
    if (subscriptionStatus !== undefined) {
      updateData.subscriptionStatus = subscriptionStatus;
    }
    if (creditsLimit !== undefined) {
      updateData.creditsLimit = creditsLimit;
    }
    if (billingPeriodStart !== undefined) {
      updateData.billingPeriodStart = billingPeriodStart;
    }

    const [updatedUser] = await db
      .update(user)
      .set(updateData)
      .where(eq(user.id, id))
      .returning();
    return updatedUser || null;
  } catch (error) {
    console.error("updateUserSubscription error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update user subscription"
    );
  }
}

export async function getMessageCountSince({
  userId,
  since,
}: {
  userId: string;
  since: Date;
}): Promise<number> {
  try {
    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, userId),
          gte(message.createdAt, since),
          eq(message.role, "user")
        )
      )
      .execute();

    return stats?.count ?? 0;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message count since date"
    );
  }
}

// Site Config queries

async function getSiteConfigValue(key: string): Promise<string | null> {
  try {
    const [config] = await db
      .select()
      .from(siteConfig)
      .where(eq(siteConfig.key, key));
    return config?.value ?? null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get site config");
  }
}

export const getSiteConfig = unstable_cache(
  getSiteConfigValue,
  ["site-config"],
  { tags: ["site-config"] }
);

export async function getSiteName(): Promise<string> {
  const name = await getSiteConfig("siteName");
  return name ?? process.env.NEXT_PUBLIC_APP_NAME ?? "Agent OS";
}

export async function updateSiteConfig({
  key,
  value,
}: {
  key: string;
  value: string;
}): Promise<void> {
  try {
    await db
      .insert(siteConfig)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: siteConfig.key,
        set: { value, updatedAt: new Date() },
      });
    revalidateTag("site-config", "default");
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update site config"
    );
  }
}

export async function cloneChatWithMessages({
  sourceChatId,
  newUserId,
}: {
  sourceChatId: string;
  newUserId: string;
}): Promise<{ newChatId: string }> {
  try {
    // Get the source chat
    const [sourceChat] = await db
      .select()
      .from(chat)
      .where(eq(chat.id, sourceChatId));

    if (!sourceChat) {
      throw new ChatSDKError("not_found:database", "Source chat not found");
    }

    // Get all messages from the source chat
    const sourceMessages = await db
      .select()
      .from(message)
      .where(eq(message.chatId, sourceChatId))
      .orderBy(asc(message.createdAt));

    // Create the new chat
    const newChatId = crypto.randomUUID();
    await db.insert(chat).values({
      id: newChatId,
      createdAt: new Date(),
      title: `Copy of ${sourceChat.title}`,
      userId: newUserId,
      visibility: "private",
      agentId: sourceChat.agentId,
      isStarred: false,
    });

    // Clone all messages with new IDs
    if (sourceMessages.length > 0) {
      const newMessages: DBMessage[] = sourceMessages.map((msg) => ({
        id: crypto.randomUUID(),
        chatId: newChatId,
        role: msg.role,
        parts: msg.parts,
        attachments: msg.attachments,
        createdAt: msg.createdAt,
      }));

      await db.insert(message).values(newMessages);
    }

    return { newChatId };
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError("bad_request:database", "Failed to clone chat");
  }
}

// creditsLimit is repurposed as the additive credit balance (1 credit = 1 message).
export async function addCredits({
  id,
  amount,
}: {
  id: string;
  amount: number;
}): Promise<User | null> {
  try {
    const [updatedUser] = await db
      .update(user)
      .set({ creditsLimit: sql`${user.creditsLimit} + ${amount}` })
      .where(eq(user.id, id))
      .returning();
    return updatedUser || null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to add credits");
  }
}

export async function deductCredit({ id }: { id: string }): Promise<void> {
  try {
    // Floor at 0: only decrement when balance is still positive (atomic guard).
    await db
      .update(user)
      .set({ creditsLimit: sql`${user.creditsLimit} - 1` })
      .where(and(eq(user.id, id), gt(user.creditsLimit, 0)));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to deduct credit");
  }
}
