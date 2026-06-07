"use server";

import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { createTopupCheckoutSession } from "./stripe";

export async function checkoutAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const priceId = formData.get("priceId") as string;
  if (!priceId) {
    throw new Error("Price ID is required");
  }

  const checkoutUrl = await createTopupCheckoutSession({
    userId: session.user.id,
    userEmail: session.user.email,
    priceId,
  });

  redirect(checkoutUrl);
}
