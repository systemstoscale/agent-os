import type Stripe from "stripe";
import { addCredits } from "@/lib/db/queries";
import { stripe } from "@/lib/payments/stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return new Response("Webhook signature verification failed", {
      status: 400,
    });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Only grant on a paid one-time top-up.
      if (session.mode === "payment" && session.payment_status === "paid") {
        const userId =
          session.client_reference_id || session.metadata?.userId || null;

        if (!userId) {
          console.error(
            "checkout.session.completed without a userId",
            session.id
          );
          return new Response("Missing userId", { status: 200 });
        }

        // Resolve credits: prefer session metadata, fall back to the line item
        // price metadata. Both are stamped by scripts/seed-stripe.ts.
        let credits = Number.parseInt(session.metadata?.credits || "0", 10);

        if (!credits) {
          const lineItems = await stripe.checkout.sessions.listLineItems(
            session.id,
            { limit: 1, expand: ["data.price"] }
          );
          const price = lineItems.data[0]?.price;
          credits = Number.parseInt(price?.metadata.credits || "0", 10);
        }

        if (credits > 0) {
          await addCredits({ id: userId, amount: credits });
          console.log(`Granted ${credits} credits to user ${userId}`);
        } else {
          console.error(
            "checkout.session.completed with no credits metadata",
            session.id
          );
        }
      }
    } else {
      console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response("Webhook processed", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
}
