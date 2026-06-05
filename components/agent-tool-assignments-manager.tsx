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
import { Globe, GripVertical } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { AgentTool, AgentToolAssignment } from "@/lib/db/schema";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

type ToolWithAssignment = AgentTool & {
  assignment: AgentToolAssignment | null;
};

type AgentToolAssignmentsManagerProps = {
  agentId: string;
  globalTools: AgentTool[];
  availableTools: ToolWithAssignment[];
};

const SortableToolRow = ({
  tool,
  onToggle,
}: {
  tool: ToolWithAssignment;
  onToggle: () => void;
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
    <div
      className="flex items-center justify-between rounded-md border p-3"
      ref={setNodeRef}
      style={style}
    >
      <div className="flex items-center gap-2">
        <button
          aria-label="Drag to reorder"
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="flex-1 pr-4">
          <span className="font-medium text-sm">{tool.name}</span>
          <p className="line-clamp-1 text-muted-foreground text-xs">
            {tool.description}
          </p>
        </div>
      </div>
      <Switch
        checked={tool.assignment?.isEnabled ?? false}
        onCheckedChange={onToggle}
      />
    </div>
  );
};

export function AgentToolAssignmentsManager({
  agentId,
  globalTools,
  availableTools,
}: AgentToolAssignmentsManagerProps) {
  const [assignments, setAssignments] =
    useState<ToolWithAssignment[]>(availableTools);

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

    const oldIndex = assignments.findIndex((t) => t.id === active.id);
    const newIndex = assignments.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(assignments, oldIndex, newIndex);
    setAssignments(reordered);

    try {
      const response = await fetch(
        `/api/agents/${agentId}/tool-assignments/reorder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderedToolIds: reordered.map((t) => t.id),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save order");
      }
    } catch (_error) {
      setAssignments(assignments);
      toast.error("Failed to reorder tools");
    }
  };

  const handleToggleAssignment = async (tool: ToolWithAssignment) => {
    const isCurrentlyEnabled = tool.assignment?.isEnabled ?? false;
    const newEnabledState = !isCurrentlyEnabled;

    try {
      const response = await fetch(`/api/agents/${agentId}/tool-assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolId: tool.id,
          isEnabled: newEnabledState,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update tool assignment");
      }

      const updatedAssignment = await response.json();

      setAssignments((prev) =>
        prev.map((t) =>
          t.id === tool.id ? { ...t, assignment: updatedAssignment } : t
        )
      );

      toast.success(
        newEnabledState
          ? `${tool.name} enabled for this agent`
          : `${tool.name} disabled for this agent`
      );
    } catch (_error) {
      toast.error("Failed to update tool assignment");
    }
  };

  return (
    <section aria-label="Tool assignments section" className="space-y-4">
      <Label>Webhook Tools</Label>

      {/* Global Tools (read-only) */}
      {globalTools.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" />
            <span className="font-medium text-sm">Global Tools</span>
            <Badge variant="secondary">Always enabled</Badge>
          </div>
          <div className="space-y-2 rounded-md border bg-muted/50 p-3">
            {globalTools.map((tool) => (
              <div className="flex items-center justify-between" key={tool.id}>
                <div>
                  <span className="font-medium text-sm">{tool.name}</span>
                  <p className="line-clamp-1 text-muted-foreground text-xs">
                    {tool.description}
                  </p>
                </div>
                <Badge variant="outline">Global</Badge>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            Global tools are automatically available in all agent conversations.
          </p>
        </div>
      )}

      {/* Assignable Tools (with toggles) */}
      {assignments.length > 0 && (
        <div className="space-y-3">
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <SortableContext
              items={assignments.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {assignments.map((tool) => (
                  <SortableToolRow
                    key={tool.id}
                    onToggle={() => handleToggleAssignment(tool)}
                    tool={tool}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <p className="text-muted-foreground text-xs">
            Toggle tools on/off to make them available for this agent. Drag to
            reorder.
          </p>
        </div>
      )}

      {globalTools.length === 0 && assignments.length === 0 && (
        <p className="py-4 text-center text-muted-foreground text-sm">
          No webhook tools available. Create tools in the Tools section first.
        </p>
      )}
    </section>
  );
}
