import "server-only";

import {
  getMessageCountSince,
  getUserById,
  updateUserSubscription,
} from "@/lib/db/queries";

export type UserCredits = {
  used: number;
  limit: number;
  remaining: number;
  periodStart: Date;
};

export async function getUserCredits(userId: string): Promise<UserCredits> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  let periodStart = user.billingPeriodStart;

  // For free users: initialize or roll forward the billing period
  if (!user.stripeSubscriptionId) {
    const now = new Date();

    if (periodStart) {
      // Check if period has expired (> 30 days)
      const daysSincePeriodStart =
        (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePeriodStart >= 30) {
        // Roll forward to new period
        periodStart = now;
        await updateUserSubscription({ id: userId, billingPeriodStart: now });
      }
    } else {
      // First time user - set billing period to now
      periodStart = now;
      await updateUserSubscription({ id: userId, billingPeriodStart: now });
    }
  }

  // If still no periodStart (shouldn't happen), default to now
  if (!periodStart) {
    periodStart = new Date();
  }

  const used = await getMessageCountSince({ userId, since: periodStart });
  const limit =
    user.creditsLimit ||
    Number.parseInt(process.env.FREE_CREDITS_PER_MONTH || "10", 10);

  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    periodStart,
  };
}

export async function canSendMessage(userId: string): Promise<boolean> {
  const { remaining } = await getUserCredits(userId);
  return remaining > 0;
}
