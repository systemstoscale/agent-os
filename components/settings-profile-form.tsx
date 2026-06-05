"use client";

import { useEffect, useState } from "react";
import { LoaderIcon } from "@/components/icons";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UserProfile = {
  id: string;
  email: string;
  fullName: string | null;
};

export function SettingsProfileForm() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch("/api/user/profile");
        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }
        const data = await response.json();
        setProfile(data);
        setFullName(data.fullName || "");
      } catch {
        toast({
          type: "error",
          description: "Failed to load profile",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fullName }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const data = await response.json();
      setProfile(data);
      toast({
        type: "success",
        description: "Profile updated successfully",
      });
    } catch {
      toast({
        type: "error",
        description: "Failed to update profile",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-semibold text-2xl tracking-tight">General</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Manage your profile settings.
          </p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="animate-spin text-muted-foreground">
              <LoaderIcon />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl tracking-tight">General</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Manage your profile settings.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  disabled
                  id="email"
                  type="email"
                  value={profile?.email || ""}
                />
                <p className="text-xs text-muted-foreground">
                  Your email address cannot be changed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  type="text"
                  value={fullName}
                />
              </div>
            </div>

            <Button disabled={isSaving} type="submit">
              {isSaving ? (
                <>
                  <span className="animate-spin">
                    <LoaderIcon />
                  </span>
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
