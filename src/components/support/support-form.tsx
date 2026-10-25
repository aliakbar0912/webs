"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck, Send } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  supportSchema,
  SUPPORT_CATEGORIES,
  type SupportInput,
} from "@/lib/validation/support";

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; delivered: boolean; message: string }
  | { kind: "error"; message: string };

export function SupportForm() {
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  const form = useForm<SupportInput>({
    resolver: zodResolver(supportSchema),
    defaultValues: {
      name: "",
      email: "",
      category: "general",
      subject: "",
      message: "",
      website: "",
    },
  });

  async function onSubmit(values: SupportInput) {
    setState({ kind: "submitting" });
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; delivered?: boolean; message?: string }
        | null;

      if (response.ok && data?.ok) {
        setState({
          kind: "success",
          delivered: data.delivered === true,
          message: data.message ?? "Your message has been received.",
        });
        form.reset();
        return;
      }
      if (response.status === 429) {
        setState({
          kind: "error",
          message:
            "Too many messages sent from your network in a short period. Please try again later.",
        });
        return;
      }
      if (response.status === 400 && data && typeof data === "object") {
        setState({
          kind: "error",
          message:
            (data as { message?: string }).message ??
            "Please check the form and try again.",
        });
        return;
      }
      setState({
        kind: "error",
        message:
          data?.message ??
          "Something went wrong while sending your message. Please try again later.",
      });
    } catch {
      setState({
        kind: "error",
        message:
          "We could not reach the server. Check your connection and try again.",
      });
    }
  }

  if (state.kind === "success") {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
          <MailCheck className="h-5 w-5 text-zinc-300" aria-hidden="true" />
        </div>
        <h3 className="mt-5 text-lg font-medium">Message received</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {state.message}
        </p>
        <Button
          variant="outline"
          className="mt-6 border-white/15 hover:bg-white/5"
          onClick={() => setState({ kind: "idle" })}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="rounded-lg border border-border bg-card p-6 sm:p-8"
        noValidate
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name (optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Your name"
                    autoComplete="name"
                    {...field}
                  />
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
                    required
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="border-border bg-[#0a0a0a]">
                    {SUPPORT_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subject</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Short summary of the issue"
                    required
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem className="mt-5">
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea
                  rows={6}
                  placeholder="Describe what happened, what you expected, and any error text you saw."
                  required
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Honeypot — hidden from users, traps bots */}
        <div className="absolute -left-[9999px] top-[-9999px]" aria-hidden="true">
          <label>
            Website
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              {...form.register("website")}
            />
          </label>
        </div>

        {state.kind === "error" ? (
          <p
            role="alert"
            className="mt-5 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-300"
          >
            {state.message}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="mt-6 h-11 w-full font-medium sm:w-auto"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send message
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
