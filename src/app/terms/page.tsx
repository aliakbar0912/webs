import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of the Devora website, desktop application, and Devora accounts.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "October 2026";

const sections: LegalSection[] = [
  {
    id: "acceptance",
    heading: "1. Acceptance of terms",
    blocks: [
      {
        type: "p",
        text: "These Terms of Service (“Terms”) govern your access to and use of the Devora website (devora.mughalx.tech), the Devora desktop application, and any related services (collectively, the “Service”). By creating an account, downloading the application, or using the Service in any way, you agree to these Terms. If you do not agree, do not use the Service.",
      },
      {
        type: "p",
        text: "[OWNER TO VERIFY: legal entity name, jurisdiction of formation, and registered address.] These Terms are offered by the operator of the Devora Service.",
      },
    ],
  },
  {
    id: "accounts",
    heading: "2. Accounts and eligibility",
    blocks: [
      {
        type: "p",
        text: "You may need a Devora account to use parts of the Service, including the desktop application. You are responsible for maintaining the confidentiality of your credentials, for all activity that occurs under your account, and for keeping your account information accurate and current.",
      },
      {
        type: "list",
        items: [
          "You must be at least 16 years old, or the minimum digital-consent age in your jurisdiction, to create an account.",
          "You may not share your account credentials with others or circumvent account-level or device-level limits.",
          "The Service enforces device limits and licensing checks server-side; attempting to bypass them is a material breach of these Terms.",
          "Notify us promptly of any unauthorized use of your account via the support page.",
        ],
      },
    ],
  },
  {
    id: "desktop-license",
    heading: "3. Desktop application license",
    blocks: [
      {
        type: "p",
        text: "Subject to these Terms and to the plan associated with your account, Devora grants you a limited, non-exclusive, non-transferable, revocable license to download, install, and run the Devora desktop application on devices that you own or control and that are enrolled to your account.",
      },
      {
        type: "list",
        items: [
          "You may not copy, distribute, sell, lease, or sublicense the application.",
          "You may not reverse engineer, decompile, or disassemble the application except where such restriction is prohibited by applicable law.",
          "Installers must be obtained only from official distribution points published on the download page.",
        ],
      },
    ],
  },
  {
    id: "acceptable-use",
    heading: "4. Acceptable use",
    blocks: [
      {
        type: "p",
        text: "You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:",
      },
      {
        type: "list",
        items: [
          "Use the Service to generate, store, or distribute content that is unlawful, harmful, fraudulent, deceptive, threatening, harassing, defamatory, obscene, or otherwise objectionable.",
          "Interfere with, disrupt, or attempt to gain unauthorized access to the Service, other accounts, or any systems or networks connected to the Service.",
          "Use automated means to access the Service in a manner that sends more requests than a human could reasonably produce in the same period, except as expressly permitted by us.",
          "Resell, time-share, or commercially exploit the Service without our prior written consent.",
          "Misrepresent the origin of content generated with the Service, or use it to violate the rights of others, including intellectual-property and privacy rights.",
        ],
      },
      {
        type: "p",
        text: "We may suspend or terminate access to the Service for violations of this section, with notice where practicable.",
      },
    ],
  },
  {
    id: "ai-content",
    heading: "5. AI-generated content and your code",
    blocks: [
      {
        type: "p",
        text: "The Service uses artificial-intelligence models to analyze code you provide, answer questions, and propose changes. Suggestions may be inaccurate or incomplete. You are responsible for reviewing every change before it is applied, and for testing your software. Devora does not warrant that AI output is correct, complete, or fit for any particular purpose.",
      },
      {
        type: "p",
        text: "Your code and workspace content remain yours. By using AI features you instruct us to process that content on your behalf to provide the Service. We do not claim ownership of your code or of the software you build with Devora.",
      },
    ],
  },
  {
    id: "third-party",
    heading: "6. Third-party services",
    blocks: [
      {
        type: "p",
        text: "The Service relies on third parties, including AI model providers, payment processing by Paddle, and infrastructure providers. Third-party AI providers process prompts and workspace content necessary to generate responses, under their own terms and privacy commitments. Your use of third-party services may also be governed by those parties’ terms.",
      },
      {
        type: "list",
        items: [
          "Payments, invoicing, and refunds are processed by our payment provider; we do not receive or store your full payment-card details.",
          "Web search features, when enabled for your account, retrieve third-party content that we do not control.",
        ],
      },
    ],
  },
  {
    id: "billing",
    heading: "7. Billing, subscriptions, and cancellation",
    blocks: [
      {
        type: "p",
        text: "Where you purchase a paid plan, billing terms — including price, billing period, and renewal — are presented at checkout and confirmed at purchase. Subscriptions renew automatically until canceled. You may cancel at any time; cancellation takes effect at the end of the current paid period, and you retain access until then.",
      },
      {
        type: "p",
        text: "Prices, plan features, and usage limits are those displayed in the Service for your account and plan. We may change plans and pricing; material changes to your active plan will be communicated in advance. Refunds are governed by our Refund Policy. Until our payment provider integration is live, no charges can be made through this website.",
      },
    ],
  },
  {
    id: "availability",
    heading: "8. Service availability and changes",
    blocks: [
      {
        type: "p",
        text: "We work to keep the Service available and reliable, but we do not guarantee uninterrupted or error-free operation. Features may be added, changed, or removed over time. Where a feature depends on account configuration or plan entitlements, availability is enforced by your account and may differ between accounts.",
      },
    ],
  },
  {
    id: "disclaimer",
    heading: "9. Disclaimers and limitation of liability",
    blocks: [
      {
        type: "p",
        text: "Except as expressly stated, the Service is provided “as is” and “as available” without warranties of any kind, whether express, implied, or statutory, including warranties of merchantability, fitness for a particular purpose, and non-infringement.",
      },
      {
        type: "p",
        text: "To the maximum extent permitted by law, the operator of the Service will not be liable for indirect, incidental, special, consequential, or punitive damages, or for loss of profits, revenue, data, or goodwill, arising from or related to your use of the Service. Nothing in these Terms limits liability that cannot be limited under applicable law.",
      },
    ],
  },
  {
    id: "termination",
    heading: "10. Termination",
    blocks: [
      {
        type: "p",
        text: "You may stop using the Service and delete your account at any time. We may suspend or terminate your access to the Service if you materially breach these Terms, if required by law, or if we discontinue the Service, with notice where practicable. Sections that by their nature should survive termination will survive.",
      },
    ],
  },
  {
    id: "changes",
    heading: "11. Changes to these terms",
    blocks: [
      {
        type: "p",
        text: "We may update these Terms from time to time. The current version is always published on this page with its last-updated date. If a change is material, we will provide reasonable notice through the Service or by other means before it takes effect. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.",
      },
    ],
  },
  {
    id: "contact",
    heading: "12. Contact",
    blocks: [
      {
        type: "p",
        text: "Questions about these Terms can be sent through the support page. [OWNER TO VERIFY: legal contact email and postal address.]",
      },
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated={UPDATED}
      intro="This draft describes how the Devora Service may be used, what you can expect from us, and what we expect from you. It covers the website, the desktop application, accounts, subscriptions, and acceptable use."
      sections={sections}
    />
  );
}
