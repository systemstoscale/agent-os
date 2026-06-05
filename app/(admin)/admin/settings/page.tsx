"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const router = useRouter();
  const [siteName, setSiteName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/site-config")
      .then((res) => res.json())
      .then((data) => {
        setSiteName(data.siteName || process.env.NEXT_PUBLIC_APP_NAME || "Agent OS");
        setIsLoading(false);
      })
      .catch(() => {
        setSiteName(process.env.NEXT_PUBLIC_APP_NAME || "Agent OS");
        setIsLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/site-config", {
        method: "POST",
        body: JSON.stringify({ siteName }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      toast.success("Settings saved successfully");
      router.push("/admin");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-2xl tracking-tight">General</h2>
            <p className="text-muted-foreground">
              Configure global site settings.
            </p>
          </div>
          <div />
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-2xl tracking-tight">General</h2>
          <p className="text-muted-foreground">
            Configure global site settings.
          </p>
        </div>
        <div />
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input
                id="siteName"
                maxLength={50}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="Agent OS"
                required
                value={siteName}
              />
              <p className="text-muted-foreground text-xs">
                The name displayed in the sidebar and throughout the application
              </p>
            </div>

            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
