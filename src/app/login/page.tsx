import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard, AuthNotice } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { fetchAuthConfig } from "@/lib/api/account";
import { Skeleton } from "@/components/ui/skeleton";

// Auth/download state comes live from the Devora API — never cache it statically.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Devora account.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/login" },
};

export default async function LoginPage() {
  const config = await fetchAuthConfig();
  const accountsOn = config.ok && config.data.enabled;

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
      ) : config.ok && config.data.providers.length > 0 ? (
        <div className="mt-5">
          <AuthNotice>
            Google and GitHub sign-in are available in the Devora desktop app.
            On the website, sign in with your email and password.
          </AuthNotice>
        </div>
      ) : null}
    </AuthCard>
  );
}
