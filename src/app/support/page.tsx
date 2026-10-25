import type { Metadata } from "next";
import { Clock, LifeBuoy, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/motion/reveal";
import { SupportForm } from "@/components/support/support-form";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Contact the Devora team for help with installation, accounts, billing, and bug reports.",
  alternates: { canonical: "/support" },
};

const CHANNELS = [
  {
    icon: LifeBuoy,
    title: "Product support",
    body: "Installation help, sign-in problems, licensing questions, and bug reports.",
  },
  {
    icon: Clock,
    title: "Response time",
    body: "We answer in the order messages arrive, typically within one or two business days.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy note",
    body: "Please never include passwords, license keys, or payment details in support messages.",
  },
];

export default function SupportPage() {
  return (
    <>
      <PageHeader
        eyebrow="Support"
        title="We are here to help"
        description="Send us a message and the Devora team will get back to you by email. For faster answers, check the documentation first."
      />

      <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6">
        <Reveal className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {CHANNELS.map((channel) => (
            <div
              key={channel.title}
              className="rounded-lg border border-border bg-card p-5"
            >
              <channel.icon className="h-5 w-5 text-zinc-400" aria-hidden="true" />
              <h2 className="mt-3 text-sm font-medium text-foreground">
                {channel.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {channel.body}
              </p>
            </div>
          ))}
        </Reveal>

        <Reveal delay={0.05}>
          <SupportForm />
        </Reveal>
      </section>
    </>
  );
}
