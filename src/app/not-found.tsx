import Link from "next/link";
import { LogoMark } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      <div
        aria-hidden="true"
        className="bg-grid bg-grid-fade pointer-events-none absolute inset-0"
      />
      <div className="relative">
        <LogoMark className="mx-auto h-12 w-12" />
        <p className="mt-8 font-mono text-sm text-muted-foreground">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          This page doesn’t exist
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          The page you’re looking for may have moved, or the address might be
          wrong. Everything important is one click away:
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild className="font-medium">
            <Link href="/">Go home</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/15 hover:bg-white/5">
            <Link href="/docs">Read the docs</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
