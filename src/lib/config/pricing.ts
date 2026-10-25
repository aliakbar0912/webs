import "server-only";
import { serverEnv } from "@/lib/env";
import {
  fetchPublishedPricingPlans,
  type PbPricingPlan,
} from "@/lib/api/pb-service";
import { logger } from "@/lib/logger";

/**
 * Pricing page configuration.
 *
 * Data source priority (all owner-managed, no invented numbers):
 * 1. PocketBase `website_pricing` collection (the admin API's account store —
 *    the owner publishes/enables plans there; see scripts/setup-website-collections.mjs).
 * 2. Environment display vars (NEXT_PUBLIC_PRO_MONTHLY_PRICE / …_ANNUAL_PRICE)
 *    as a fallback when PocketBase storage is not configured or empty.
 *
 * Honesty rules enforced here:
 * - A price is DISPLAYED only when the owner has explicitly configured it —
 *   never invented, never guessed.
 * - Purchase buttons stay in a "Coming soon" disabled state until
 *   NEXT_PUBLIC_BILLING_ENABLED is true AND the plan carries a real Paddle
 *   price ID.
 * - No usage limits, model lists, guarantees, or discounts are fabricated.
 */

export interface PlanView {
  id: string;
  name: string;
  tagline: string | null;
  billingPeriod: "month" | "year";
  /** Configured display price, e.g. "$10" — null when not yet confirmed. */
  priceDisplay: string | null;
  /** "available" = purchasable now; "announced" = price shown, checkout pending; "unannounced" = no price yet. */
  state: "available" | "announced" | "unannounced";
  checkoutNote: string;
  /** Per-plan feature list from PocketBase, when the owner provided one. */
  features: { title: string; body: string }[] | null;
  /** Visual emphasis on the pricing grid (owner-set for PocketBase plans). */
  highlighted: boolean;
}

export interface PricingPageData {
  billingEnabled: boolean;
  paddleEnvironment: "sandbox" | "live";
  /** Where the displayed plans came from — shown honestly in the admin docs. */
  source: "pocketbase" | "environment" | "none";
  plans: PlanView[];
  features: { title: string; body: string }[];
}

const DEFAULT_FEATURES: { title: string; body: string }[] = [
  {
    title: "AI-assisted coding",
    body: "Ask, plan, and build workflows across your real workspace.",
  },
  {
    title: "Codebase understanding",
    body: "Answers and edits grounded in the files and structure of your project.",
  },
  {
    title: "Debugging and error analysis",
    body: "Trace causes, explain stack traces, and get proposed fixes.",
  },
  {
    title: "Model selection",
    body: "Choose from the AI models your account has permission to use.",
  },
  {
    title: "Skills and reusable workflows",
    body: "Capture repeatable workflows and reuse them across projects.",
  },
  {
    title: "Device and account management",
    body: "Review enrolled devices and manage your subscription from your dashboard.",
  },
];

function planState(billingEnabled: boolean, paddlePriceId: string | null, priceDisplay: string | null): PlanView["state"] {
  if (billingEnabled && paddlePriceId) return "available";
  return priceDisplay ? "announced" : "unannounced";
}

function fromPbPlan(plan: PbPricingPlan): PlanView {
  const billingEnabled = serverEnv.billing.enabled();
  const state = planState(billingEnabled, plan.paddlePriceId, plan.priceDisplay);
  return {
    id: plan.planId,
    name: plan.name,
    tagline: plan.tagline,
    billingPeriod: plan.billingPeriod,
    priceDisplay: plan.priceDisplay,
    state,
    checkoutNote:
      state === "available"
        ? "Billed securely through Paddle. Cancel anytime from your dashboard."
        : "Checkout opens as soon as our payment provider is approved and verified.",
    features:
      plan.features.length > 0
        ? plan.features.map((title) => ({ title, body: "" }))
        : null,
    highlighted: plan.highlighted,
  };
}

/**
 * Resolves the pricing page data. Never throws: every failure degrades to the
 * next available honest source (PocketBase → environment → unannounced).
 */
export async function getPricingPageData(): Promise<PricingPageData> {
  const billingEnabled = serverEnv.billing.enabled();
  const paddleEnvironment = serverEnv.billing.environment();

  // 1) Owner-published plans from PocketBase (central admin data store).
  const pbPlans = await fetchPublishedPricingPlans();
  if (pbPlans && pbPlans.length > 0) {
    return {
      billingEnabled,
      paddleEnvironment,
      source: "pocketbase",
      plans: pbPlans.map(fromPbPlan),
      features: DEFAULT_FEATURES,
    };
  }
  if (pbPlans && pbPlans.length === 0) {
    // Collection exists but the owner has not enabled any plan yet — an
    // explicit, honest "nothing published" state rather than env fallback.
    logger.info("pricing", "PocketBase pricing collection is empty; showing unannounced plans");
    return {
      billingEnabled,
      paddleEnvironment,
      source: "pocketbase",
      plans: [],
      features: DEFAULT_FEATURES,
    };
  }

  // 2) Environment-configured display prices (previous fallback, still valid).
  const monthlyPrice = process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE?.trim() || null;
  const annualPrice = process.env.NEXT_PUBLIC_PRO_ANNUAL_PRICE?.trim() || null;
  const monthlyId = serverEnv.billing.proMonthlyPriceId();
  const annualId = serverEnv.billing.proAnnualPriceId();

  const proMonthly: PlanView = {
    id: "pro-monthly",
    name: "Pro — Monthly",
    tagline: null,
    billingPeriod: "month",
    priceDisplay: monthlyPrice,
    state: !billingEnabled || !monthlyId ? (monthlyPrice ? "announced" : "unannounced") : "available",
    checkoutNote: "Checkout opens as soon as our payment provider is approved and verified.",
    features: null,
    highlighted: true,
  };

  const proAnnual: PlanView = {
    id: "pro-annual",
    name: "Pro — Annual",
    tagline: null,
    billingPeriod: "year",
    priceDisplay: annualPrice,
    state: !billingEnabled || !annualId ? (annualPrice ? "announced" : "unannounced") : "available",
    checkoutNote: "Annual billing appears once its real price is configured for the live environment.",
    features: null,
    highlighted: false,
  };

  return {
    billingEnabled,
    paddleEnvironment,
    source: monthlyPrice || annualPrice ? "environment" : "none",
    plans: [proMonthly, proAnnual],
    features: DEFAULT_FEATURES,
  };
}

/**
 * Synchronous accessor used by tests and non-page callers. Reads ONLY the
 * environment fallback (PocketBase plans require async; pages should use
 * getPricingPageData()).
 */
export function getPricingConfig() {
  const billingEnabled = serverEnv.billing.enabled();
  const paddleEnvironment = serverEnv.billing.environment();
  const monthlyPrice = process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE?.trim() || null;
  const annualPrice = process.env.NEXT_PUBLIC_PRO_ANNUAL_PRICE?.trim() || null;
  const monthlyId = serverEnv.billing.proMonthlyPriceId() ?? null;
  const annualId = serverEnv.billing.proAnnualPriceId() ?? null;
  const toView = (
    id: string,
    name: string,
    billingPeriod: "month" | "year",
    priceDisplay: string | null,
    priceId: string | null,
    checkoutNote: string
  ): PlanView => ({
    id,
    name,
    tagline: null,
    billingPeriod,
    priceDisplay,
    state: !billingEnabled || !priceId ? (priceDisplay ? "announced" : "unannounced") : "available",
    checkoutNote,
    features: null,
    highlighted: id === "pro-monthly",
  });
  return {
    billingEnabled,
    paddleEnvironment,
    plans: [
      toView("pro-monthly", "Pro — Monthly", "month", monthlyPrice, monthlyId, "Checkout opens as soon as our payment provider is approved and verified."),
      toView("pro-annual", "Pro — Annual", "year", annualPrice, annualId, "Annual billing appears once its real price is configured for the live environment."),
    ],
    features: DEFAULT_FEATURES,
  };
}
