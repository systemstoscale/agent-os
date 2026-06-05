import { redirect } from "next/navigation";
import { handleSubscriptionChange, stripe } from "@/lib/payments/stripe";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    redirect("/pricing?error=missing_session");
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (session.subscription) {
      const subscription =
        typeof session.subscription === "string"
          ? await stripe.subscriptions.retrieve(session.subscription)
          : session.subscription;

      if (!subscription.metadata.userId && session.client_reference_id) {
        await stripe.subscriptions.update(subscription.id, {
          metadata: { userId: session.client_reference_id },
        });
        subscription.metadata.userId = session.client_reference_id;
      }

      await handleSubscriptionChange(subscription);
    }
  } catch (error) {
    console.error("Error processing checkout session:", error);
    redirect("/pricing?error=checkout_failed");
  }

  redirect("/settings/billing");
}
