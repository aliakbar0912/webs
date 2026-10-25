"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface OAuthProviderOption {
  name: string;
  displayName: string;
}

/** Google's four-colour G, inline so no external asset request is needed. */
function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#EA4335"
        d="M12 5.04c1.62 0 3.06.56 4.2 1.64l3.12-3.12C17.46 1.8 14.96.75 12 .75 7.62.75 3.84 3.27 2.04 6.86l3.66 2.84C6.55 7.02 9.05 5.04 12 5.04z"
      />
      <path
        fill="#4285F4"
        d="M23.25 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.68 2.85c2.15-1.99 3.5-4.92 3.5-8.67z"
      />
      <path
        fill="#FBBC05"
        d="M5.7 14.3a6.9 6.9 0 0 1 0-4.6L2.04 6.86a11.26 11.26 0 0 0 0 10.28l3.66-2.84z"
      />
      <path
        fill="#34A853"
        d="M12 23.25c3.04 0 5.6-1 7.46-2.72l-3.68-2.85c-1.02.69-2.33 1.1-3.78 1.1-2.95 0-5.45-1.98-6.3-4.66l-3.66 2.84c1.8 3.59 5.58 6.29 9.96 6.29z"
      />
    </svg>
  );
}

function providerMark(name: string) {
  if (name === "google") return <GoogleMark />;
  return <span aria-hidden="true" className="text-sm">→</span>;
}

/**
 * "Continue with …" buttons for the providers enabled on the Devora account
 * service (PocketBase). Clicking starts the website's own OAuth flow:
 * POST /api/auth/oauth/start → redirect to the provider's auth URL.
 */
export function OAuthButtons({ providers }: { providers: OAuthProviderOption[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (providers.length === 0) return null;

  async function start(provider: string) {
    setBusy(provider);
    setError(null);
    try {
      const res = await fetch("/api/auth/oauth/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; authUrl?: string; message?: string }
        | null;
      if (res.ok && data?.ok && typeof data.authUrl === "string" && data.authUrl.startsWith("https://")) {
        window.location.href = data.authUrl;
        return;
      }
      setError(
        data?.message ??
          "Provider sign-in could not be started. Please try again or sign in with your email and password."
      );
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative py-1" aria-hidden="true">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs uppercase tracking-widest text-zinc-500">
            or
          </span>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
      {providers.map((p) => (
        <Button
          key={p.name}
          type="button"
          variant="outline"
          className="h-11 w-full font-medium"
          disabled={busy !== null}
          onClick={() => void start(p.name)}
        >
          {busy === p.name ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirecting…
            </>
          ) : (
            <>
              <span className="mr-2 flex h-4 w-4 items-center justify-center">
                {providerMark(p.name)}
              </span>
              Continue with {p.displayName}
            </>
          )}
        </Button>
      ))}
    </div>
  );
}
