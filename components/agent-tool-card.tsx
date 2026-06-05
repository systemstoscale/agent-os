"use client";

import { GripVertical, Pencil, Trash2, Webhook } from "lucide-react";
import type { AgentTool } from "@/lib/db/schema";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";

type AgentToolCardProps = {
  tool: AgentTool;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  dragHandleProps?: {
    attributes: Record<string, unknown>;
    listeners: Record<string, unknown>;
  };
};

export function AgentToolCard({
  tool,
  onEdit,
  onDelete,
  onToggleEnabled,
  dragHandleProps,
}: AgentToolCardProps) {
  const paramCount = tool.aiParameters?.length || 0;

  return (
    <div className="flex w-full items-center gap-3 rounded-lg border bg-card p-3">
      {dragHandleProps && (
        <button
          aria-label="Drag to reorder"
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
          type="button"
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
        >
          <GripVertical className="size-4" />
        </button>
      )}
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
        <Webhook className="size-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-sm">{tool.name}</p>
        <p className="text-muted-foreground text-xs">
          {paramCount} {paramCount === 1 ? "parameter" : "parameters"}
        </p>
      </div>
      <Badge className="shrink-0" variant="secondary">
        {tool.method}
      </Badge>
      <div className="flex shrink-0 items-center gap-2">
        <Switch
          aria-label={`Enable ${tool.name}`}
          checked={tool.isEnabled}
          onCheckedChange={onToggleEnabled}
        />
        <Button
          aria-label={`Edit ${tool.name}`}
          onClick={onEdit}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          aria-label={`Delete ${tool.name}`}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onDelete}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
