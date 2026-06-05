"use client";

import { FileText, Plus, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { AgentFile } from "@/lib/db/schema";
import { AgentFileCard } from "./agent-file-card";
import { AgentFileEditor } from "./agent-file-editor";
import { Button } from "./ui/button";
import { Label } from "./ui/label";

type AgentFilesManagerProps = {
  agentId: string;
  initialFiles: AgentFile[];
};

const ALLOWED_EXTENSIONS = [
  ".txt",
  ".md",
  ".json",
  ".yaml",
  ".yml",
  ".xml",
  ".csv",
  ".log",
  ".ini",
  ".cfg",
  ".conf",
  ".sh",
  ".bash",
  ".zsh",
  ".py",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".html",
  ".css",
  ".scss",
  ".less",
  ".sql",
  ".graphql",
  ".gql",
  ".env",
  ".gitignore",
  ".dockerignore",
  ".editorconfig",
];

const isAllowedFile = (fileName: string) => {
  const lowerName = fileName.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
};

export function AgentFilesManager({
  agentId,
  initialFiles,
}: AgentFilesManagerProps) {
  const [files, setFiles] = useState<AgentFile[]>(initialFiles);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<AgentFile | undefined>();
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      const textFiles = droppedFiles.filter((file) => isAllowedFile(file.name));

      if (textFiles.length === 0) {
        toast.error("Please drop text files only (.txt, .md, .json, etc.)");
        return;
      }

      for (const file of textFiles) {
        try {
          const content = await file.text();
          const response = await fetch(`/api/agents/${agentId}/files`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: file.name, content }),
          });

          if (!response.ok) {
            throw new Error("Failed to upload file");
          }

          const newFile = await response.json();
          setFiles((prev) => [...prev, newFile]);
          toast.success(`Added ${file.name}`);
        } catch (_error) {
          toast.error(`Failed to upload ${file.name}`);
        }
      }
    },
    [agentId]
  );

  const handleAddClick = () => {
    setEditingFile(undefined);
    setEditorOpen(true);
  };

  const handleFileClick = (file: AgentFile) => {
    setEditingFile(file);
    setEditorOpen(true);
  };

  const handleSave = async (data: { name: string; content: string }) => {
    if (editingFile) {
      const response = await fetch(
        `/api/agents/${agentId}/files/${editingFile.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update file");
      }

      const updatedFile = await response.json();
      setFiles((prev) =>
        prev.map((f) => (f.id === editingFile.id ? updatedFile : f))
      );
      toast.success("File updated");
    } else {
      const response = await fetch(`/api/agents/${agentId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create file");
      }

      const newFile = await response.json();
      setFiles((prev) => [...prev, newFile]);
      toast.success("File created");
    }
  };

  const handleDelete = async (fileToDelete?: AgentFile) => {
    const targetFile = fileToDelete || editingFile;
    if (!targetFile) {
      return;
    }

    const response = await fetch(
      `/api/agents/${agentId}/files/${targetFile.id}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete file");
    }

    setFiles((prev) => prev.filter((f) => f.id !== targetFile.id));
    toast.success("File deleted");
  };

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Drop zone requires drag events
    <section
      aria-label="Knowledge files section"
      className="relative space-y-4"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5 backdrop-blur-[2px]">
          <div className="flex items-center gap-2 text-primary">
            <FileText className="size-5" />
            <Upload className="size-5" />
          </div>
          <p className="mt-2 font-medium text-primary text-sm">
            Drop files here to add as knowledge
          </p>
        </div>
      )}

      <div className="space-y-3">
        <Label>Knowledge Base Files</Label>

        {files.length > 0 ? (
          <div className="flex flex-col gap-2">
            {files.map((file) => (
              <AgentFileCard
                file={file}
                key={file.id}
                onDelete={() => handleDelete(file)}
                onEdit={() => handleFileClick(file)}
              />
            ))}
          </div>
        ) : (
          <p className="py-2 text-center text-muted-foreground text-sm">
            No files yet. Drag and drop files here or click below to add.
          </p>
        )}

        <Button
          className="w-full"
          onClick={handleAddClick}
          size="sm"
          type="button"
          variant="outline"
        >
          <Plus className="mr-1 size-4" />
          Add File
        </Button>

        <p className="text-muted-foreground text-xs">
          These files will be included as context in the AI&apos;s system prompt
        </p>
      </div>

      <AgentFileEditor
        file={editingFile}
        onDelete={editingFile ? handleDelete : undefined}
        onOpenChange={setEditorOpen}
        onSave={handleSave}
        open={editorOpen}
      />
    </section>
  );
}
