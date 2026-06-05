"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { FileUIPart, UIMessage } from "ai";
import { Bot, CheckIcon, FileTextIcon, Paperclip, XIcon } from "lucide-react";
import { nanoid } from "nanoid";
import {
  type ChangeEvent,
  type Dispatch,
  type DragEvent,
  memo,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import {
  chatModels,
  DEFAULT_CHAT_MODEL,
  modelsByProvider,
} from "@/lib/ai/models";
import type { Agent } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "./elements/prompt-input";
import { ArrowUpIcon, StopIcon } from "./icons";
import { SuggestedActions } from "./suggested-actions";
import { Button } from "./ui/button";
import type { VisibilityType } from "./visibility-selector";

function setCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  // biome-ignore lint/suspicious/noDocumentCookie: needed for client-side cookie setting
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`;
}

type AttachmentFile = FileUIPart & { id: string };

// Convert blob URL to data URL for sending to AI
const convertBlobToDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Upload a file to blob storage and return the public URL
const uploadFileToBlob = async (
  blobUrl: string,
  filename: string
): Promise<string> => {
  const response = await fetch(blobUrl);
  const blob = await response.blob();

  const formData = new FormData();
  formData.append("file", blob, filename);

  const uploadResponse = await fetch("/api/files/upload", {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json();
    throw new Error(error.error || "Upload failed");
  }

  const data = await uploadResponse.json();
  return data.url;
};

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  messages,
  setMessages,
  sendMessage,
  className,
  selectedVisibilityType,
  selectedModelId,
  onModelChange,
  agentSuggestions,
  placeholder = "Send a message...",
  selectedAgentId,
  onAgentChange,
  agents,
  showAgentSelector = false,
  onNavigate,
  fileUploadEnabled = false,
}: {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status?: UseChatHelpers<ChatMessage>["status"];
  stop?: () => void;
  messages?: UIMessage[];
  setMessages?: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage?: UseChatHelpers<ChatMessage>["sendMessage"];
  className?: string;
  selectedVisibilityType?: VisibilityType;
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
  agentSuggestions?: string[];
  placeholder?: string;
  selectedAgentId?: string | null;
  onAgentChange?: (agentId: string | null) => void;
  agents?: Agent[];
  showAgentSelector?: boolean;
  onNavigate?: (input: string) => void;
  fileUploadEnabled?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { width } = useWindowSize();

  // Attachment state
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const hasAutoFocused = useRef(false);
  useEffect(() => {
    if (!hasAutoFocused.current && width) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
        hasAutoFocused.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [width]);

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    ""
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || "";
      setInput(finalValue);
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStorageInput, setInput]);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      for (const file of attachments) {
        if (file.url?.startsWith("blob:")) {
          URL.revokeObjectURL(file.url);
        }
      }
    };
  }, [attachments]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  // Add files to attachments (images and text files)
  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);

    const isImageFile = (f: File) => {
      // Check MIME type first
      if (f.type.startsWith("image/")) {
        return true;
      }
      // Fallback to extension check (browsers don't always set type on drag/drop)
      const imageExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".svg",
        ".bmp",
        ".ico",
      ];
      const ext = f.name.toLowerCase().slice(f.name.lastIndexOf("."));
      return imageExtensions.includes(ext);
    };
    const isTextFile = (f: File) => {
      const textExtensions = [
        ".txt",
        ".md",
        ".json",
        ".csv",
        ".xml",
        ".yaml",
        ".yml",
        ".html",
        ".css",
        ".js",
        ".ts",
        ".jsx",
        ".tsx",
        ".py",
        ".rb",
        ".go",
        ".rs",
        ".java",
        ".c",
        ".cpp",
        ".h",
        ".sh",
        ".sql",
      ];
      const ext = f.name.toLowerCase().slice(f.name.lastIndexOf("."));
      return (
        f.type.startsWith("text/") ||
        f.type === "application/json" ||
        textExtensions.includes(ext)
      );
    };

    const validFiles = fileArray.filter((f) => isImageFile(f) || isTextFile(f));

    if (validFiles.length === 0) {
      toast.error(
        "Supported files: images (JPEG, PNG, etc.) and text files (.txt, .md, .json, etc.)"
      );
      return;
    }

    const newAttachments: AttachmentFile[] = validFiles.map((file) => {
      // Infer mediaType from extension if browser didn't set it
      let mediaType = file.type;
      if (!mediaType) {
        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
        const mimeTypes: Record<string, string> = {
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".gif": "image/gif",
          ".webp": "image/webp",
          ".svg": "image/svg+xml",
          ".bmp": "image/bmp",
          ".ico": "image/x-icon",
        };
        mediaType = mimeTypes[ext] || "text/plain";
      }
      return {
        id: nanoid(),
        type: "file" as const,
        url: URL.createObjectURL(file),
        mediaType,
        filename: file.name,
      };
    });

    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  // Remove an attachment
  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.url?.startsWith("blob:")) {
        URL.revokeObjectURL(file.url);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  // Clear all attachments
  const clearAttachments = useCallback(() => {
    setAttachments((prev) => {
      for (const file of prev) {
        if (file.url?.startsWith("blob:")) {
          URL.revokeObjectURL(file.url);
        }
      }
      return [];
    });
  }, []);

  // Handle file input change
  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files.length > 0) {
        addFiles(event.target.files);
      }
      // Reset input to allow selecting the same file again
      event.target.value = "";
    },
    [addFiles]
  );

  // Drag and drop handlers
  const handleDragOver = useCallback((event: DragEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.types?.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLFormElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
        addFiles(event.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const [isUploading, setIsUploading] = useState(false);

  const submitForm = useCallback(async () => {
    // Navigation mode - used on agent pages to navigate to chat instead of sending
    if (onNavigate) {
      onNavigate(input);
      setLocalStorageInput("");
      setInput("");
      return;
    }

    window.history.pushState({}, "", `/chat/${chatId}`);

    // Build message parts
    const parts: Array<
      | { type: "text"; text: string }
      | { type: "file"; mediaType: string; url: string; filename?: string }
    > = [];

    // Add text part if there's input
    if (input.trim()) {
      parts.push({ type: "text", text: input });
    }

    // Convert and add file parts
    setIsUploading(true);
    try {
      for (const attachment of attachments) {
        try {
          let fileUrl: string;

          if (fileUploadEnabled && attachment.url?.startsWith("blob:")) {
            // Upload to blob storage for public URL
            fileUrl = await uploadFileToBlob(
              attachment.url,
              attachment.filename || "file"
            );
            toast.success(
              `Uploaded ${attachment.filename || "file"} - click the link icon to copy URL`
            );
          } else if (attachment.url?.startsWith("blob:")) {
            // Convert to data URL (original behavior)
            fileUrl = await convertBlobToDataUrl(attachment.url);
          } else {
            fileUrl = attachment.url || "";
          }

          if (fileUrl && attachment.mediaType) {
            parts.push({
              type: "file",
              mediaType: attachment.mediaType,
              url: fileUrl,
              filename: attachment.filename,
            });
          }
        } catch (error) {
          console.error("Failed to process attachment:", error);
          toast.error(`Failed to upload ${attachment.filename}`);
        }
      }
    } finally {
      setIsUploading(false);
    }

    // Don't send empty messages
    if (parts.length === 0) {
      return;
    }

    sendMessage?.({
      role: "user",
      parts,
    });

    setLocalStorageInput("");
    setInput("");
    clearAttachments();

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    input,
    setInput,
    sendMessage,
    setLocalStorageInput,
    width,
    chatId,
    onNavigate,
    attachments,
    clearAttachments,
    fileUploadEnabled,
  ]);

  const isNavigationMode = !!onNavigate;
  const effectiveStatus = status ?? "ready";

  const hasContent = input.trim() || attachments.length > 0;

  return (
    <div className={cn("relative flex w-full flex-col gap-4", className)}>
      {!isNavigationMode && messages?.length === 0 && sendMessage && (
        <SuggestedActions
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType ?? "private"}
          sendMessage={sendMessage}
          suggestions={agentSuggestions}
        />
      )}

      {/* Hidden file input - accepts images and text files */}
      <input
        accept="image/*,.txt,.md,.json,.csv,.xml,.yaml,.yml,.html,.css,.js,.ts,.jsx,.tsx,.py,.rb,.go,.rs,.java,.c,.cpp,.h,.sh,.sql"
        aria-label="Upload files"
        className="hidden"
        multiple
        onChange={handleFileChange}
        ref={fileInputRef}
        type="file"
      />

      <PromptInput
        className={cn(
          "rounded-xl border border-border bg-background p-3 shadow-xs transition-all duration-200 focus-within:border-border hover:border-muted-foreground/50",
          isDragging && "border-primary border-2 bg-primary/5"
        )}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onSubmit={(event) => {
          event.preventDefault();
          if (!hasContent) {
            return;
          }
          if (effectiveStatus !== "ready") {
            toast.error("Please wait for the model to finish its response!");
          } else {
            submitForm();
          }
        }}
      >
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2">
            {attachments.map((attachment) => (
              <div
                className="group relative flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 text-sm"
                key={attachment.id}
              >
                {attachment.mediaType?.startsWith("image/") &&
                attachment.url ? (
                  /* biome-ignore lint/a11y/useAltText: decorative thumbnail */
                  /* biome-ignore lint/performance/noImgElement: blob URLs don't work with Next Image */
                  <img
                    className="size-6 rounded object-cover"
                    src={attachment.url}
                  />
                ) : (
                  <FileTextIcon className="size-4 text-muted-foreground" />
                )}
                <span className="max-w-[120px] truncate text-xs">
                  {attachment.filename || "File"}
                </span>
                <button
                  aria-label={`Remove ${attachment.filename || "attachment"}`}
                  className="ml-1 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeAttachment(attachment.id)}
                  type="button"
                >
                  <XIcon className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-row items-start gap-1 sm:gap-2">
          <PromptInputTextarea
            className="grow resize-none border-0! border-none! bg-transparent p-2 text-base outline-none ring-0 [-ms-overflow-style:none] [scrollbar-width:none] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-scrollbar]:hidden"
            data-testid="multimodal-input"
            onChange={handleInput}
            placeholder={isDragging ? "Drop files here..." : placeholder}
            ref={textareaRef}
            rows={1}
            value={input}
          />
        </div>
        <PromptInputToolbar className="border-top-0! border-t-0! p-0 shadow-none dark:border-0 dark:border-transparent!">
          <PromptInputTools className="gap-0 sm:gap-0.5">
            {/* Attachment button */}
            <Button
              aria-label="Attach images or text files"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Paperclip className="size-4" />
            </Button>
            {showAgentSelector && agents && agents.length > 0 && (
              <AgentSelectorCompact
                agents={agents}
                onAgentChange={onAgentChange}
                selectedAgentId={selectedAgentId}
              />
            )}
            <ModelSelectorCompact
              onModelChange={onModelChange}
              selectedModelId={selectedModelId}
            />
          </PromptInputTools>

          {effectiveStatus === "submitted" && stop && setMessages ? (
            <StopButton setMessages={setMessages} stop={stop} />
          ) : (
            <PromptInputSubmit
              className="size-8 rounded-full bg-primary text-primary-foreground transition-colors duration-200 hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
              data-testid="send-button"
              disabled={!hasContent || isUploading}
              status={isUploading ? "submitted" : effectiveStatus}
            >
              <ArrowUpIcon size={14} />
            </PromptInputSubmit>
          )}
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) {
      return false;
    }
    if (prevProps.status !== nextProps.status) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }
    if (prevProps.selectedModelId !== nextProps.selectedModelId) {
      return false;
    }
    if (prevProps.placeholder !== nextProps.placeholder) {
      return false;
    }
    if (prevProps.selectedAgentId !== nextProps.selectedAgentId) {
      return false;
    }
    if (prevProps.showAgentSelector !== nextProps.showAgentSelector) {
      return false;
    }
    if (prevProps.agents !== nextProps.agents) {
      return false;
    }
    if (prevProps.fileUploadEnabled !== nextProps.fileUploadEnabled) {
      return false;
    }

    return true;
  }
);

function PureModelSelectorCompact({
  selectedModelId,
  onModelChange,
}: {
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const selectedModel =
    chatModels.find((m) => m.id === selectedModelId) ??
    chatModels.find((m) => m.id === DEFAULT_CHAT_MODEL) ??
    chatModels[0];
  const [provider] = selectedModel.id.split("/");

  // Provider display names
  const providerNames: Record<string, string> = {
    anthropic: "Anthropic",
    openai: "OpenAI",
    google: "Google",
    xai: "xAI",
    reasoning: "Reasoning",
  };

  return (
    <ModelSelector onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger asChild>
        <Button className="h-8 w-[200px] justify-between px-2" variant="ghost">
          {provider && <ModelSelectorLogo provider={provider} />}
          <ModelSelectorName>{selectedModel.name}</ModelSelectorName>
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent>
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList>
          {Object.entries(modelsByProvider).map(
            ([providerKey, providerModels]) => (
              <ModelSelectorGroup
                heading={providerNames[providerKey] ?? providerKey}
                key={providerKey}
              >
                {providerModels.map((model) => {
                  const logoProvider = model.id.split("/")[0];
                  return (
                    <ModelSelectorItem
                      key={model.id}
                      onSelect={() => {
                        onModelChange?.(model.id);
                        setCookie("chat-model", model.id);
                        setOpen(false);
                      }}
                      value={model.id}
                    >
                      <ModelSelectorLogo provider={logoProvider} />
                      <ModelSelectorName>{model.name}</ModelSelectorName>
                      {model.id === selectedModel.id && (
                        <CheckIcon className="ml-auto size-4" />
                      )}
                    </ModelSelectorItem>
                  );
                })}
              </ModelSelectorGroup>
            )
          )}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}

const ModelSelectorCompact = memo(PureModelSelectorCompact);

function PureAgentSelectorCompact({
  selectedAgentId,
  onAgentChange,
  agents,
}: {
  selectedAgentId?: string | null;
  onAgentChange?: (agentId: string | null) => void;
  agents: Agent[];
}) {
  const [open, setOpen] = useState(false);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <ModelSelector onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger asChild>
        <Button
          className="h-8 w-[140px] justify-between gap-2 px-2"
          variant="ghost"
        >
          <Bot className="size-3 shrink-0" />
          <ModelSelectorName>
            {selectedAgent?.name ?? "Default"}
          </ModelSelectorName>
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent title="Select Agent">
        <ModelSelectorInput placeholder="Search agents..." />
        <ModelSelectorList>
          <ModelSelectorGroup heading="Agents">
            {agents.map((agentItem) => (
              <ModelSelectorItem
                key={agentItem.id}
                onSelect={() => {
                  onAgentChange?.(agentItem.id);
                  setOpen(false);
                }}
                value={agentItem.id}
              >
                <Bot className="size-3" />
                <ModelSelectorName>{agentItem.name}</ModelSelectorName>
                {agentItem.id === selectedAgentId && (
                  <CheckIcon className="ml-auto size-4" />
                )}
              </ModelSelectorItem>
            ))}
          </ModelSelectorGroup>
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}

const AgentSelectorCompact = memo(PureAgentSelectorCompact);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
}) {
  return (
    <Button
      className="size-7 rounded-full bg-foreground p-1 text-background transition-colors duration-200 hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground"
      data-testid="stop-button"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
    >
      <StopIcon size={14} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);
