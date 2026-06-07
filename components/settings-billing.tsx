import { auth } from "@/app/(auth)/auth";
import { getUserById } from "@/lib/db/queries";
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

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-6">
        <h3 className="font-medium mb-4">Credit Balance</h3>

        <div className="mb-4">
          <p className="text-3xl font-bold">{credits.balance}</p>
          <p className="text-sm text-muted-foreground">
            credits remaining. 1 credit = 1 message.
          </p>
        </div>

        <a
          className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          href="/pricing"
        >
          Top Up Credits
        </a>
      </div>
    </div>
  );
}
