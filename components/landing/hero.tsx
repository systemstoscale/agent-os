import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
      <div className="absolute top-0 -z-10 h-full w-full">
        <div className="absolute -left-[10%] top-[10%] size-72 rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute -right-[10%] bottom-[10%] size-72 rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border bg-background px-4 py-1.5 text-sm">
            <span className="mr-2 font-medium text-primary">Open Source</span>
            <span className="mx-2 text-muted-foreground">•</span>
            <span>Next.js 16</span>
            <span className="mx-2 text-muted-foreground">•</span>
            <span>Production-Ready</span>
          </div>

          <h1 className="font-bold text-4xl tracking-tight md:text-6xl lg:text-7xl">
            The Easiest Way to Launch{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Your AI Agent Business
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            A production-ready template with custom AI agents, knowledge bases,
            webhook integrations, and Stripe subscriptions built-in. Clone,
            customize, deploy, monetize.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild className="w-full sm:w-auto" size="lg">
              <a
                href="https://github.com/systemstoscale/agent-os"
                rel="noopener noreferrer"
                target="_blank"
              >
                Get Template
                <ExternalLink className="ml-2 size-4" />
              </a>
            </Button>
            <Button
              asChild
              className="w-full sm:w-auto"
              size="lg"
              variant="outline"
            >
              <Link href="/register">
                Live Demo
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-muted-foreground text-sm">
            <span className="font-medium text-foreground">Built with:</span>
            <span>Next.js 16</span>
            <span className="text-muted-foreground/50">•</span>
            <span>Vercel AI SDK</span>
            <span className="text-muted-foreground/50">•</span>
            <span>Drizzle ORM</span>
            <span className="text-muted-foreground/50">•</span>
            <span>Stripe</span>
            <span className="text-muted-foreground/50">•</span>
            <span>10+ LLM providers</span>
          </div>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl" id="tech-stack">
          <div className="aspect-video overflow-hidden rounded-xl border bg-gradient-to-br from-muted/50 to-muted shadow-2xl">
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
                  <span className="font-bold text-2xl text-primary">AI</span>
                </div>
                <p className="text-muted-foreground">
                  Interactive AI chat interface
                </p>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-4 left-1/2 h-8 w-3/4 -translate-x-1/2 rounded-full bg-primary/20 blur-2xl" />
        </div>
      </div>
    </section>
  );
};
