import type { UserRole } from "@/lib/db/schema";

type Entitlements = {
  maxMessagesPerDay: number;
};

export const entitlementsByUserRole: Record<UserRole, Entitlements> = {
  /*
   * For regular subscribers
   */
  subscriber: {
    maxMessagesPerDay: 50,
  },

  /*
   * For admin users
   */
  admin: {
    maxMessagesPerDay: 1000,
  },
};

export function isUnlimited(role: UserRole): boolean {
  return role === "admin";
}
