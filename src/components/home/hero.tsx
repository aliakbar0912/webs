"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorPreview } from "@/components/home/editor-preview";

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

const line1 = ["Your", "AI", "Coding", "Partner."];
const line2 = ["Right", "on", "Your", "Desktop."];

function AnimatedHeadline() {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
        <span className="block">Your AI Coding Partner.</span>
        <span className="text-gradient block">Right on Your Desktop.</span>
      </h1>
    );
  }

  return (
    <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
      <span className="block">
        {line1.map((word, i) => (
          <motion.span
            key={word + i}
            className="inline-block"
            initial={{ opacity: 0, y: 22, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.65, delay: 0.08 + i * 0.07, ease: EASE }}
          >
            {word}
            {i < line1.length - 1 ? "\u00A0" : ""}
          </motion.span>
        ))}
      </span>
      <span className="text-gradient block">
        {line2.map((word, i) => (
          <motion.span
            key={word + i}
            className="inline-block"
            initial={{ opacity: 0, y: 22, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.65, delay: 0.4 + i * 0.07, ease: EASE }}
          >
            {word}
            {i < line2.length - 1 ? "\u00A0" : ""}
          </motion.span>
        ))}
      </span>
    </h1>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Backdrop: fine grid + soft top glow */}
      <div
        aria-hidden="true"
        className="bg-grid bg-grid-fade pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% -8%, rgba(255,255,255,0.09), transparent 70%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mx-auto w-fit"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white/80" />
            </span>
            Desktop-native AI coding assistant
          </span>
        </motion.div>

        <div className="mt-7 text-center">
          <AnimatedHeadline />
        </div>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55, ease: EASE }}
          className="mx-auto mt-6 max-w-2xl text-pretty text-center text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          Understand codebases, plan changes, write code, debug issues, and
          build software with an AI coding assistant designed for real
          development workflows.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7, ease: EASE }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
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
            <Link href="/features">
              Explore Features
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>

        {/* Application preview */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.85, ease: EASE }}
          className="relative mx-auto mt-16 max-w-5xl lg:mt-20"
        >
          <div
            aria-hidden="true"
            className="absolute -inset-x-8 -top-10 bottom-0 rounded-[2rem]"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(255,255,255,0.06), transparent 70%)",
            }}
          />
          <EditorPreview />
          <p className="mt-3 text-center text-xs text-muted-foreground/70">
            Product demonstration — simulated interface and output.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
