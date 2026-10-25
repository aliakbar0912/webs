import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "When and how Devora subscriptions can be refunded, and how to request one.",
  alternates: { canonical: "/refunds" },
};

const UPDATED = "October 2026";

const sections: LegalSection[] = [
  {
    id: "scope",
    heading: "1. Scope",
    blocks: [
      {
        type: "p",
        text: "This Refund Policy applies to paid Devora subscriptions purchased through this website. Payments are processed by our payment provider, Paddle, which acts as merchant of record. Where Paddle’s own consumer terms are stricter in your jurisdiction, those terms prevail.",
      },
      {
        type: "p",
        text: "[OWNER TO VERIFY: entity details shown on invoices, and any jurisdiction-specific refund addenda required for your customers’ regions.]",
      },
    ],
  },
  {
    id: "windows",
    heading: "2. Refund eligibility",
    blocks: [
      {
        type: "list",
        items: [
          "New subscriptions: you may request a full refund within 14 days of the initial charge, no questions asked.",
          "Renewals: you may request a refund within 7 days of a renewal charge if you did not use the Service in the new billing period.",
          "Annual plans: the same windows apply to annual billing; after the window, refunds may be considered pro rata at our discretion for verified issues (for example, a defect we cannot fix that prevents core functionality).",
          "Non-refundable cases: requests outside the windows above without a verified service issue, accounts terminated for breach of the Terms of Service, and duplicate requests already processed.",
        ],
      },
      {
        type: "p",
        text: "[OWNER TO VERIFY: confirm the 14-day and 7-day windows and pro-rata discretion match the owner’s intended commercial policy before publication.]",
      },
    ],
  },
  {
    id: "how-to",
    heading: "3. How to request a refund",
    blocks: [
      {
        type: "list",
        items: [
          "Contact us through the support page with the email address on the account and the approximate date of the charge.",
          "We verify the charge against the subscription state and confirm eligibility.",
          "Approved refunds are issued to the original payment method through Paddle, typically within 5–10 business days depending on your bank.",
        ],
      },
      {
        type: "p",
        text: "You can also cancel any time from your dashboard; cancellation stops future charges immediately and access continues until the end of the paid period. Cancelling alone does not retroactively refund a charge — a refund request under section 2 is still required.",
      },
    ],
  },
  {
    id: "status",
    heading: "4. While checkout is not yet live",
    blocks: [
      {
        type: "p",
        text: "Online checkout for Devora subscriptions is being connected and is not yet active. Because no payment can currently be taken through this website, no charges — and therefore no refunds — can arise yet. When checkout goes live, this policy becomes effective as written, and this section will be updated.",
      },
    ],
  },
  {
    id: "chargebacks",
    heading: "5. Chargebacks",
    blocks: [
      {
        type: "p",
        text: "If you believe a charge is incorrect, please contact us before initiating a chargeback — refund requests are usually resolved faster. We may investigate chargebacks and provide payment-processor records to Paddle as part of the dispute process.",
      },
    ],
  },
  {
    id: "contact",
    heading: "6. Contact",
    blocks: [
      {
        type: "p",
        text: "Refund questions are handled through the support page. Include your account email and charge date so we can locate the subscription quickly. [OWNER TO VERIFY: dedicated billing-contact email.]",
      },
    ],
  },
];

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refund Policy"
      updated={UPDATED}
      intro="This draft sets out when Devora subscriptions can be refunded, how to request a refund, and what happens while online checkout is still being connected."
      sections={sections}
    />
  );
}
