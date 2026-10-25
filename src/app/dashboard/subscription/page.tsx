import Link from "next/link";
import { StateCard } from "@/components/dashboard/state-card";

export const metadata = {
  title: "Subscription",
  robots: { index: false, follow: false },
};

export default function SubscriptionPage() {
  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Subscription</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your current plan, billing state, and renewal information.
        </p>
      </header>

      <StateCard title="Subscription status" status="pending">
        <p>
          This section is intentionally empty. The Devora API does not expose
          billing or subscription routes yet — confirmed against the server
          source — and our payment provider account is still in approval. Until
          billing routes ship upstream and Paddle is verified, there is no real
          subscription state to display, and Devora will not invent one.
        </p>
        <p className="mt-3">
          When both are ready, this page will show your plan, renewal date, and
          billing actions automatically, with the customer portal.
        </p>
      </StateCard>

      <StateCard title="What you can do now" status="live">
        <ul className="space-y-2.5">
          <li>
            — Review the planned structure on the{" "}
            <Link href="/pricing" className="text-zinc-300 underline-offset-4 hover:underline">
              pricing page
            </Link>{" "}
            (checkout is disabled, nothing can be charged).
          </li>
          <li>
            — Billing terms and refund windows are already published in the{" "}
            <Link href="/refunds" className="text-zinc-300 underline-offset-4 hover:underline">
              Refund Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="text-zinc-300 underline-offset-4 hover:underline">
              Terms of Service
            </Link>
            .
          </li>
          <li>
            — Questions?{" "}
            <Link href="/support" className="text-zinc-300 underline-offset-4 hover:underline">
              Contact support
            </Link>
            .
          </li>
        </ul>
      </StateCard>
    </>
  );
}
