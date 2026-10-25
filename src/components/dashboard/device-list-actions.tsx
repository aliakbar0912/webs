"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, MonitorSmartphone } from "lucide-react";
import type { AccountDevices } from "@/lib/api/account";
import { cn } from "@/lib/utils";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function DeviceListActions({ devices }: { devices: AccountDevices[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function signOut(deviceId: string) {
    setError(null);
    setPendingId(deviceId);
    try {
      const response = await fetch("/api/dashboard/devices/sign-out", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;
      if (response.ok && data?.ok) {
        startTransition(() => router.refresh());
        return;
      }
      setError(data?.message ?? "The device could not be signed out. Please try again.");
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setPendingId(null);
    }
  }

  if (devices.length === 0) {
    return <p>No devices are enrolled with this account yet.</p>;
  }

  return (
    <div>
      {error ? (
        <p role="alert" className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      <ul className="divide-y divide-white/[0.06]">
        {devices.map((device) => (
          <li key={device.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                  device.signedIn
                    ? "border-white/10 bg-white/[0.04] text-zinc-300"
                    : "border-white/[0.06] bg-transparent text-zinc-600"
                )}
                aria-hidden="true"
              >
                <MonitorSmartphone className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                  <span className="truncate">{device.name || "Unnamed device"}</span>
                  {device.current ? (
                    <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-200">
                      This session
                    </span>
                  ) : null}
                  {!device.signedIn ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                      Signed out
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Enrolled {formatDate(device.createdAt)}
                  {device.lastSeenAt ? ` · last active ${formatDate(device.lastSeenAt)}` : ""}
                  {device.appVersion ? ` · app ${device.appVersion}` : ""}
                </p>
              </div>
            </div>
            {device.signedIn ? (
              <button
                type="button"
                onClick={() => signOut(device.id)}
                disabled={pendingId === device.id || isPending}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingId === device.id || isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {device.current ? "Sign out" : "Sign out remotely"}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
