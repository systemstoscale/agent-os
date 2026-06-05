"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { AgentTool, AgentToolParameter } from "@/lib/db/schema";
import { Button } from "./ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";

type AgentToolEditorProps = {
  tool?: AgentTool;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    name: string;
    description: string;
    url: string;
    method: string;
    headers: Record<string, string>;
    aiParameters: AgentToolParameter[];
    staticValues: Record<string, string>;
    isEnabled: boolean;
    requiresApproval: boolean;
    showDetailsToUsers: boolean;
    isGlobal: boolean;
    timeout: number;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  showGlobalToggle?: boolean;
};

type HeaderEntry = { id: string; key: string; value: string };
type StaticValueEntry = { id: string; key: string; value: string };
type ParameterEntry = AgentToolParameter & { id: string };

let idCounter = 0;
const generateId = () => `entry-${++idCounter}`;

const SortableParameterRow = ({
  param,
  onUpdate,
  onRemove,
}: {
  param: ParameterEntry;
  onUpdate: (id: string, field: keyof ParameterEntry, value: unknown) => void;
  onRemove: (id: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: param.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      className="grid gap-2 rounded-md border p-3 sm:grid-cols-[auto_1fr_100px_1fr_auto_auto]"
      ref={setNodeRef}
      style={style}
    >
      <button
        aria-label="Drag to reorder"
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <Input
        onChange={(e) => onUpdate(param.id, "name", e.target.value)}
        placeholder="Parameter name"
        value={param.name}
      />
      <Select
        onValueChange={(v) =>
          onUpdate(param.id, "type", v as "string" | "number" | "boolean")
        }
        value={param.type}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="string">String</SelectItem>
          <SelectItem value="number">Number</SelectItem>
          <SelectItem value="boolean">Boolean</SelectItem>
        </SelectContent>
      </Select>
      <Input
        onChange={(e) => onUpdate(param.id, "description", e.target.value)}
        placeholder="Description for AI"
        value={param.description}
      />
      <div className="flex items-center gap-2">
        <Switch
          checked={param.required}
          onCheckedChange={(v) => onUpdate(param.id, "required", v)}
        />
        <span className="text-sm">Req</span>
      </div>
      <Button
        className="text-destructive"
        onClick={() => onRemove(param.id)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
};

const SortableStaticValueRow = ({
  sv,
  onUpdate,
  onRemove,
}: {
  sv: StaticValueEntry;
  onUpdate: (id: string, field: "key" | "value", value: string) => void;
  onRemove: (id: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sv.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div className="flex gap-2" ref={setNodeRef} style={style}>
      <button
        aria-label="Drag to reorder"
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <Input
        className="flex-1"
        onChange={(e) => onUpdate(sv.id, "key", e.target.value)}
        placeholder="Key"
        value={sv.key}
      />
      <Input
        className="flex-1"
        onChange={(e) => onUpdate(sv.id, "value", e.target.value)}
        placeholder="Value"
        type="password"
        value={sv.value}
      />
      <Button
        className="text-destructive"
        onClick={() => onRemove(sv.id)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
};

export function AgentToolEditor({
  tool,
  open,
  onOpenChange,
  onSave,
  onDelete,
  showGlobalToggle = true,
}: AgentToolEditorProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<"GET" | "POST">("POST");
  const [headers, setHeaders] = useState<HeaderEntry[]>([]);
  const [aiParameters, setAiParameters] = useState<ParameterEntry[]>([]);
  const [staticValues, setStaticValues] = useState<StaticValueEntry[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [showDetailsToUsers, setShowDetailsToUsers] = useState(false);
  const [isGlobal, setIsGlobal] = useState(false);
  const [timeout, setTimeout] = useState(30);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [headersOpen, setHeadersOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setName(tool?.name || "");
      setDescription(tool?.description || "");
      setUrl(tool?.url || "");
      setMethod((tool?.method as "GET" | "POST") || "POST");
      setIsEnabled(tool?.isEnabled ?? true);
      setRequiresApproval(tool?.requiresApproval ?? true);
      setShowDetailsToUsers(tool?.showDetailsToUsers ?? false);
      setIsGlobal(tool?.isGlobal ?? false);
      setTimeout(tool?.timeout ?? 30);

      // Convert headers object to array
      const headerEntries = Object.entries(tool?.headers || {}).map(
        ([key, value]) => ({
          id: generateId(),
          key,
          value,
        })
      );
      setHeaders(headerEntries);

      // Convert aiParameters to array with ids
      const paramEntries = (tool?.aiParameters || []).map((p) => ({
        ...p,
        id: generateId(),
      }));
      setAiParameters(paramEntries);

      // Convert staticValues object to array
      const staticEntries = Object.entries(tool?.staticValues || {}).map(
        ([key, value]) => ({
          id: generateId(),
          key,
          value,
        })
      );
      setStaticValues(staticEntries);

      setHeadersOpen(headerEntries.length > 0);
    }
  }, [open, tool]);

  const handleSave = async () => {
    if (!name.trim() || !description.trim() || !url.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      // Convert headers array back to object
      const headersObj: Record<string, string> = {};
      for (const h of headers) {
        if (h.key.trim()) {
          headersObj[h.key.trim()] = h.value;
        }
      }

      // Convert aiParameters array back (remove id)
      const params: AgentToolParameter[] = aiParameters
        .filter((p) => p.name.trim())
        .map(({ name: pName, type, description: pDesc, required }) => ({
          name: pName.trim(),
          type,
          description: pDesc,
          required,
        }));

      // Convert staticValues array back to object
      const staticObj: Record<string, string> = {};
      for (const s of staticValues) {
        if (s.key.trim()) {
          staticObj[s.key.trim()] = s.value;
        }
      }

      await onSave({
        name: name.trim(),
        description: description.trim(),
        url: url.trim(),
        method,
        headers: headersObj,
        aiParameters: params,
        staticValues: staticObj,
        isEnabled,
        requiresApproval,
        showDetailsToUsers,
        isGlobal,
        timeout,
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save tool"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete();
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const addParameter = () => {
    setAiParameters([
      ...aiParameters,
      {
        id: generateId(),
        name: "",
        type: "string",
        description: "",
        required: false,
      },
    ]);
  };

  const updateParameter = (
    id: string,
    field: keyof ParameterEntry,
    value: unknown
  ) => {
    setAiParameters(
      aiParameters.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const removeParameter = (id: string) => {
    setAiParameters(aiParameters.filter((p) => p.id !== id));
  };

  const addStaticValue = () => {
    setStaticValues([
      ...staticValues,
      { id: generateId(), key: "", value: "" },
    ]);
  };

  const updateStaticValue = (
    id: string,
    field: "key" | "value",
    value: string
  ) => {
    setStaticValues(
      staticValues.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const removeStaticValue = (id: string) => {
    setStaticValues(staticValues.filter((s) => s.id !== id));
  };

  const addHeader = () => {
    setHeaders([...headers, { id: generateId(), key: "", value: "" }]);
  };

  const updateHeader = (id: string, field: "key" | "value", value: string) => {
    setHeaders(
      headers.map((h) => (h.id === id ? { ...h, [field]: value } : h))
    );
  };

  const removeHeader = (id: string) => {
    setHeaders(headers.filter((h) => h.id !== id));
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleParameterDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = aiParameters.findIndex((p) => p.id === active.id);
      const newIndex = aiParameters.findIndex((p) => p.id === over.id);
      setAiParameters(arrayMove(aiParameters, oldIndex, newIndex));
    }
  };

  const handleStaticValueDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = staticValues.findIndex((s) => s.id === active.id);
      const newIndex = staticValues.findIndex((s) => s.id === over.id);
      setStaticValues(arrayMove(staticValues, oldIndex, newIndex));
    }
  };

  const isEditing = Boolean(tool);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Webhook Tool" : "Add Webhook Tool"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the webhook tool configuration."
              : "Configure a new webhook-based tool for the AI."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tool-name">Tool Name</Label>
              <Input
                id="tool-name"
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., get_user_data"
                value={name}
              />
              <p className="text-muted-foreground text-xs">
                Use snake_case for tool names (alphanumeric and underscores)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tool-description">Description</Label>
              <Textarea
                className="min-h-[80px]"
                id="tool-description"
                maxLength={2000}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this tool does and when the AI should use it..."
                value={description}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_120px_120px]">
              <div className="space-y-2">
                <Label htmlFor="tool-url">Webhook URL</Label>
                <Input
                  id="tool-url"
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/webhook"
                  type="url"
                  value={url}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tool-method">Method</Label>
                <Select
                  onValueChange={(v) => setMethod(v as "GET" | "POST")}
                  value={method}
                >
                  <SelectTrigger id="tool-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="GET">GET</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tool-timeout">Timeout</Label>
                <div className="flex items-center gap-1">
                  <Input
                    className="w-20"
                    id="tool-timeout"
                    max={600}
                    min={1}
                    onChange={(e) =>
                      setTimeout(
                        Math.max(1, Math.min(600, Number(e.target.value) || 30))
                      )
                    }
                    type="number"
                    value={timeout}
                  />
                  <span className="text-muted-foreground text-sm">sec</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Parameters */}
          <div className="space-y-3">
            <div>
              <Label>AI Parameters</Label>
              <p className="text-muted-foreground text-xs">
                Parameters the AI will provide when calling this tool
              </p>
            </div>

            {aiParameters.length > 0 ? (
              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={handleParameterDragEnd}
                sensors={sensors}
              >
                <SortableContext
                  items={aiParameters.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {aiParameters.map((param) => (
                      <SortableParameterRow
                        key={param.id}
                        onRemove={removeParameter}
                        onUpdate={updateParameter}
                        param={param}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="py-2 text-center text-muted-foreground text-sm">
                No parameters defined
              </p>
            )}

            <Button
              className="w-full"
              onClick={addParameter}
              size="sm"
              type="button"
              variant="outline"
            >
              <Plus className="mr-1 size-4" />
              Add AI Parameter
            </Button>
          </div>

          {/* Static Values */}
          <div className="space-y-3">
            <div>
              <Label>Static Values</Label>
              <p className="text-muted-foreground text-xs">
                Hidden values always sent with the request (e.g., API keys)
              </p>
            </div>

            {staticValues.length > 0 ? (
              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={handleStaticValueDragEnd}
                sensors={sensors}
              >
                <SortableContext
                  items={staticValues.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {staticValues.map((sv) => (
                      <SortableStaticValueRow
                        key={sv.id}
                        onRemove={removeStaticValue}
                        onUpdate={updateStaticValue}
                        sv={sv}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="py-2 text-center text-muted-foreground text-sm">
                No static values defined
              </p>
            )}

            <Button
              className="w-full"
              onClick={addStaticValue}
              size="sm"
              type="button"
              variant="outline"
            >
              <Plus className="mr-1 size-4" />
              Add Static Value
            </Button>
          </div>

          {/* Headers (collapsible) */}
          <Collapsible onOpenChange={setHeadersOpen} open={headersOpen}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button className="gap-2 p-0" type="button" variant="ghost">
                  <ChevronDown
                    className={`size-4 transition-transform ${headersOpen ? "" : "-rotate-90"}`}
                  />
                  <span>Custom Headers</span>
                  {headers.length > 0 && (
                    <span className="text-muted-foreground">
                      ({headers.length})
                    </span>
                  )}
                </Button>
              </CollapsibleTrigger>
              {headersOpen && (
                <Button
                  onClick={addHeader}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Plus className="mr-1 size-4" />
                  Add
                </Button>
              )}
            </div>
            <CollapsibleContent className="pt-3">
              {headers.length > 0 ? (
                <div className="space-y-2">
                  {headers.map((h) => (
                    <div className="flex gap-2" key={h.id}>
                      <Input
                        className="flex-1"
                        onChange={(e) =>
                          updateHeader(h.id, "key", e.target.value)
                        }
                        placeholder="Header name"
                        value={h.key}
                      />
                      <Input
                        className="flex-1"
                        onChange={(e) =>
                          updateHeader(h.id, "value", e.target.value)
                        }
                        placeholder="Header value"
                        value={h.value}
                      />
                      <Button
                        className="text-destructive"
                        onClick={() => removeHeader(h.id)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-2 text-center text-muted-foreground text-sm">
                  No custom headers defined
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Enabled toggle */}
          <div className="flex items-center gap-3">
            <Switch
              checked={isEnabled}
              id="tool-enabled"
              onCheckedChange={setIsEnabled}
            />
            <Label htmlFor="tool-enabled">
              Enabled
              <span className="ml-2 text-muted-foreground text-sm">
                (Disabled tools won&apos;t be available to the AI)
              </span>
            </Label>
          </div>

          {/* Requires Approval toggle */}
          <div className="flex items-center gap-3">
            <Switch
              checked={requiresApproval}
              id="tool-requires-approval"
              onCheckedChange={setRequiresApproval}
            />
            <Label htmlFor="tool-requires-approval">
              Require User Approval
              <span className="ml-2 text-muted-foreground text-sm">
                (User must confirm before the tool executes)
              </span>
            </Label>
          </div>

          {/* Show Details to Users toggle */}
          <div className="flex items-center gap-3">
            <Switch
              checked={showDetailsToUsers}
              id="tool-show-details"
              onCheckedChange={setShowDetailsToUsers}
            />
            <Label htmlFor="tool-show-details">
              Show Details to Users
              <span className="ml-2 text-muted-foreground text-sm">
                (Non-admin users can see tool parameters and results)
              </span>
            </Label>
          </div>

          {/* Global toggle */}
          {showGlobalToggle && (
            <div className="flex items-center gap-3">
              <Switch
                checked={isGlobal}
                id="tool-is-global"
                onCheckedChange={setIsGlobal}
              />
              <Label htmlFor="tool-is-global">
                Global Tool
                <span className="ml-2 text-muted-foreground text-sm">
                  (Available to all agents automatically)
                </span>
              </Label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {isEditing && onDelete && (
            <Button
              className="mr-auto"
              disabled={isDeleting || isSaving}
              onClick={handleDelete}
              type="button"
              variant="destructive"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          )}
          <Button
            disabled={isSaving || isDeleting}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={
              !name.trim() ||
              !description.trim() ||
              !url.trim() ||
              isSaving ||
              isDeleting
            }
            onClick={handleSave}
            type="button"
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
