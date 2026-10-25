import type { Metadata } from "next";
import Link from "next/link";
import {
  Boxes,
  Bug,
  Cpu,
  Download,
  MonitorSmartphone,
  Search,
  ShieldCheck,
  Sparkles,
  SquareStack,
  Workflow,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Features",
  description:
    "AI-assisted coding, Ask/Plan/Build workflows, codebase understanding, debugging, model selection, skills, and desktop-native tooling — what Devora does and how.",
  alternates: { canonical: "/features" },
};

const CORE_FEATURES = [
  {
    icon: Sparkles,
    title: "AI-assisted coding",
    body: "Devora works directly in your project. It reads the files you are working on, proposes edits as reviewable diffs, and explains its reasoning so you can accept, adjust, or reject every change. There is no magic hand-off: the code that lands in your repository is code you approved.",
    note: null as string | null,
  },
  {
    icon: Workflow,
    title: "Ask, Plan, and Build workflows",
    body: "Ask gives you fast answers about your code. Plan turns a goal into a structured, step-by-step proposal before anything changes. Build executes an approved plan file by file, keeping you in the loop at each step. Switching between exploring and executing is intentional and explicit.",
    note: null,
  },
  {
    icon: Boxes,
    title: "Codebase understanding",
    body: "Answers are grounded in your actual workspace — file structure, naming conventions, existing patterns, and tests. Devora uses that context to keep suggestions consistent with your project instead of producing generic snippets that ignore how your code is written.",
    note: null,
  },
  {
    icon: Bug,
    title: "Debugging and error analysis",
    body: "Paste an error, share a failing test, or point Devora at a stack trace. It helps you trace the likely cause, explains what the error path means in your code, and proposes targeted fixes — including the tests that would catch the regression next time.",
    note: null,
  },
  {
    icon: Cpu,
    title: "Model selection",
    body: "Choose from the AI models your account has permission to use. The app shows exactly which models are available to you and your current plan — availability is enforced server-side by your account, not claimed by the client.",
    note: "Available models depend on your account and plan.",
  },
  {
    icon: SquareStack,
    title: "Skills and reusable workflows",
    body: "Some work repeats: project onboarding, release checklists, review routines. Skills let you capture those workflows once, name them, and reuse them in any workspace — so the second time is faster than the first.",
    note: null,
  },
];

const PLATFORM_FEATURES = [
  {
    icon: MonitorSmartphone,
    title: "Desktop-native development experience",
    body: "Devora is a real desktop application with a file explorer, editor, integrated terminal, and AI panel — keyboard-first, fast to switch between, and designed around long working sessions rather than a chat page in a browser tab.",
  },
  {
    icon: Search,
    title: "Web search and research",
    body: "When web search is supported for your account, Devora can look up current documentation and sources and bring what it finds into the conversation, with citations you can check.",
    note: "Availability depends on your account configuration.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy and security",
    body: "Website sessions use signed, HttpOnly cookies. Desktop devices are enrolled and enforced by your account — device limits cannot be bypassed from the client. For how data is processed, see the Privacy Policy.",
  },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Features"
        title="Everything Devora does, in plain terms"
        description="A complete, honest rundown of what Devora offers today. Feature availability can depend on your account, plan, and platform — anything conditional is labeled as such."
      />

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <RevealGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {CORE_FEATURES.map((feature) => (
            <RevealItem key={feature.title}>
              <article className="flex h-full flex-col rounded-lg border border-border bg-card p-6 sm:p-7">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                  <feature.icon className="h-5 w-5 text-zinc-300" aria-hidden="true" />
                </div>
                <h2 className="mt-5 text-lg font-medium tracking-tight text-foreground">
                  {feature.title}
                </h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
                {feature.note ? (
                  <p className="mt-4 rounded-md border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-xs text-muted-foreground">
                    {feature.note}
                  </p>
                ) : null}
              </article>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      <section id="web-research" className="scroll-mt-20 border-y border-border bg-[#040404]">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <Reveal>
            <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              Platform, research, and security
            </h2>
          </Reveal>
          <RevealGroup className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {PLATFORM_FEATURES.map((feature) => (
              <RevealItem key={feature.title}>
                <article className="flex h-full flex-col rounded-lg border border-border bg-card p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                    <feature.icon className="h-5 w-5 text-zinc-300" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 text-[15px] font-medium tracking-tight text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                  {feature.note ? (
                    <p className="mt-4 text-xs text-muted-foreground/80">
                      {feature.note}
                    </p>
                  ) : null}
                </article>
              </RevealItem>
            ))}
          </RevealGroup>

          <Reveal className="mt-10">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-[15px] font-medium text-foreground">
                Device and account management
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Your dashboard lists account details, current plan and
                subscription state, and the devices enrolled for desktop use.
                You always have a clear picture of where your account is signed
                in and what it is allowed to do.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild size="sm" variant="outline" className="border-white/15 hover:bg-white/5">
                  <Link href="/dashboard">Open dashboard</Link>
                </Button>
                <Button asChild size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Link href="/privacy">Privacy Policy</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6 lg:py-20">
        <Reveal>
          <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            Ready to try it?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Download the desktop app, sign in, and start with a question about
            your own codebase.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild className="h-11 min-w-[180px] font-medium">
              <Link href="/download">
                <Download className="mr-2 h-4 w-4" />
                Download Devora
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 min-w-[180px] border-white/15 hover:bg-white/5">
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
