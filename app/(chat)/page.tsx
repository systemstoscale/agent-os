import { cookies } from "next/headers";
import { Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Pricing } from "@/components/landing/pricing";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getDefaultAgent, getUserById } from "@/lib/db/queries";
import { generateUUID, getUserFirstName } from "@/lib/utils";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <HomePage />
    </Suspense>
  );
}

async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <>
        <Header />
        <main>
          <Hero />
          <Features />
          <Pricing />
        </main>
        <Footer />
      </>
    );
  }

  const [defaultAgent, currentUser, cookieStore] = await Promise.all([
    getDefaultAgent(),
    getUserById(session.user.id),
    cookies(),
  ]);
  const chatModelFromCookie = cookieStore.get("chat-model");

  const chatId = generateUUID();
  const userName = currentUser
    ? getUserFirstName(currentUser) || undefined
    : undefined;

  return (
    <>
      <Chat
        agentId={defaultAgent?.id}
        agentSuggestions={defaultAgent?.suggestions ?? undefined}
        autoResume={false}
        fileUploadEnabled={defaultAgent?.fileUploadEnabled ?? false}
        id={chatId}
        initialChatModel={chatModelFromCookie?.value || DEFAULT_CHAT_MODEL}
        initialMessages={[]}
        initialVisibilityType="private"
        isReadonly={false}
        userName={userName}
      />
      <DataStreamHandler />
    </>
  );
}
