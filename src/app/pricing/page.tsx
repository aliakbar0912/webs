import type { Metadata } from "next";
import Link from "next/link";
import { Check, CreditCard, Hourglass } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPricingPageData } from "@/lib/config/pricing";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Devora plans and pricing. Pro monthly and annual options — checkout opens as soon as our payment provider is approved.",
  alternates: { canonical: "/pricing" },
};

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const config = await getPricingPageData();
  const hasPlans = config.plans.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title="Simple plans for serious work"
        description="One plan, two billing options. Checkout is being connected to our payment provider — buttons below reflect the real, current state at all times."
      />

      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6">
        {!config.billingEnabled && hasPlans ? (
          <Reveal>
            <div className="mx-auto mb-10 flex max-w-2xl items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-5 py-4">
              <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">
                  Online checkout is coming soon.
                </span>{" "}
                Our payment provider account is still being verified. You cannot
                be charged yet — prices and buttons below show exactly what is
                live today.
              </p>
            </div>
          </Reveal>
        ) : null}

        {!hasPlans ? (
          <Reveal>
            <div className="mx-auto flex max-w-2xl flex-col items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-5 py-4">
              <Hourglass className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">
                  Pricing to be announced.
                </span>{" "}
                Plan details are being finalized by the Devora team and will be
                published here as soon as they are confirmed. Nothing is for
                sale yet and no account can be charged.
              </p>
            </div>
          </Reveal>
        ) : null}

        <div className={cn("grid grid-cols-1 gap-5", hasPlans && config.plans.length > 1 ? "md:grid-cols-2" : "mx-auto max-w-xl")}>
          {config.plans.map((plan, idx) => {
            const features = plan.features ?? config.features;
            return (
              <Reveal key={plan.id} delay={idx * 0.08}>
                <article
                  className={cn(
                    "flex h-full flex-col rounded-xl border bg-card p-7",
                    plan.highlighted ? "border-white/20 shadow-card" : "border-border"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold tracking-tight">
                      {plan.name}
                    </h2>
                    {plan.highlighted ? (
                      <Badge
                        variant="outline"
                        className="border-white/20 bg-white/[0.05] text-zinc-300"
                      >
                        Most flexible
                      </Badge>
                    ) : null}
                  </div>

                  {plan.tagline ? (
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {plan.tagline}
                    </p>
                  ) : null}

                  <div className="mt-5 flex items-end gap-2">
                    {plan.priceDisplay ? (
                      <>
                        <span className="text-4xl font-semibold tracking-tight text-foreground">
                          {plan.priceDisplay}
                        </span>
                        <span className="pb-1 text-sm text-muted-foreground">
                          / {plan.billingPeriod}
                        </span>
                      </>
                    ) : (
                      <span className="pb-1 text-lg text-muted-foreground">
                        Pricing to be announced at launch
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground/80">
                    {plan.state === "available"
                      ? "Billed securely through Paddle. Cancel anytime from your dashboard."
                      : plan.checkoutNote}
                  </p>

                  <div className="mt-6 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Everything in Devora Pro:
                    </p>
                    <ul className="mt-3 space-y-2.5">
                      {features.map((feature) => (
                        <li key={feature.title} className="flex gap-2.5 text-sm">
                          <Check
                            className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
                            aria-hidden="true"
                          />
                          <span className="text-muted-foreground">
                            {feature.title}
                            {feature.body ? (
                              <span className="text-muted-foreground/70">
                                {" "}
                                — {feature.body}
                              </span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-7">
                    {plan.state === "available" ? (
                      <Button className="h-11 w-full font-medium">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Subscribe
                      </Button>
                    ) : (
                      <Button
                        disabled
                        aria-disabled="true"
                        variant="outline"
                        className="h-11 w-full cursor-not-allowed border-white/10 bg-transparent font-medium text-muted-foreground"
                      >
                        <Hourglass className="mr-2 h-4 w-4" />
                        {plan.priceDisplay ? "Checkout coming soon" : "Coming soon"}
                      </Button>
                    )}
                    {plan.state !== "available" ? (
                      <p className="mt-2.5 text-center text-xs text-muted-foreground/70">
                        No card required now — nothing can be charged until
                        checkout is live.
                      </p>
                    ) : null}
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>

        {/* Billing questions */}
        <Reveal className="mt-14">
          <div className="rounded-xl border border-border bg-card p-7 sm:p-8">
            <h2 className="text-lg font-semibold tracking-tight">
              Billing, cancellation, and refunds
            </h2>
            <div className="mt-5 grid grid-cols-1 gap-6 text-sm leading-relaxed text-muted-foreground sm:grid-cols-2">
              <div>
                <h3 className="font-medium text-foreground">Cancellation</h3>
                <p className="mt-1.5">
                  Once checkout is live, you will be able to cancel your
                  subscription at any time from your dashboard; access continues
                  until the end of the paid period. Exact billing terms are
                  described in the{" "}
                  <Link href="/terms" className="text-zinc-300 underline-offset-4 hover:underline">
                    Terms of Service
                  </Link>
                  .
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground">Refunds</h3>
                <p className="mt-1.5">
                  Our refund policy — including eligibility windows and how to
                  request one — is published in the{" "}
                  <Link href="/refunds" className="text-zinc-300 underline-offset-4 hover:underline">
                    Refund Policy
                  </Link>
                  . Payments are processed by our payment provider; we never see
                  or store your card details.
                </p>
              </div>
            </div>
            <p className="mt-6 border-t border-border pt-5 text-xs text-muted-foreground/80">
              Feature availability and usage limits are enforced by your account
              and may change as Devora evolves. This page shows plan structure
              only — no limits are implied or guaranteed before they are
              published with your plan.
            </p>
          </div>
        </Reveal>
      </section>
    </>
  );
}
