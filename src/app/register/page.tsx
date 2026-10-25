import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, AuthNotice } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { fetchAuthConfig, listWebsiteOAuthProviders } from "@/lib/api/account";

// Auth/download state comes live from the Devora API — never cache it statically.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a Devora account for the desktop app and this website.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/register" },
};

export default async function RegisterPage() {
  const config = await fetchAuthConfig();
  const accountsOn = config.ok && config.data.enabled;

  return (
    <AuthCard
      title="Create your Devora account"
      subtitle="One account for the desktop app, your subscription, and your devices."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-zinc-300 underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {accountsOn ? (
        <>
          <RegisterForm />
          <RegisterOAuth />
        </>
      ) : (
        <>
          <AuthNotice>
            {config.ok && !config.data.enabled
              ? "Accounts are not enabled on the Devora server yet, so new accounts can’t be created from here right now. Please check back soon."
              : "The Devora API could not be reached from this website right now, so registration is temporarily unavailable."}
          </AuthNotice>
          <div className="mt-5 text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-zinc-300 underline-offset-4 hover:underline">
              Have an account? Sign in
            </Link>
          </div>
        </>
      )}
    </AuthCard>
  );
}

/**
 * Provider sign-up buttons (Google/…) shown under the password form. A
 * provider account is created — or an existing account is linked — the first
 * time it is used, so "Continue with Google" covers registration as well.
 */
async function RegisterOAuth() {
  const oauth = await listWebsiteOAuthProviders();
  if (!oauth.ok || oauth.data.providers.length === 0) return null;
  return (
    <div className="mt-5">
      <OAuthButtons providers={oauth.data.providers} />
    </div>
  );
}
