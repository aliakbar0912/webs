import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Devora collects, uses, and protects information across the website, the desktop application, and AI features.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "October 2026";

const sections: LegalSection[] = [
  {
    id: "overview",
    heading: "1. Overview",
    blocks: [
      {
        type: "p",
        text: "This Privacy Policy explains how the Devora Service handles information when you use the Devora website, create or use a Devora account, or run the Devora desktop application. It also describes the role of third-party processors, including AI model providers and our payment processor.",
      },
      {
        type: "p",
        text: "[OWNER TO VERIFY: legal entity name acting as data controller, and applicable privacy-contact email.]",
      },
    ],
  },
  {
    id: "data-we-collect",
    heading: "2. Information we process",
    blocks: [
      {
        type: "list",
        items: [
          "Account information: your email address, name (if provided), password (stored only in hashed form by the account system), and account settings.",
          "Website session data: a signed, HttpOnly session cookie that keeps you signed in on this website. It contains your session identifiers and an upstream access token; it is not readable by scripts in your browser.",
          "Desktop enrollment data: identifiers for the devices you enroll, used to enforce device limits and licensing for your plan.",
          "Workspace content: files and context from your projects that you explicitly include in an Ask, Plan, or Build request, so AI features can ground their output in your code.",
          "Support communications: the content you submit through the support form, kept so we can respond and follow up.",
          "Operational diagnostics: request IDs, rate-limiting metadata (such as IP address), and security logs needed to run and protect the Service.",
          "Billing data: handled by our payment processor. We receive subscription status (such as active, canceled, or past due) and limited billing metadata — never your full payment-card number.",
        ],
      },
    ],
  },
  {
    id: "how-we-use",
    heading: "3. How information is used",
    blocks: [
      {
        type: "list",
        items: [
          "To provide the Service: authenticate you, sync your plan and entitlements, enforce device limits, and operate AI features.",
          "To keep the Service secure: detect abuse, apply rate limits, investigate incidents, and protect accounts.",
          "To communicate with you: transactional messages about your account, subscription, and support requests.",
          "To improve the Service: understand feature usage in aggregate, where permitted.",
        ],
      },
      {
        type: "p",
        text: "We do not sell your personal information, and we do not use your workspace content to advertise to you.",
      },
    ],
  },
  {
    id: "ai-processing",
    heading: "4. AI processing and your code",
    blocks: [
      {
        type: "p",
        text: "AI features work by sending the parts of your workspace that are relevant to your request — together with the request itself — to the AI model made available to your account. Model providers process this content to generate responses. [OWNER TO VERIFY: the specific AI model providers engaged, their data-retention commitments, and whether zero-retention or opt-out arrangements apply to each plan.]",
      },
      {
        type: "p",
        text: "Only content needed for the task is included. Devora does not upload your entire disk or projects you have not opened in the app, and changes proposed by AI are applied locally with your review.",
      },
    ],
  },
  {
    id: "cookies",
    heading: "5. Cookies and local storage",
    blocks: [
      {
        type: "p",
        text: "This website uses a strictly necessary session cookie to keep you signed in (signed, HttpOnly, SameSite=Lax). We do not use advertising cookies, cross-site trackers, or third-party analytics beacons on this website. If optional analytics are ever added, this policy and your consent choices will be updated first.",
      },
    ],
  },
  {
    id: "sharing",
    heading: "6. How information is shared",
    blocks: [
      {
        type: "list",
        items: [
          "AI model providers: to generate responses to your requests, as described in section 4.",
          "Payment processor (Paddle): to process subscriptions, invoices, and refunds.",
          "Infrastructure and security providers: hosting, delivery, and abuse-prevention services that operate the Service.",
          "Legal requirements: where disclosure is required by law or necessary to protect rights, safety, and security.",
        ],
      },
      {
        type: "p",
        text: "We do not otherwise share personal information except with your direction or consent.",
      },
    ],
  },
  {
    id: "retention-security",
    heading: "7. Retention and security",
    blocks: [
      {
        type: "p",
        text: "We keep personal information only as long as needed to provide the Service, comply with legal obligations, resolve disputes, and enforce agreements. Support messages are retained while the underlying request remains open and for a reasonable period afterwards. [OWNER TO VERIFY: concrete retention periods per data category.]",
      },
      {
        type: "p",
        text: "The Service applies defense-in-depth measures: HTTPS-only traffic, signed HttpOnly session cookies, host-restricted server-side API calls, secret redaction in logs, server-side validation, and enforced device and entitlement limits. No system is perfectly secure; if a data incident affects you, we will notify you as required by applicable law.",
      },
    ],
  },
  {
    id: "your-rights",
    heading: "8. Your rights",
    blocks: [
      {
        type: "p",
        text: "Depending on your jurisdiction, you may have rights to access, correct, export, or delete your personal information, to object to or restrict certain processing, and to lodge a complaint with a supervisory authority. You can exercise most choices directly: update account details in your dashboard, unenroll devices, cancel a subscription, or delete your account. For anything else, contact us through the support page and we will respond within the timeframe required by applicable law.",
      },
    ],
  },
  {
    id: "children",
    heading: "9. Children",
    blocks: [
      {
        type: "p",
        text: "The Service is not directed to children under 16 (or the applicable minimum age in your jurisdiction), and we do not knowingly collect their personal information. If you believe a child has created an account, contact us so we can remove it.",
      },
    ],
  },
  {
    id: "changes",
    heading: "10. Changes to this policy",
    blocks: [
      {
        type: "p",
        text: "We may update this Privacy Policy as the Service evolves. The current version is always published on this page with its last-updated date. Material changes will be announced through the Service before they take effect.",
      },
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={UPDATED}
      intro="This draft explains what information Devora processes, why, how it is protected, and the choices you have. It is written to reflect the Service as it actually behaves — including what happens with your code when AI features are used."
      sections={sections}
    />
  );
}
