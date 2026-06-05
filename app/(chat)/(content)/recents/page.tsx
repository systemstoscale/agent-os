import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { RecentsView } from "./recents-view";

export default function RecentsPage() {
  return (
    <Suspense fallback={<div />}>
      <RecentsPageContent />
    </Suspense>
  );
}

async function RecentsPageContent() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <RecentsView />;
}
