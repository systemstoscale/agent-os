"use client";

import { useState } from "react";
import type { AgentFile } from "@/lib/db/schema";
import { Button } from "./ui/button";
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
import { Textarea } from "./ui/textarea";

type AgentFileEditorProps = {
  file?: AgentFile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; content: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
};

export function AgentFileEditor({
  file,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: AgentFileEditorProps) {
  const [name, setName] = useState(file?.name || "");
  const [content, setContent] = useState(file?.content || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setName(file?.name || "");
      setContent(file?.content || "");
    }
    onOpenChange(newOpen);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ name: name.trim(), content });
      onOpenChange(false);
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

  const isEditing = Boolean(file);

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Reference File" : "Add Reference File"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the file name and content below."
              : "Enter a name and content for the new reference file."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-name">File Name</Label>
            <Input
              id="file-name"
              maxLength={255}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., instructions.md"
              value={name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file-content">Content</Label>
            <Textarea
              className="min-h-[300px] font-mono text-sm"
              id="file-content"
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter file content..."
              value={content}
            />
          </div>
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
            disabled={!name.trim() || isSaving || isDeleting}
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
