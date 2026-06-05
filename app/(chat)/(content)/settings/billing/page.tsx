import { Suspense } from "react";
import { SettingsBilling } from "@/components/settings-billing";

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border p-6 animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-4" />
          <div className="h-8 bg-muted rounded w-1/2" />
        </div>
      }
    >
      <SettingsBilling />
    </Suspense>
  );
}
