"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  forgotPasswordSchema,
} from "@/lib/validation/auth";

const codeSchema = z.object({
  otpCode: z
    .string()
    .trim()
    .regex(/^[0-9]{4,12}$/, "Enter the numeric code from the email"),
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

type CodeInput = z.infer<typeof codeSchema>;

type ErrorState = { title?: string; message: string } | null;

export function ForgotPasswordForm() {
  const [error, setError] = useState<ErrorState>(null);
  const [otpId, setOtpId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const emailForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const codeForm = useForm<CodeInput>({
    resolver: zodResolver(codeSchema),
    defaultValues: { otpCode: "", password: "" },
  });

  // Step 1: request the email code.
  async function onRequestCode(values: z.infer<typeof forgotPasswordSchema>) {
    setError(null);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; title?: string; message?: string; otpId?: string }
        | null;

      if (response.ok && data?.ok && data.otpId) {
        setOtpId(data.otpId);
        setNotice(data.message ?? null);
        return;
      }
      setError({
        title: data?.title,
        message: data?.message ?? "The request failed. Please try again.",
      });
    } catch {
      setError({
        message:
          "We could not reach the server. Check your connection and try again.",
      });
    }
  }

  // Step 2: code + new password (verified by the Devora API itself).
  async function onReset(values: CodeInput) {
    setError(null);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ otpId, ...values }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; title?: string; message?: string }
        | null;

      if (response.ok && data?.ok) {
        setResetDone(data.message ?? "Your password has been reset.");
        return;
      }
      setError({
        title: data?.title,
        message: data?.message ?? "The reset failed. Please try again.",
      });
    } catch {
      setError({
        message:
          "We could not reach the server. Check your connection and try again.",
      });
    }
  }

  if (resetDone) {
    return (
      <div className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-5 text-center">
        <MailCheck className="mx-auto h-6 w-6 text-zinc-300" aria-hidden="true" />
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{resetDone}</p>
        <Button asChild variant="outline" className="mt-5 border-white/15 hover:bg-white/5">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  if (!otpId) {
    return (
      <Form {...emailForm}>
        <form onSubmit={emailForm.handleSubmit(onRequestCode)} className="space-y-5" noValidate>
          {error ? <AuthError title={error.title} message={error.message} /> : null}
          <FormField
            control={emailForm.control}
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
          <Button
            type="submit"
            className="h-11 w-full font-medium"
            disabled={emailForm.formState.isSubmitting}
          >
            {emailForm.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Email me a sign-in code"
            )}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground/80">
            Devora uses single-use email codes instead of reset links. The code
            expires quickly and works only once.
          </p>
        </form>
      </Form>
    );
  }

  return (
    <Form {...codeForm}>
      <form onSubmit={codeForm.handleSubmit(onReset)} className="space-y-5" noValidate>
        {error ? <AuthError title={error.title} message={error.message} /> : null}
        {notice ? (
          <div className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            {notice}
          </div>
        ) : null}
        <FormField
          control={codeForm.control}
          name="otpCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code from the email</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  placeholder="123456"
                  autoComplete="one-time-code"
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
          control={codeForm.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
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
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="h-11 w-full font-medium"
          disabled={codeForm.formState.isSubmitting}
        >
          {codeForm.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting…
            </>
          ) : (
            "Set new password"
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full text-muted-foreground hover:text-foreground"
          onClick={() => {
            setOtpId(null);
            setError(null);
          }}
        >
          Use a different email
        </Button>
      </form>
    </Form>
  );
}
