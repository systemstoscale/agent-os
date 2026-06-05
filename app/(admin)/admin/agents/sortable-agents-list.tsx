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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Agent } from "@/lib/db/schema";
import { SortableAgentCard } from "./sortable-agent-card";

export function SortableAgentsList({
  initialAgents,
}: {
  initialAgents: Agent[];
}) {
  const [agents, setAgents] = useState(initialAgents);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when prop changes (e.g., after navigation)
  useEffect(() => {
    setAgents(initialAgents);
  }, [initialAgents]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = agents.findIndex((item) => item.id === active.id);
      const newIndex = agents.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(agents, oldIndex, newIndex);

      // Update UI immediately
      setAgents(newItems);

      // Persist the new order
      setIsSaving(true);
      try {
        const orderedIds = newItems.map((item) => item.id);
        await fetch("/api/agents/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds }),
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (agents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">No agents found</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/admin/agents/new">Create your first agent</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      {isSaving && (
        <div className="absolute top-0 right-0 flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-muted-foreground text-sm">
          <Loader2 className="size-4 animate-spin" />
          Saving...
        </div>
      )}
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <SortableContext
          items={agents.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid gap-4">
            {agents.map((agent) => (
              <SortableAgentCard agent={agent} key={agent.id} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
