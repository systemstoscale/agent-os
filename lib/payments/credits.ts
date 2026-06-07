import "server-only";

import { getUserById } from "@/lib/db/queries";

export type UserCredits = {
  balance: number;
};

// creditsLimit is repurposed as the user's current additive credit balance.
// 1 credit = 1 message. No period reset, no subscriptions.
export async function getUserCredits(userId: string): Promise<UserCredits> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  return {
    balance: Math.max(0, user.creditsLimit ?? 0),
  };
}

export async function canSendMessage(userId: string): Promise<boolean> {
  const { balance } = await getUserCredits(userId);
  return balance > 0;
}
