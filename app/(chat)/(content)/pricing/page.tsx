import { auth } from "@/app/(auth)/auth";
import { getUserById } from "@/lib/db/queries";
import { checkoutAction } from "@/lib/payments/actions";
import { getStripePrices, getStripeProducts } from "@/lib/payments/stripe";
import { cn } from "@/lib/utils";

export default async function PricingPage() {
  const session = await auth();
  const user = session?.user ? await getUserById(session.user.id) : null;

  const [products, prices] = await Promise.all([
    getStripeProducts(),
    getStripePrices(),
  ]);

  const freeCredits = Number.parseInt(
    process.env.FREE_CREDITS_PER_MONTH || "10",
    10
  );
  const showFreeTier = freeCredits > 0;

  const productWithPrices = products
    .map((product) => {
      const price = prices.find((p) => p.id === product.defaultPriceId);
      return { ...product, price };
    })
    .filter((p) => p.price)
    .sort((a, b) => (a.price?.unitAmount || 0) - (b.price?.unitAmount || 0));

  const isCurrentPlan = (productId: string) =>
    user?.stripeProductId === productId &&
    (user?.subscriptionStatus === "active" ||
      user?.subscriptionStatus === "canceling");

  const isCanceling = user?.subscriptionStatus === "canceling";

  // Calculate cancel date from billing period start + 1 month
  const cancelDate = user?.billingPeriodStart
    ? new Date(
        new Date(user.billingPeriodStart).setMonth(
          new Date(user.billingPeriodStart).getMonth() + 1
        )
      )
    : null;

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-muted-foreground">
          Select the plan that best fits your needs
        </p>
      </div>

      {isCanceling && cancelDate && (
        <div className="mx-auto max-w-xl mb-8 rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-4 text-center">
          <p className="text-amber-800 dark:text-amber-200 font-medium">
            Your {user?.planName} subscription cancels on{" "}
            {cancelDate.toLocaleDateString()}
          </p>
          <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
            You have access until then. Re-subscribe below to keep your plan.
          </p>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-6">
        {showFreeTier && (
          <div className="w-80 rounded-lg border p-6 flex flex-col">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Free</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Get started for free
              </p>
            </div>

            <div className="mb-6">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-muted-foreground">/month</span>
            </div>

            <ul className="space-y-3 mb-6 flex-1">
              <li className="flex items-center gap-2 text-sm">
                <CheckIcon />
                {freeCredits} credits per month
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckIcon />
                Access to all agents
              </li>
            </ul>

            <div className="mt-auto">
              {user ? (
                user.stripeSubscriptionId ? (
                  <div className="rounded-md border py-2 px-4 text-center text-sm text-muted-foreground">
                    Free Tier
                  </div>
                ) : (
                  <div className="rounded-md bg-secondary py-2 px-4 text-center text-sm font-medium">
                    Current Plan
                  </div>
                )
              ) : (
                <a
                  className="block w-full rounded-md bg-secondary py-2 px-4 text-center text-sm font-medium hover:bg-secondary/80"
                  href="/login"
                >
                  Sign Up Free
                </a>
              )}
            </div>
          </div>
        )}

        {productWithPrices.map((product) => (
          <div
            className={cn(
              "w-80 rounded-lg border p-6 flex flex-col",
              isCurrentPlan(product.id) && "border-primary ring-1 ring-primary"
            )}
            key={product.id}
          >
            <div className="mb-4">
              <h2 className="text-xl font-semibold">{product.name}</h2>
              {product.description && (
                <p className="text-muted-foreground text-sm mt-1">
                  {product.description}
                </p>
              )}
            </div>

            <div className="mb-6">
              <span className="text-3xl font-bold">
                ${((product.price?.unitAmount || 0) / 100).toFixed(0)}
              </span>
              <span className="text-muted-foreground">/month</span>
            </div>

            <ul className="space-y-3 mb-6 flex-1">
              <li className="flex items-center gap-2 text-sm">
                <CheckIcon />
                {product.creditsPerMonth} credits per month
              </li>
              {product.features.map((feature) => (
                <li className="flex items-center gap-2 text-sm" key={feature}>
                  <CheckIcon />
                  {feature.trim()}
                </li>
              ))}
              {product.price?.trialPeriodDays && (
                <li className="flex items-center gap-2 text-sm text-primary">
                  <CheckIcon />
                  {product.price.trialPeriodDays}-day free trial
                </li>
              )}
            </ul>

            <div className="mt-auto">
              {isCurrentPlan(product.id) && !isCanceling ? (
                <div className="rounded-md bg-primary py-2 px-4 text-center text-sm font-medium text-primary-foreground">
                  Current Plan
                </div>
              ) : user ? (
                <form action={checkoutAction}>
                  <input
                    name="priceId"
                    type="hidden"
                    value={product.price?.id}
                  />
                  <button
                    className="w-full rounded-md bg-primary py-2 px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    type="submit"
                  >
                    {isCurrentPlan(product.id) && isCanceling
                      ? "Re-subscribe"
                      : user.stripeSubscriptionId
                        ? "Switch Plan"
                        : "Subscribe"}
                  </button>
                </form>
              ) : (
                <a
                  className="block w-full rounded-md bg-primary py-2 px-4 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  href="/login"
                >
                  Get Started
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {user && (
        <p className="text-center text-sm text-muted-foreground mt-8">
          <a
            className="underline hover:text-foreground"
            href="/settings/billing"
          >
            ← Back to Billing
          </a>
        </p>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 text-primary"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M5 13l4 4L19 7"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  );
}
