"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side breadcrumb; production reporting can hook in here.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-sm text-muted-foreground">Something went wrong</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        This page hit an unexpected error
      </h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
        The issue was logged. You can retry the page, or head back home while
        we take a look.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button onClick={reset} className="font-medium">
          Try again
        </Button>
        <Button asChild variant="outline" className="border-white/15 hover:bg-white/5">
          <Link href="/">Go home</Link>
        </Button>
      </div>
      {error.digest ? (
        <p className="mt-6 font-mono text-xs text-muted-foreground/60">
          error id: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
