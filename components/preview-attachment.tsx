import { LinkIcon } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import type { Attachment } from "@/lib/types";
import { Loader } from "./elements/loader";
import { CrossSmallIcon } from "./icons";
import { Button } from "./ui/button";

// Check if URL is a Vercel Blob public URL
const isPublicBlobUrl = (url: string): boolean => {
  if (!url) {
    return false;
  }
  // Vercel Blob URLs typically contain .public.blob.vercel-storage.com
  return url.includes(".blob.vercel-storage.com");
};

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onRemove,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
}) => {
  const { name, url, contentType } = attachment;
  const hasPublicUrl = isPublicBlobUrl(url);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  return (
    <div
      className="group relative size-16 overflow-hidden rounded-lg border bg-muted"
      data-testid="input-attachment-preview"
    >
      {contentType?.startsWith("image") ? (
        <Image
          alt={name ?? "An image attachment"}
          className="size-full object-cover"
          height={64}
          src={url}
          width={64}
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground text-xs">
          File
        </div>
      )}

      {isUploading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/50"
          data-testid="input-attachment-loader"
        >
          <Loader size={16} />
        </div>
      )}

      {onRemove && !isUploading && (
        <Button
          className="absolute top-0.5 right-0.5 size-4 rounded-full p-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onRemove}
          size="sm"
          variant="destructive"
        >
          <CrossSmallIcon size={8} />
        </Button>
      )}

      {/* Copy link button for public URLs (shown in message view, not input) */}
      {hasPublicUrl && !onRemove && !isUploading && (
        <Button
          aria-label="Copy public link"
          className="absolute top-0.5 right-0.5 size-5 rounded-full bg-blue-500 p-0 text-white hover:bg-blue-600"
          onClick={handleCopyLink}
          size="sm"
          variant="secondary"
        >
          <LinkIcon className="size-3" />
        </Button>
      )}

      <div className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/80 to-transparent px-1 py-0.5 text-[10px] text-white">
        {name}
      </div>
    </div>
  );
};
