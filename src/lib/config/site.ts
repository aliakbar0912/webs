export const siteConfig = {
  name: "Devora",
  fullName: "Devora AI",
  tagline: "Your AI Coding Partner. Right on Your Desktop.",
  description:
    "Devora is an AI-powered desktop coding assistant. Understand codebases, plan changes, write code, debug issues, and build software with an assistant designed for real development workflows.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://devora.mughalx.tech",
  nav: [
    { href: "/features", label: "Features" },
    { href: "/#how-it-works", label: "How it works" },
    { href: "/pricing", label: "Pricing" },
    { href: "/download", label: "Download" },
    { href: "/docs", label: "Documentation" },
  ],
  footerNav: {
    product: [
      { href: "/features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/download", label: "Download" },
      { href: "/docs", label: "Documentation" },
    ],
    account: [
      { href: "/login", label: "Sign in" },
      { href: "/register", label: "Create account" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/dashboard/subscription", label: "Subscription" },
    ],
    company: [
      { href: "/support", label: "Support" },
      { href: "/docs#integration-status", label: "Integration status" },
    ],
    legal: [
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/refunds", label: "Refund Policy" },
    ],
  },
} as const;

export type NavItem = { href: string; label: string };
