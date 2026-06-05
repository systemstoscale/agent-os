"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Agent } from "@/lib/db/schema";
import { DeleteAgentButton } from "./delete-agent-button";

export function SortableAgentCard({ agent }: { agent: Agent }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: agent.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <button
              aria-label="Drag to reorder"
              className="mt-1 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
              type="button"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-5" />
            </button>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{agent.name}</CardTitle>
                {agent.isDefault && <Badge variant="secondary">Default</Badge>}
                {agent.isPublished ? (
                  <Badge variant="default">Published</Badge>
                ) : (
                  <Badge variant="outline">Draft</Badge>
                )}
              </div>
              {agent.description && (
                <CardDescription>{agent.description}</CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button asChild size="icon-sm" variant="ghost">
              <Link
                aria-label={`Edit ${agent.name}`}
                href={`/admin/agents/${agent.id}`}
              >
                <Pencil className="size-4" />
              </Link>
            </Button>
            {!agent.isDefault && <DeleteAgentButton agentId={agent.id} />}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
