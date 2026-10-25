import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard, AuthNotice } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { fetchAuthConfig, listWebsiteOAuthProviders } from "@/lib/api/account";
import { Skeleton } from "@/components/ui/skeleton";

// Auth/download state comes live from the Devora API — never cache it statically.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Devora account.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/login" },
};

/** Honest messages for a provider sign-in that did not complete. */
const OAUTH_ERRORS: Record<string, string> = {
  expired:
    "This provider sign-in took too long or was already used. Start again from the button below.",
  cancelled: "The provider sign-in was cancelled before it finished. You can try again.",
  provider_error:
    "The sign-in provider reported a problem. Please try again, or sign in with your email and password.",
  sign_in_failed:
    "The sign-in could not be completed. Please try again, or sign in with your email and password.",
  email_not_verified:
    "Your account’s email address is not verified yet. Open the verification email first, then sign in again.",
  accounts_unavailable:
    "The Devora account service could not be reached just now. Please try again in a few minutes.",
  session_unavailable:
    "Sign-in succeeded, but this website could not create your session (missing server configuration). An administrator must set SESSION_SECRET.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth_error?: string }>;
}) {
  const config = await fetchAuthConfig();
  const accountsOn = config.ok && config.data.enabled;
  const oauth = accountsOn ? await listWebsiteOAuthProviders() : null;
  const providers = oauth?.ok ? oauth.data.providers : [];
  const params = await searchParams;
  const oauthError = params.oauth_error ? OAUTH_ERRORS[params.oauth_error] : undefined;

  return (
    <AuthCard
      title="Sign in to Devora"
      subtitle="Use the same account in the desktop app and on this website."
      footer={
        <>
          Don’t have an account?{" "}
          <Link href="/register" className="text-zinc-300 underline-offset-4 hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <LoginForm />
      </Suspense>
      {!accountsOn ? (
        <div className="mt-5">
          <AuthNotice>
            {config.ok && !config.data.enabled
              ? "Accounts are not enabled on the Devora server yet. As soon as the owner turns them on, sign-in works here with the same account as the desktop app."
              : "The Devora API could not be reached from this website right now. Sign-in will work as soon as the connection is restored."}
          </AuthNotice>
        </div>
      ) : (
        <>
          {oauthError ? (
            <div className="mt-5">
              <AuthNotice>{oauthError}</AuthNotice>
            </div>
          ) : null}
          {providers.length > 0 ? (
            <div className="mt-5">
              <OAuthButtons providers={providers} />
            </div>
          ) : config.ok && config.data.providers.length > 0 ? (
            <div className="mt-5">
              <AuthNotice>
                Provider sign-in (Google/GitHub) is available in the Devora desktop app. On this
                website it is not enabled yet — sign in with your email and password.
              </AuthNotice>
            </div>
          ) : null}
        </>
      )}
    </AuthCard>
  );
}
