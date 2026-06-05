import { auth } from "@/app/(auth)/auth";
import { getUserById } from "@/lib/db/queries";
import { customerPortalAction } from "@/lib/payments/actions";
import { getUserCredits } from "@/lib/payments/credits";

export async function SettingsBilling() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const user = await getUserById(session.user.id);
  if (!user) {
    return null;
  }

  const credits = await getUserCredits(session.user.id);

  const periodEndDate = new Date(credits.periodStart);
  periodEndDate.setMonth(periodEndDate.getMonth() + 1);

  const creditsPercentage = Math.min(100, (credits.used / credits.limit) * 100);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-6">
        <h3 className="font-medium mb-4">Current Plan</h3>

        <div className="mb-4">
          <p className="text-2xl font-bold">{user.planName || "Free Plan"}</p>
          {user.subscriptionStatus === "canceling" ? (
            <p className="text-sm text-amber-600">
              Cancels on {periodEndDate.toLocaleDateString()}
            </p>
          ) : user.subscriptionStatus ? (
            <p className="text-sm text-muted-foreground capitalize">
              Status: {user.subscriptionStatus}
            </p>
          ) : null}
        </div>

        <div className="flex gap-3">
          <a
            className="rounded-md bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80"
            href="/pricing"
          >
            Manage Subscription
          </a>
          {user.stripeSubscriptionId && (
            <>
              <form action={customerPortalAction}>
                <button
                  className="rounded-md bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80"
                  type="submit"
                >
                  Billing History
                </button>
              </form>
              <form action={customerPortalAction}>
                <button
                  className="rounded-md bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80"
                  type="submit"
                >
                  Cancel Subscription
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border p-6">
        <h3 className="font-medium mb-4">Credit Usage</h3>

        <div className="mb-2 flex justify-between text-sm">
          <span>
            {credits.used} / {credits.limit} credits used
          </span>
          <span className="text-muted-foreground">
            {credits.remaining} remaining
          </span>
        </div>

        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${creditsPercentage}%` }}
          />
        </div>

        <p className="text-sm text-muted-foreground mt-3">
          Credits reset on {periodEndDate.toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
