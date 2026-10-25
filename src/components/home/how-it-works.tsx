import Link from "next/link";
import {
  DownloadCloud,
  ListChecks,
  MessagesSquare,
  PlayCircle,
  UserCheck,
} from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: DownloadCloud,
    title: "Download and install Devora",
    body: "Get the desktop installer for your platform from the download page and run it. No separate browser runtime required.",
  },
  {
    icon: UserCheck,
    title: "Sign in or activate your account",
    body: "Sign in with your Devora account to unlock models, usage, and device management for your plan.",
  },
  {
    icon: PlayCircle,
    title: "Select an available AI model",
    body: "Choose from the models your account has permission to use — availability is shown in the app.",
  },
  {
    icon: MessagesSquare,
    title: "Ask, plan, or build",
    body: "Ask questions about your codebase, plan a larger change, or build a feature with guided implementation.",
  },
  {
    icon: ListChecks,
    title: "Review changes and test",
    body: "Every suggestion is explicit: review diffs, run your tests, and keep full control over what lands in your code.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y border-border bg-[#040404]">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            How it works
          </p>
          <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            From install to first change in five steps
          </h2>
        </Reveal>

        <RevealGroup className="mt-14 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, i) => (
            <RevealItem key={step.title}>
              <div className="relative">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-zinc-600">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="h-px flex-1 bg-white/10" aria-hidden="true" />
                </div>
                <div className="mt-5 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                  <step.icon className="h-5 w-5 text-zinc-300" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-[15px] font-medium leading-snug text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal className="mt-14">
          <div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Want the details first? The documentation walks through
              installation, sign-in, workspace setup, and troubleshooting.
            </p>
            <Button asChild variant="outline" className="shrink-0 border-white/15 hover:bg-white/5">
              <Link href="/docs">Read the docs</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
