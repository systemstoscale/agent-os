import { auth } from "@/app/(auth)/auth";
import { checkoutAction } from "@/lib/payments/actions";
import { getUserCredits } from "@/lib/payments/credits";
import { getCreditPackPrices } from "@/lib/payments/stripe";

export default async function PricingPage() {
  const session = await auth();

  const [packs, credits] = await Promise.all([
    getCreditPackPrices(),
    session?.user ? getUserCredits(session.user.id) : Promise.resolve(null),
  ]);

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Top Up Your Credits</h1>
        <p className="text-muted-foreground">
          1 credit = 1 message. Buy a pack, credits are added to your balance
          instantly. No subscription.
        </p>
      </div>

      {credits && (
        <div className="mx-auto max-w-xl mb-8 rounded-lg border p-4 text-center">
          <p className="text-sm text-muted-foreground">Current balance</p>
          <p className="text-2xl font-bold">{credits.balance} credits</p>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-6">
        {packs.map((pack) => (
          <div
            className="w-80 rounded-lg border p-6 flex flex-col"
            key={pack.priceId}
          >
            <div className="mb-4">
              <h2 className="text-xl font-semibold">{pack.productName}</h2>
              <p className="text-muted-foreground text-sm mt-1">
                {pack.credits} message credits
              </p>
            </div>

            <div className="mb-6">
              <span className="text-3xl font-bold">
                ${(pack.amountCents / 100).toFixed(0)}
              </span>
              <span className="text-muted-foreground"> one-time</span>
            </div>

            <ul className="space-y-3 mb-6 flex-1">
              <li className="flex items-center gap-2 text-sm">
                <CheckIcon />
                {pack.credits} credits added to your balance
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckIcon />
                Never expires
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckIcon />
                Access to all agents
              </li>
            </ul>

            <div className="mt-auto">
              {session?.user ? (
                <form action={checkoutAction}>
                  <input name="priceId" type="hidden" value={pack.priceId} />
                  <button
                    className="w-full rounded-md bg-primary py-2 px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    type="submit"
                  >
                    Buy {pack.credits} credits
                  </button>
                </form>
              ) : (
                <a
                  className="block w-full rounded-md bg-primary py-2 px-4 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  href="/login"
                >
                  Sign in to buy
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {session?.user && (
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
