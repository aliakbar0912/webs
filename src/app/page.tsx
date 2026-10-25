import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { ValueStrip, FeatureTeaser } from "@/components/home/features";
import { HowItWorks } from "@/components/home/how-it-works";
import { FinalCta } from "@/components/home/final-cta";

export const metadata: Metadata = {
  title: "Devora AI — Your AI Coding Partner. Right on Your Desktop.",
  description:
    "Understand codebases, plan changes, write code, debug issues, and build software with an AI coding assistant designed for real development workflows.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <ValueStrip />
      <FeatureTeaser />
      <HowItWorks />
      <FinalCta />
    </>
  );
}
