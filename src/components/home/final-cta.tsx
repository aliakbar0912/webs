import Link from "next/link";
import { Download, Tag } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="bg-grid bg-grid-fade pointer-events-none absolute inset-0 opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[360px]"
        style={{
          background:
            "radial-gradient(ellipse 55% 70% at 50% 110%, rgba(255,255,255,0.07), transparent 70%)",
        }}
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 py-24 text-center sm:px-6 lg:py-32">
        <Reveal>
          <h2 className="mx-auto max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            Build better software with Devora.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Install the desktop app, sign in, and start working with an AI
            assistant that understands your project.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-11 min-w-[190px] font-medium">
              <Link href="/download">
                <Download className="mr-2 h-4 w-4" />
                Download Devora
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 min-w-[190px] border-white/15 bg-transparent font-medium hover:bg-white/5"
            >
              <Link href="/pricing">
                <Tag className="mr-2 h-4 w-4" />
                View Pricing
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
