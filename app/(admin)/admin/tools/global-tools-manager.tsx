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
import { Globe, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AgentToolCard } from "@/components/agent-tool-card";
import { AgentToolEditor } from "@/components/agent-tool-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgentTool, AgentToolParameter } from "@/lib/db/schema";

type ToolsManagerProps = {
  initialTools: AgentTool[];
};

const SortableToolCard = ({
  tool,
  onEdit,
  onDelete,
  onToggleEnabled,
}: {
  tool: AgentTool;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEnabled: (enabled: boolean) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tool.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <AgentToolCard
        dragHandleProps={{ attributes: attributes as unknown as Record<string, unknown>, listeners: listeners as unknown as Record<string, unknown> }}
        onDelete={onDelete}
        onEdit={onEdit}
        onToggleEnabled={onToggleEnabled}
        tool={tool}
      />
    </div>
  );
};

export function ToolsManager({ initialTools }: ToolsManagerProps) {
  const [tools, setTools] = useState<AgentTool[]>(initialTools);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<AgentTool | undefined>();

  const handleAddClick = () => {
    setEditingTool(undefined);
    setEditorOpen(true);
  };

  const handleToolClick = (tool: AgentTool) => {
    setEditingTool(tool);
    setEditorOpen(true);
  };

  const handleSave = async (data: {
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
  }) => {
    if (editingTool) {
      const response = await fetch(`/api/tools/${editingTool.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          errorData.details?.[0]?.message ||
          errorData.error ||
          "Failed to update tool";
        throw new Error(message);
      }

      const updatedTool = await response.json();
      setTools((prev) =>
        prev.map((t) => (t.id === editingTool.id ? updatedTool : t))
      );
      toast.success("Tool updated");
    } else {
      const response = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          errorData.details?.[0]?.message ||
          errorData.error ||
          "Failed to create tool";
        throw new Error(message);
      }

      const newTool = await response.json();
      setTools((prev) => [...prev, newTool]);
      toast.success("Tool created");
    }
  };

  const handleDelete = async (toolToDelete?: AgentTool) => {
    const targetTool = toolToDelete || editingTool;
    if (!targetTool) {
      return;
    }

    const response = await fetch(`/api/tools/${targetTool.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete tool");
    }

    setTools((prev) => prev.filter((t) => t.id !== targetTool.id));
    toast.success("Tool deleted");
  };

  const handleToggleEnabled = async (tool: AgentTool, enabled: boolean) => {
    try {
      const response = await fetch(`/api/tools/${tool.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: enabled }),
      });

      if (!response.ok) {
        throw new Error("Failed to update tool");
      }

      const updatedTool = await response.json();
      setTools((prev) => prev.map((t) => (t.id === tool.id ? updatedTool : t)));
      toast.success(enabled ? "Tool enabled" : "Tool disabled");
    } catch (_error) {
      toast.error("Failed to update tool");
    }
  };

  const globalTools = tools.filter((t) => t.isGlobal);
  const nonGlobalTools = tools.filter((t) => !t.isGlobal);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = tools.findIndex((t) => t.id === active.id);
    const newIndex = tools.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(tools, oldIndex, newIndex);
    setTools(reordered);

    try {
      const response = await fetch("/api/tools/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((t) => t.id) }),
      });

      if (!response.ok) {
        throw new Error("Failed to save order");
      }
    } catch (_error) {
      setTools(tools);
      toast.error("Failed to reorder tools");
    }
  };

  return (
    <section aria-label="Tools management section" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-lg">Webhook Tools</h2>
        <Button
          onClick={handleAddClick}
          size="sm"
          type="button"
          variant="outline"
        >
          <Plus className="mr-1 size-4" />
          Add Tool
        </Button>
      </div>

      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <SortableContext
          items={tools.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {/* Global Tools Section */}
          {globalTools.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-muted-foreground" />
                <h3 className="font-medium text-sm">Global Tools</h3>
                <Badge variant="secondary">Available to all agents</Badge>
              </div>
              <div className="flex flex-col gap-2">
                {globalTools.map((tool) => (
                  <SortableToolCard
                    key={tool.id}
                    onDelete={() => handleDelete(tool)}
                    onEdit={() => handleToolClick(tool)}
                    onToggleEnabled={(enabled) =>
                      handleToggleEnabled(tool, enabled)
                    }
                    tool={tool}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Non-Global Tools Section */}
          {nonGlobalTools.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm">Agent-Assignable Tools</h3>
                <Badge variant="outline">Must be assigned to agents</Badge>
              </div>
              <div className="flex flex-col gap-2">
                {nonGlobalTools.map((tool) => (
                  <SortableToolCard
                    key={tool.id}
                    onDelete={() => handleDelete(tool)}
                    onEdit={() => handleToolClick(tool)}
                    onToggleEnabled={(enabled) =>
                      handleToggleEnabled(tool, enabled)
                    }
                    tool={tool}
                  />
                ))}
              </div>
            </div>
          )}
        </SortableContext>
      </DndContext>

      {tools.length === 0 && (
        <p className="py-4 text-center text-muted-foreground text-sm">
          No webhook tools yet. Click &quot;Add Tool&quot; to create one.
        </p>
      )}

      <div className="space-y-2 text-muted-foreground text-xs">
        <p>
          <strong>Global tools</strong> are automatically available in all agent
          conversations.
        </p>
        <p>
          <strong>Agent-assignable tools</strong> must be individually assigned
          to each agent that needs them.
        </p>
      </div>

      <AgentToolEditor
        onDelete={editingTool ? handleDelete : undefined}
        onOpenChange={setEditorOpen}
        onSave={handleSave}
        open={editorOpen}
        tool={editingTool}
      />
    </section>
  );
}
