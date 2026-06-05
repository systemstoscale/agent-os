import Link from "next/link";
import { Button } from "./ui/button";

export function MarketingLanding() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-bold text-4xl tracking-tight sm:text-6xl">
          {process.env.NEXT_PUBLIC_APP_NAME || "Agent OS"}
        </h1>
        <p className="mt-6 text-lg text-muted-foreground leading-8">
          A powerful AI assistant with specialized tools for different tasks.
          Get help with coding, writing, analysis, and more.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/register">Create Account</Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-4xl">
        <h2 className="text-center font-semibold text-lg">Features</h2>
        <div className="mt-6 grid gap-8 sm:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-primary/10">
              <span className="text-2xl">🛠️</span>
            </div>
            <h3 className="mt-4 font-semibold">Specialized Tools</h3>
            <p className="mt-2 text-muted-foreground text-sm">
              Choose from a variety of AI tools optimized for specific tasks
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-primary/10">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="mt-4 font-semibold">Conversation History</h3>
            <p className="mt-2 text-muted-foreground text-sm">
              Your chats are saved and organized by tool for easy reference
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-primary/10">
              <span className="text-2xl">📄</span>
            </div>
            <h3 className="mt-4 font-semibold">Document Artifacts</h3>
            <p className="mt-2 text-muted-foreground text-sm">
              Create and edit documents, code, and spreadsheets inline
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
