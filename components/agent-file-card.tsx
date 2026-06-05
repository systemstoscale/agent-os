"use client";

import { FileText, Pencil, Trash2 } from "lucide-react";
import type { AgentFile } from "@/lib/db/schema";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

type AgentFileCardProps = {
  file: AgentFile;
  onEdit: () => void;
  onDelete: () => void;
};

export function AgentFileCard({ file, onEdit, onDelete }: AgentFileCardProps) {
  const lineCount = file.content.split("\n").length;

  return (
    <div className="flex w-full items-center gap-3 rounded-lg border bg-card p-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
        <FileText className="size-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-sm">{file.name}</p>
        <p className="text-muted-foreground text-xs">
          {lineCount} {lineCount === 1 ? "line" : "lines"}
        </p>
      </div>
      <Badge className="shrink-0" variant="secondary">
        TEXT
      </Badge>
      <div className="flex shrink-0 gap-1">
        <Button
          aria-label={`Edit ${file.name}`}
          onClick={onEdit}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          aria-label={`Delete ${file.name}`}
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
