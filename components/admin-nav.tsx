"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { name: "General", href: "/admin/settings" },
  { name: "Agents", href: "/admin/agents" },
  { name: "Tools", href: "/admin/tools" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);

        return (
          <Link
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            href={tab.href}
            key={tab.href}
          >
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}
