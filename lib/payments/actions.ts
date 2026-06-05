"use server";

import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { getUserById } from "@/lib/db/queries";
import { createCheckoutSession, createCustomerPortalSession } from "./stripe";

export async function checkoutAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const priceId = formData.get("priceId") as string;
  if (!priceId) {
    throw new Error("Price ID is required");
  }

  const checkoutUrl = await createCheckoutSession({
    userId: session.user.id,
    userEmail: session.user.email,
    priceId,
  });

  redirect(checkoutUrl);
}

export async function customerPortalAction() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = await getUserById(session.user.id);
  if (!user?.stripeCustomerId) {
    redirect("/pricing");
  }

  const portalUrl = await createCustomerPortalSession(user.stripeCustomerId);
  redirect(portalUrl);
}
