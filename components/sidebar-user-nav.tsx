"use client";

import {
  ChevronUp,
  CreditCard,
  LogOut,
  Moon,
  Settings,
  Shield,
  Sun,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { User } from "next-auth";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getUserDisplayName } from "@/lib/utils";
import { LoaderIcon } from "./icons";
import { toast } from "./toast";

export function SidebarUserNav({ user }: { user: User }) {
  const { data, status } = useSession();
  const { setTheme, resolvedTheme } = useTheme();

  const sessionUser = data?.user as {
    role?: string;
    fullName?: string | null;
    email?: string | null;
  };
  const isAdmin = sessionUser?.role === "admin";
  const displayName = getUserDisplayName({
    email: user.email,
    fullName: sessionUser?.fullName,
  });

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {status === "loading" ? (
              <SidebarMenuButton
                className="h-10 justify-between bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:justify-center"
                size="lg"
              >
                <div className="flex shrink-0 flex-row gap-2">
                  <div className="size-6 animate-pulse rounded-full bg-zinc-500/30" />
                  <span className="animate-pulse rounded-md bg-zinc-500/30 text-transparent group-data-[collapsible=icon]:hidden">
                    Loading auth status
                  </span>
                </div>
                <div className="animate-spin text-zinc-500 group-data-[collapsible=icon]:hidden">
                  <LoaderIcon />
                </div>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                className="h-10 bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:justify-center"
                data-testid="user-nav-button"
                size="lg"
              >
                <Image
                  alt={user.email ?? "User Avatar"}
                  className="shrink-0 rounded-full"
                  height={24}
                  src={`https://avatar.vercel.sh/${user.email}`}
                  width={24}
                />
                <span
                  className="truncate group-data-[collapsible=icon]:hidden"
                  data-testid="user-email"
                >
                  {displayName}
                </span>
                <ChevronUp className="ml-auto group-data-[collapsible=icon]:hidden" />
              </SidebarMenuButton>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-popper-anchor-width)"
            data-testid="user-nav-menu"
            side="top"
          >
            <DropdownMenuItem asChild>
              <Link className="cursor-pointer" href="/settings">
                <Settings className="mr-2 size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link className="cursor-pointer" href="/settings/billing">
                <CreditCard className="mr-2 size-4" />
                Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              data-testid="user-nav-item-theme"
              onSelect={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              {resolvedTheme === "light" ? (
                <Moon className="mr-2 size-4" />
              ) : (
                <Sun className="mr-2 size-4" />
              )}
              {resolvedTheme === "light" ? "Dark mode" : "Light mode"}
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link className="cursor-pointer" href="/admin">
                    <Shield className="mr-2 size-4" />
                    Admin
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild data-testid="user-nav-item-auth">
              <button
                className="w-full cursor-pointer"
                onClick={() => {
                  if (status === "loading") {
                    toast({
                      type: "error",
                      description:
                        "Checking authentication status, please try again!",
                    });

                    return;
                  }

                  signOut({
                    redirectTo: "/",
                  });
                }}
                type="button"
              >
                <LogOut className="mr-2 size-4" />
                Sign out
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
