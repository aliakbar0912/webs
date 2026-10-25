import Link from "next/link";
import { Info } from "lucide-react";

/**
 * Honest "capability not connected" card used across the dashboard when the
 * upstream API contract is not yet confirmed. Never fakes data.
 */
export function StateCard({
  title,
  status,
  children,
}: {
  title: string;
  status: "pending" | "error" | "live";
  children: React.ReactNode;
}) {
  const badge =
    status === "live"
      ? { label: "Live", cls: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" }
      : status === "error"
        ? { label: "Unavailable", cls: "border-destructive/40 bg-destructive/10 text-red-200" }
        : { label: "Not connected yet", cls: "border-white/10 bg-white/[0.04] text-zinc-300" };

  return (
    <section className="rounded-xl border border-border bg-card p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>
      <div className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
      {status !== "live" ? (
        <p className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground/80">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Devora never shows placeholder data here. This section activates
            automatically once the corresponding API integration is confirmed —
            see{" "}
            <Link
              href="/docs#integration-status"
              className="text-zinc-300 underline-offset-4 hover:underline"
            >
              integration status
            </Link>
            .
          </span>
        </p>
      ) : null}
    </section>
  );
}
