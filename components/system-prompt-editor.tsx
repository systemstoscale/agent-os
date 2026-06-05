"use client";

import { Expand } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

type SystemPromptEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
};

export function SystemPromptEditor({
  open,
  onOpenChange,
  value,
  onChange,
}: SystemPromptEditorProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit System Prompt</DialogTitle>
          <DialogDescription>
            Edit the system prompt in full-screen mode for easier editing of
            long prompts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="system-prompt-expanded">System Prompt</Label>
          <Textarea
            className="min-h-[600px] font-mono text-sm"
            id="system-prompt-expanded"
            onChange={(e) => onChange(e.target.value)}
            placeholder="You are a helpful assistant that..."
            value={value}
          />
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SystemPromptExpandButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      aria-label="Expand system prompt editor"
      onClick={onClick}
      size="sm"
      type="button"
      variant="ghost"
    >
      <Expand className="size-4" />
      <span className="ml-1">Expand</span>
    </Button>
  );
}
