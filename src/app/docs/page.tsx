import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpenText,
  Download,
  LifeBuoy,
  ShieldCheck,
  UserCheck,
  Wand2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Devora documentation: installation, sign-in, Ask/Plan/Build workflows, model selection, troubleshooting, and the current integration status.",
  alternates: { canonical: "/docs" },
};

const TOC = [
  { href: "#quick-start", label: "Quick start" },
  { href: "#installation", label: "Installation" },
  { href: "#account", label: "Account and sign-in" },
  { href: "#workflows", label: "Ask, Plan, Build" },
  { href: "#models", label: "Model selection" },
  { href: "#skills", label: "Skills" },
  { href: "#troubleshooting", label: "Troubleshooting" },
  { href: "#integration-status", label: "Integration status" },
];

function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border pt-10 first:border-t-0 first:pt-0">
      <h2 className="flex items-center gap-3 text-xl font-semibold tracking-tight">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
          <Icon className="h-4.5 w-4.5 text-zinc-300" aria-hidden="true" />
        </span>
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export default function DocsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Documentation"
        title="Everything you need to run Devora"
        description="From installing the desktop app to planning your first change — plus an honest, always-current view of what is connected."
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
          {/* TOC */}
          <aside className="mb-10 lg:mb-0">
            <nav
              aria-label="Table of contents"
              className="lg:sticky lg:top-24"
            >
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                On this page
              </p>
              <ul className="mt-3 space-y-1">
                {TOC.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Content */}
          <Reveal className="min-w-0 space-y-12">
            <Section id="quick-start" icon={BookOpenText} title="Quick start">
              <p>
                Devora is a desktop application. In short: download it, sign in,
                pick a model, and start asking questions about your project.
                Here is the full path from zero to your first AI-assisted
                change:
              </p>
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  <Link href="/download" className="text-zinc-300 underline-offset-4 hover:underline">
                    Download and install Devora
                  </Link>{" "}
                  on a supported machine.
                </li>
                <li>Launch the app and sign in with your Devora account.</li>
                <li>Select an AI model from the models your account permits.</li>
                <li>Open a workspace folder, then ask, plan, or build.</li>
                <li>Review each proposed change and run your tests.</li>
              </ol>
              <p>
                Every suggestion Devora makes is explicit and reviewable — you
                decide what reaches your code.
              </p>
            </Section>

            <Section id="installation" icon={Download} title="Installation">
              <p>
                Installers are published on the{" "}
                <Link href="/download" className="text-zinc-300 underline-offset-4 hover:underline">
                  download page
                </Link>{" "}
                with a stable version number, release notes, and a SHA-256
                checksum so you can verify the file you downloaded. The packaged
                installer includes everything the app needs — you do not need to
                install a browser runtime or any other dependency first.
              </p>
              <p>
                While the first public build is being finalized, the download
                page shows a “Coming soon” state instead of a placeholder
                download. We only ever publish installers through verified HTTPS
                release URLs on that page.
              </p>
            </Section>

            <Section id="account" icon={UserCheck} title="Account and sign-in">
              <p>
                Your Devora account is the same on the website and in the
                desktop app — one account, one subscription, enforced device
                limits. Signing in on a new device enrolls it with your
                account; you can review enrolled devices any time from{" "}
                <Link href="/dashboard/devices" className="text-zinc-300 underline-offset-4 hover:underline">
                  your dashboard
                </Link>
                .
              </p>
              <p>
                Forgot your password? Use the{" "}
                <Link href="/forgot-password" className="text-zinc-300 underline-offset-4 hover:underline">
                  password recovery page
                </Link>
                . For anything else account-related,{" "}
                <Link href="/support" className="text-zinc-300 underline-offset-4 hover:underline">
                  contact support
                </Link>
                .
              </p>
            </Section>

            <Section id="workflows" icon={Wand2} title="Ask, Plan, Build">
              <p>
                <span className="font-medium text-foreground">Ask</span> is for
                questions: “what does this function do?”, “where is auth
                handled?”, “why is this test failing?”. Ask reads the relevant
                parts of your workspace and answers in context.
              </p>
              <p>
                <span className="font-medium text-foreground">Plan</span> is for
                larger changes: describe the outcome you want, and Devora
                produces a structured, step-by-step plan — files involved,
                order of changes, and risks — before anything is modified.
              </p>
              <p>
                <span className="font-medium text-foreground">Build</span>{" "}
                executes an approved plan step by step, showing diffs as it
                goes. You can pause, adjust, or reject at any step, and nothing
                is committed without your explicit approval.
              </p>
            </Section>

            <Section id="models" icon={Wand2} title="Model selection">
              <p>
                Devora lets you choose between the AI models your account has
                permission to use. The list you see in the app is enforced by
                your account — it reflects your current plan and entitlements,
                and it updates automatically when either changes.
              </p>
              <p>
                If a model appears unavailable, it is not part of your current
                plan or it is temporarily out of capacity. Check your{" "}
                <Link href="/dashboard/subscription" className="text-zinc-300 underline-offset-4 hover:underline">
                  subscription status
                </Link>{" "}
                for details.
              </p>
            </Section>

            <Section id="skills" icon={BookOpenText} title="Skills">
              <p>
                Skills are named, reusable workflows: a repeatable set of steps
                Devora follows on command. Capture your project onboarding
                routine, a pre-release checklist, or a review process once, then
                invoke it in any workspace with a single instruction.
              </p>
              <p>
                Skills live with your account, so the workflows you build
                travel with you across projects and machines.
              </p>
            </Section>

            <Section id="troubleshooting" icon={LifeBuoy} title="Troubleshooting">
              <p>
                <span className="font-medium text-foreground">Installer warnings:</span>{" "}
                if SmartScreen warns about an unsigned build, verify the SHA-256
                checksum published with the release before running it. Signing
                status per release is listed on the download page.
              </p>
              <p>
                <span className="font-medium text-foreground">Sign-in issues:</span>{" "}
                confirm your credentials work on the website first. If the app
                still cannot sign in, check your plan&apos;s device limit on the{" "}
                <Link href="/dashboard/devices" className="text-zinc-300 underline-offset-4 hover:underline">
                  devices page
                </Link>
                , then contact support.
              </p>
              <p>
                <span className="font-medium text-foreground">Anything else:</span>{" "}
                the{" "}
                <Link href="/support" className="text-zinc-300 underline-offset-4 hover:underline">
                  support form
                </Link>{" "}
                reaches the team directly — include your OS version and what you
                expected to happen.
              </p>
            </Section>

            <Section id="integration-status" icon={ShieldCheck} title="Integration status">
              <p>
                We keep this section truthful and current. It reflects what this
                website is actually connected to right now — the real Devora
                API, verified against the server source:
              </p>
              <ul className="space-y-2.5">
                <li className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300/80" aria-hidden="true" />
                  <span>
                    <span className="font-medium text-foreground">Live:</span>{" "}
                    real sign-in through PocketBase identities, device-bound
                    sessions, the account overview with your enrolled devices,
                    remote sign-out, per-device usage, service health, and the
                    download page fed by the API’s client config.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" aria-hidden="true" />
                  <span>
                    <span className="font-medium text-foreground">Depends on configuration:</span>{" "}
                    sign-in and registration activate as soon as the website’s
                    server key and session secret are set for the deployment
                    (environment variables — see the deployment guide).
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" aria-hidden="true" />
                  <span>
                    <span className="font-medium text-foreground">Pending upstream:</span>{" "}
                    billing and subscription state — the Devora API does not
                    expose billing routes yet, and our payment provider is
                    still in approval. Nothing is faked here in the meantime.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" aria-hidden="true" />
                  <span>
                    <span className="font-medium text-foreground">Pending release:</span>{" "}
                    desktop installers publish here first, with checksums and
                    release notes, once the stable build is ready.
                  </span>
                </li>
              </ul>
              <p>
                Questions about any of this?{" "}
                <Link href="/support" className="text-zinc-300 underline-offset-4 hover:underline">
                  Tell us what you need
                </Link>{" "}
                and we will prioritize it.
              </p>
            </Section>
          </Reveal>
        </div>
      </div>
    </>
  );
}
