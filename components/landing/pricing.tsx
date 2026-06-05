import { Check, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tiers = [
  {
    name: "Free",
    price: "$0",
    description: "Basic access with usage limits.",
    features: [
      "50 messages per day",
      "Access to all published agents",
      "Conversation history",
      "Document artifacts",
    ],
    cta: "Try Demo",
    href: "/register",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$XX",
    description: "Your pricing here - customize in admin.",
    features: [
      "Unlimited messages",
      "Priority response times",
      "Advanced model access",
      "API access",
      "Priority support",
    ],
    cta: "Try Demo",
    href: "/register",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Team features and priority support.",
    features: [
      "Everything in Pro",
      "Custom agents",
      "Admin dashboard",
      "Team management",
      "SSO & SAML",
      "Dedicated support",
    ],
    cta: "Try Demo",
    href: "/register",
    highlighted: false,
  },
];

export const Pricing = () => {
  return (
    <section className="py-20 md:py-32" id="pricing">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-bold text-3xl tracking-tight md:text-4xl">
            Built-in Subscription Management
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Stripe integration included. Customize these tiers for your
            customers.
          </p>
        </div>

        <div className="mx-auto mt-6 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-2 text-muted-foreground text-sm">
            <Settings className="size-4" />
            <span>Example Pricing - Fully Customizable</span>
          </div>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <Card
              className={cn(
                "relative flex flex-col",
                tier.highlighted && "border-primary shadow-lg"
              )}
              key={tier.name}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground text-xs">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle>{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <div className="mt-4">
                  <span className="font-bold text-4xl">{tier.price}</span>
                  {tier.price !== "Custom" && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li className="flex items-start gap-3" key={feature}>
                      <Check className="mt-0.5 size-5 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  asChild
                  className="w-full"
                  variant={tier.highlighted ? "default" : "outline"}
                >
                  <Link href={tier.href}>{tier.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
