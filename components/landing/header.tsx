"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#tech-stack", label: "Tech Stack" },
  {
    href: "https://github.com/systemstoscale/agent-os",
    label: "GitHub",
    external: true,
  },
] as const;

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link className="flex items-center space-x-2" href="/">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <span className="font-bold text-primary-foreground text-sm">
              AI
            </span>
          </div>
          <span className="font-bold text-xl">{process.env.NEXT_PUBLIC_APP_NAME || "Agent OS"}</span>
        </Link>

        <nav className="hidden items-center space-x-6 md:flex">
          {navLinks.map((link) => (
            <a
              className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
              href={link.href}
              key={link.href}
              {...("external" in link && link.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center space-x-4 md:flex">
          <Button asChild variant="outline">
            <Link href="/register">Live Demo</Link>
          </Button>
          <Button asChild>
            <a
              href="https://github.com/systemstoscale/agent-os"
              rel="noopener noreferrer"
              target="_blank"
            >
              Get Template
            </a>
          </Button>
        </div>

        <Sheet onOpenChange={setIsOpen} open={isOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button aria-label="Open menu" size="icon" variant="ghost">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[300px] sm:w-[400px]" side="right">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="mt-8 flex flex-col space-y-4">
              {navLinks.map((link) => (
                <a
                  className="font-medium text-lg transition-colors hover:text-primary"
                  href={link.href}
                  key={link.href}
                  onClick={() => setIsOpen(false)}
                  {...("external" in link && link.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {link.label}
                </a>
              ))}
              <hr className="my-4" />
              <Button asChild className="w-full" variant="outline">
                <Link href="/register" onClick={() => setIsOpen(false)}>
                  Live Demo
                </Link>
              </Button>
              <Button asChild className="w-full">
                <a
                  href="https://github.com/systemstoscale/agent-os"
                  onClick={() => setIsOpen(false)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Get Template
                </a>
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};
