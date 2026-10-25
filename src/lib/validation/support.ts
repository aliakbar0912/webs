import { z } from "zod";

/** Shared (client + server) validation for the support form. */
export const supportSchema = z.object({
  name: z
    .string()
    .trim()
    .max(80, "Name is too long")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(200, "Email is too long"),
  category: z.enum(["general", "account", "bug", "feature"], {
    message: "Choose a category",
  }),
  subject: z
    .string()
    .trim()
    .min(3, "Subject must be at least 3 characters")
    .max(120, "Subject is too long"),
  message: z
    .string()
    .trim()
    .min(20, "Please describe the issue in at least 20 characters")
    .max(4000, "Message is too long"),
  /** Honeypot field — must stay empty. Bots tend to fill every input. */
  website: z.literal("", { message: "Spam detected" }),
});

export type SupportInput = z.infer<typeof supportSchema>;

export const SUPPORT_CATEGORIES = [
  { value: "general", label: "General question" },
  { value: "account", label: "Account or billing" },
  { value: "bug", label: "Bug report" },
  { value: "feature", label: "Feature request" },
] as const;
