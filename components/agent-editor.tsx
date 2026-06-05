"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type {
  Agent,
  AgentFile,
  AgentTool,
  AgentToolAssignment,
} from "@/lib/db/schema";
import { AgentFilesManager } from "./agent-files-manager";
import { AgentToolAssignmentsManager } from "./agent-tool-assignments-manager";
import {
  SystemPromptEditor,
  SystemPromptExpandButton,
} from "./system-prompt-editor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

type ToolWithAssignment = AgentTool & {
  assignment: AgentToolAssignment | null;
};

type AgentEditorProps = {
  agent?: Agent;
  initialFiles?: AgentFile[];
  globalTools?: AgentTool[];
  availableTools?: ToolWithAssignment[];
};

type SuggestionItem = {
  id: string;
  value: string;
};

let suggestionIdCounter = 0;
const generateSuggestionId = () => `suggestion-${++suggestionIdCounter}`;

export function AgentEditor({
  agent,
  initialFiles,
  globalTools,
  availableTools,
}: AgentEditorProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState(agent?.name || "");
  const [description, setDescription] = useState(agent?.description || "");
  const [systemPrompt, setSystemPrompt] = useState(agent?.systemPrompt || "");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>(() => {
    const initial = agent?.suggestions || [""];
    return initial.map((value) => ({ id: generateSuggestionId(), value }));
  });
  const [isPublished, setIsPublished] = useState(agent?.isPublished || false);
  const [isDefault, setIsDefault] = useState(agent?.isDefault || false);
  const [showDefaultConfirm, setShowDefaultConfirm] = useState(false);
  const [documentToolsEnabled, setDocumentToolsEnabled] = useState(
    agent?.documentToolsEnabled ?? false
  );
  const [documentToolsPrompt, setDocumentToolsPrompt] = useState(
    agent?.documentToolsPrompt || ""
  );
  const [fileUploadEnabled, setFileUploadEnabled] = useState(
    agent?.fileUploadEnabled ?? false
  );
  const [promptEditorOpen, setPromptEditorOpen] = useState(false);

  const isCreateMode = !agent;

  const handleAddSuggestion = () => {
    if (suggestions.length < 4) {
      setSuggestions([
        ...suggestions,
        { id: generateSuggestionId(), value: "" },
      ]);
    }
  };

  const handleRemoveSuggestion = (id: string) => {
    setSuggestions(suggestions.filter((s) => s.id !== id));
  };

  const handleSuggestionChange = (id: string, value: string) => {
    setSuggestions(suggestions.map((s) => (s.id === id ? { ...s, value } : s)));
  };

  const handleDefaultCheckboxChange = (checked: boolean) => {
    if (checked && !agent?.isDefault) {
      setShowDefaultConfirm(true);
    }
  };

  const handleConfirmDefault = () => {
    setIsDefault(true);
    setIsPublished(true);
    setShowDefaultConfirm(false);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name,
        description: description || undefined,
        systemPrompt: "You are a helpful assistant.",
        suggestions: [],
        isPublished: false,
      };

      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create agent");
      }

      const newAgent = await response.json();
      toast.success("Agent created! Now configure the details.");
      router.push(`/admin/agents/${newAgent.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create agent"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const filteredSuggestions = suggestions
        .map((s) => s.value)
        .filter((v) => v.trim() !== "");
      const payload: Record<string, unknown> = {
        name,
        description: description || undefined,
        systemPrompt,
        suggestions: filteredSuggestions,
        isPublished,
        documentToolsEnabled,
        documentToolsPrompt: documentToolsPrompt.trim() || null,
        fileUploadEnabled,
      };

      if (isDefault && !agent?.isDefault) {
        payload.isDefault = true;
      }

      const response = await fetch(`/api/agents/${agent?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save agent");
      }

      toast.success("Agent updated successfully");
      router.push("/admin/agents");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save agent"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simplified create form
  if (isCreateMode) {
    return (
      <Card>
        <CardContent className="pt-6">
          <form className="space-y-6" onSubmit={handleCreateSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Code Assistant"
                required
                value={name}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                maxLength={500}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of what this agent does"
                value={description}
              />
            </div>

            <div className="flex gap-4">
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? "Creating..." : "Create Agent"}
              </Button>
              <Button
                onClick={() => router.push("/admin/agents")}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Full edit form
  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <form className="space-y-6" onSubmit={handleEditSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Code Assistant"
                required
                value={name}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                maxLength={500}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of what this agent does"
                value={description}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <SystemPromptExpandButton
                  onClick={() => setPromptEditorOpen(true)}
                />
              </div>
              <Textarea
                className="min-h-[200px] font-mono text-sm"
                id="systemPrompt"
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant that..."
                required
                value={systemPrompt}
              />
              <p className="text-muted-foreground text-xs">
                This prompt will be used as the AI&apos;s system instructions
              </p>
            </div>

            <SystemPromptEditor
              onChange={setSystemPrompt}
              onOpenChange={setPromptEditorOpen}
              open={promptEditorOpen}
              value={systemPrompt}
            />

            <div className="space-y-3">
              <Label>Conversation Starters</Label>

              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <div className="flex gap-2" key={suggestion.id}>
                    <Input
                      onChange={(e) =>
                        handleSuggestionChange(suggestion.id, e.target.value)
                      }
                      placeholder={`Suggestion ${index + 1}`}
                      value={suggestion.value}
                    />
                    <Button
                      onClick={() => handleRemoveSuggestion(suggestion.id)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <span className="sr-only">Remove</span>
                      <span aria-hidden="true">&times;</span>
                    </Button>
                  </div>
                ))}
              </div>

              {suggestions.length < 4 && (
                <Button
                  className="w-full"
                  onClick={handleAddSuggestion}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Plus className="mr-1 size-4" />
                  Add Suggestion
                </Button>
              )}

              <p className="text-muted-foreground text-xs">
                These will appear as clickable suggestions when starting a new
                chat
              </p>
            </div>

            <AgentFilesManager
              agentId={agent.id}
              initialFiles={initialFiles || []}
            />

            <AgentToolAssignmentsManager
              agentId={agent.id}
              availableTools={availableTools || []}
              globalTools={globalTools || []}
            />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  checked={documentToolsEnabled}
                  className="size-4"
                  id="documentToolsEnabled"
                  onChange={(e) => setDocumentToolsEnabled(e.target.checked)}
                  type="checkbox"
                />
                <Label
                  className="cursor-pointer"
                  htmlFor="documentToolsEnabled"
                >
                  Enable Artifacts (create/edit documents)
                </Label>
              </div>
              <p className="text-muted-foreground text-xs">
                Allows the AI to create and edit documents in a side panel
              </p>

              {documentToolsEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="documentToolsPrompt">
                    Artifact Creation Guidelines (optional)
                  </Label>
                  <Textarea
                    className="min-h-[120px] font-mono text-sm"
                    id="documentToolsPrompt"
                    onChange={(e) => setDocumentToolsPrompt(e.target.value)}
                    placeholder={`**When to use \`createDocument\`:**
- When the user specifically asks for a document or artifact.

**When NOT to use \`createDocument\`:**
- Except when the user specifically asked for a document or artifact.`}
                    value={documentToolsPrompt}
                  />
                  <p className="text-muted-foreground text-xs">
                    Customize when the AI should create artifacts. If left
                    blank, the AI will only create artifacts when explicitly
                    requested by the user.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  checked={fileUploadEnabled}
                  className="size-4"
                  id="fileUploadEnabled"
                  onChange={(e) => setFileUploadEnabled(e.target.checked)}
                  type="checkbox"
                />
                <Label className="cursor-pointer" htmlFor="fileUploadEnabled">
                  Enable file uploads with public URLs
                </Label>
              </div>
              <p className="text-muted-foreground text-xs">
                When enabled, files attached to messages will be uploaded to
                cloud storage with shareable public URLs that you can copy and
                share.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                checked={isPublished}
                className="size-4"
                disabled={agent.isDefault || isDefault}
                id="isPublished"
                onChange={(e) => setIsPublished(e.target.checked)}
                type="checkbox"
              />
              <Label className="cursor-pointer" htmlFor="isPublished">
                Published
              </Label>
              <span className="text-muted-foreground text-sm">
                (Only published agents are visible to users)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {agent.isDefault ? (
                <>
                  <Badge variant="secondary">Default Agent</Badge>
                  <span className="text-muted-foreground text-sm">
                    This agent is shown to all users by default
                  </span>
                </>
              ) : (
                <>
                  <input
                    checked={isDefault}
                    className="size-4"
                    id="isDefault"
                    onChange={(e) =>
                      handleDefaultCheckboxChange(e.target.checked)
                    }
                    type="checkbox"
                  />
                  <Label className="cursor-pointer" htmlFor="isDefault">
                    Set as Default
                  </Label>
                  <span className="text-muted-foreground text-sm">
                    (Default agent is shown to all users)
                  </span>
                </>
              )}
            </div>

            <div className="flex gap-4">
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? "Saving..." : "Update Agent"}
              </Button>
              <Button
                onClick={() => router.push("/admin/agents")}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <AlertDialog
        onOpenChange={setShowDefaultConfirm}
        open={showDefaultConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set as Default Agent?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to make this the default agent for all
              users? This will replace the current default agent and
              automatically publish this agent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDefault}>
              Set as Default
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
