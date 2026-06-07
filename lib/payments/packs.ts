// One-time credit top-up packs. 1 credit = 1 message.
// (No "server-only": this is public, non-sensitive config and is imported by
// the seed script as well as server code.)
// Each pack maps to one Stripe Price seeded by scripts/seed-stripe.ts,
// which stamps metadata.credits = String(credits) on the Price so the
// webhook can read how many credits to grant.
export type CreditPack = {
  id: string;
  name: string;
  credits: number;
  amountCents: number;
};

export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack_100", name: "100 credits", credits: 100, amountCents: 1000 },
  { id: "pack_300", name: "300 credits", credits: 300, amountCents: 2500 },
  { id: "pack_700", name: "700 credits", credits: 700, amountCents: 5000 },
];

export function getPackById(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}
