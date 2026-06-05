import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { AdminNav } from "@/components/admin-nav";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { isAdmin } from "@/lib/auth-utils";
import { getSiteName } from "@/lib/db/queries";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AdminLayoutSkeleton />}>
      <AdminLayout>{children}</AdminLayout>
    </Suspense>
  );
}

function AdminLayoutSkeleton() {
  return (
    <div className="flex h-dvh">
      <div className="w-64 animate-pulse border-r bg-muted/30" />
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-content">
          <div className="h-96 animate-pulse rounded-lg bg-muted" />
        </div>
      </main>
    </div>
  );
}

async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [session, cookieStore, siteName] = await Promise.all([
    auth(),
    cookies(),
    getSiteName(),
  ]);

  if (!session?.user) {
    redirect("/login");
  }

  if (!isAdmin(session)) {
    redirect("/");
  }

  // Default to open when no cookie, collapsed only when explicitly "false"
  const isCollapsed = cookieStore.get("sidebar_state")?.value === "false";

  return (
    <SidebarProvider defaultOpen={!isCollapsed} key="admin">
      <AppSidebar siteName={siteName} user={session.user} />
      <SidebarInset>
        <div className="mx-auto w-full max-w-content px-4 py-8">
          <header className="mb-6">
            <h1 className="text-lg font-semibold">Admin</h1>
          </header>
          <AdminNav />
          <div className="py-6">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
