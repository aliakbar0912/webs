import Link from "next/link";
import {
  Boxes,
  Bug,
  Cpu,
  Search,
  ShieldCheck,
  Sparkles,
  SquareStack,
  Workflow,
} from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";

const VALUE_PROPS = [
  {
    title: "Desktop-native",
    body: "Devora runs on your machine as a real desktop application — no browser tab required.",
  },
  {
    title: "Codebase-aware",
    body: "Ask about your project, plan changes across files, and apply edits with review steps.",
  },
  {
    title: "Ask · Plan · Build",
    body: "Three focused workflows: quick answers, structured plans, and guided implementation.",
  },
  {
    title: "Your account, your devices",
    body: "Manage sign-ins and enrolled devices from your dashboard — limits stay enforced.",
  },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI-assisted coding",
    body: "Write, refactor, and edit code with an assistant that works inside your real project — not a stripped-down chat window.",
  },
  {
    icon: Workflow,
    title: "Ask, Plan, and Build workflows",
    body: "Ask quick questions, generate structured plans for larger changes, then let Devora implement them step by step while you stay in control.",
  },
  {
    icon: Boxes,
    title: "Codebase understanding",
    body: "Devora reads your workspace so answers and edits are grounded in your files, structure, and conventions.",
  },
  {
    icon: Bug,
    title: "Debugging and error analysis",
    body: "Paste an error or run a failing test — Devora helps trace causes, explain stack traces, and propose fixes.",
  },
  {
    icon: Cpu,
    title: "Model selection",
    body: "Pick from the AI models your account has permission to use. Available models are shown in the app based on your plan.",
  },
  {
    icon: SquareStack,
    title: "Skills and reusable workflows",
    body: "Capture repeatable workflows once and reuse them across projects — onboarding steps, review checklists, release routines.",
  },
];

const SECONDARY_FEATURES = [
  {
    icon: Search,
    title: "Web search and research",
    body: "When supported by your account, Devora can search the web to ground answers in current documentation and sources.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy and security",
    body: "Sessions stay tied to your account with enforced device limits. Read our privacy policy for how data is handled.",
  },
];

export function ValueStrip() {
  return (
    <section className="border-y border-border bg-[#040404]">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {VALUE_PROPS.map((item) => (
          <Reveal key={item.title}>
            <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.body}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function FeatureTeaser() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
      <Reveal>
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Features
        </p>
        <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Built for the way developers actually work
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Devora combines an AI assistant, your real file system, and explicit
          review steps — so generated work stays inspectable and reversible.
        </p>
      </Reveal>

      <RevealGroup className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <RevealItem key={feature.title}>
            <div className="group h-full rounded-lg border border-border bg-card p-6 transition-colors duration-300 hover:border-white/20 hover:bg-[#0c0c0c]">
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.04]">
                <feature.icon className="h-4.5 w-4.5 text-zinc-300" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-[15px] font-medium text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.body}
              </p>
            </div>
          </RevealItem>
        ))}
      </RevealGroup>

      <RevealGroup className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECONDARY_FEATURES.map((feature) => (
          <RevealItem key={feature.title}>
            <div className="flex h-full items-start gap-4 rounded-lg border border-border bg-card p-6">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04]">
                <feature.icon className="h-4.5 w-4.5 text-zinc-300" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {feature.body}{" "}
                  <Link
                    href={feature.title.startsWith("Privacy") ? "/privacy" : "/features#web-research"}
                    className="text-zinc-300 underline-offset-4 hover:underline"
                  >
                    Learn more
                  </Link>
                </p>
              </div>
            </div>
          </RevealItem>
        ))}
      </RevealGroup>

      <Reveal className="mt-10 text-center">
        <Button asChild variant="outline" className="border-white/15 hover:bg-white/5">
          <Link href="/features">See all features</Link>
        </Button>
      </Reveal>
    </section>
  );
}
