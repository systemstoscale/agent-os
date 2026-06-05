import { cookies } from "next/headers";
import Script from "next/script";
import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getSiteName } from "@/lib/db/queries";
import { auth } from "../(auth)/auth";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <DataStreamProvider>
        <Suspense fallback={<div className="flex h-dvh" />}>
          <LayoutWrapper>{children}</LayoutWrapper>
        </Suspense>
      </DataStreamProvider>
    </>
  );
}

async function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [session, cookieStore, siteName] = await Promise.all([
    auth(),
    cookies(),
    getSiteName(),
  ]);

  // For unauthenticated users, render with minimal sidebar context (for public chat viewing)
  if (!session?.user) {
    return (
      <SidebarProvider defaultOpen={false} key="unauth">
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    );
  }

  // For authenticated users, render with sidebar
  // Key forces remount when switching between auth states so defaultOpen is respected
  const sidebarCookie = cookieStore.get("sidebar_state")?.value;
  const isCollapsed = sidebarCookie === "false";

  return (
    <SidebarProvider defaultOpen={!isCollapsed} key="auth">
      <AppSidebar siteName={siteName} user={session?.user} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
