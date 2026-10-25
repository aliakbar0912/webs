"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CreditCard, Cpu, LayoutDashboard, LogOut, MonitorSmartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/subscription", label: "Subscription", icon: CreditCard },
  { href: "/dashboard/devices", label: "Devices", icon: MonitorSmartphone },
  { href: "/dashboard/usage", label: "Usage", icon: Cpu },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <nav
      aria-label="Dashboard"
      className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible"
    >
      {LINKS.map((link) => {
        const active =
          link.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-md px-3.5 py-2.5 text-sm transition-colors",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <link.icon className="h-4 w-4" aria-hidden="true" />
            {link.label}
          </Link>
        );
      })}
      <Button
        variant="ghost"
        onClick={signOut}
        className="mt-1 shrink-0 justify-start gap-2.5 px-3.5 py-2.5 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground lg:mt-4"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Sign out
      </Button>
    </nav>
  );
}
