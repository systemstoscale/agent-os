import {
  Bot,
  CreditCard,
  FileStack,
  Layers,
  Shield,
  Webhook,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Bot,
    title: "Custom AI Agents",
    description:
      "Build unlimited agents with custom system prompts, conversation starters, and draft/publish workflow.",
  },
  {
    icon: FileStack,
    title: "Knowledge Base Files",
    description:
      "Attach 28+ file types to any agent. Files become part of the AI's context automatically.",
  },
  {
    icon: Webhook,
    title: "Webhook Tool Integrations",
    description:
      "Connect agents to external APIs. The AI can call your backend, third-party services, or any REST endpoint.",
  },
  {
    icon: CreditCard,
    title: "Stripe Monetization",
    description:
      "Full Stripe integration with checkout, billing portal, and credit-based usage limits. Start charging immediately.",
  },
  {
    icon: Layers,
    title: "Multi-Provider LLM Support",
    description:
      "Access Anthropic, OpenAI, Google, xAI through Vercel AI Gateway. Switch models or let users choose.",
  },
  {
    icon: Shield,
    title: "Admin Dashboard",
    description:
      "Full admin panel for agent CRUD, tools management, and site settings. Role-based access control built-in.",
  },
];

export const Features = () => {
  return (
    <section className="py-20 md:py-32" id="features">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-bold text-3xl tracking-tight md:text-4xl">
            Everything You Need to Launch and Scale
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A complete foundation - not just a starter. Every feature required
            to run a real AI SaaS business.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              className="group transition-all hover:border-primary/50 hover:shadow-md"
              key={feature.title}
            >
              <CardHeader>
                <div className="mb-2 flex size-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <feature.icon className="size-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
