"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { AuthError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";

type ErrorState = { title?: string; message: string } | null;

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<ErrorState>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: RegisterInput) {
    setError(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; title?: string; message?: string }
        | null;

      if (response.ok && data?.ok) {
        setSuccess(
          data.message ??
            "Account created. Check your inbox for the verification email, then sign in."
        );
        return;
      }
      setError({
        title: data?.title,
        message: data?.message ?? "Registration failed. Please try again.",
      });
    } catch {
      setError({
        message:
          "We could not reach the server. Check your connection and try again.",
      });
    }
  }

  if (success) {
    return (
      <div className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-5 text-center">
        <MailCheck className="mx-auto h-6 w-6 text-zinc-300" aria-hidden="true" />
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{success}</p>
        <Button
          className="mt-5 w-full font-medium"
          onClick={() => {
            router.replace("/login");
            router.refresh();
          }}
        >
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {error ? <AuthError title={error.title} message={error.message} /> : null}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name (optional)</FormLabel>
              <FormControl>
                <Input placeholder="Your name" autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    required
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground/70">
                Minimum 8 characters. Use a unique password you don’t use
                anywhere else.
              </p>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="h-11 w-full font-medium"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>

        <p className="text-xs leading-relaxed text-muted-foreground/80">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="underline-offset-4 hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </Form>
  );
}
