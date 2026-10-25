import Link from "next/link";
import { LogoMark } from "@/components/layout/logo";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 sm:px-6 sm:py-20">
      <div className="mb-8 flex justify-center">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Devora — home"
        >
          <LogoMark className="h-9 w-9" />
        </Link>
      </div>
      <div className="rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
        <div className="mt-6">{children}</div>
      </div>
      <div className="mt-6 text-center text-sm text-muted-foreground">
        {footer}
      </div>
    </div>
  );
}

export function AuthError({ title, message }: { title?: string; message: string }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3"
    >
      {title ? (
        <p className="text-sm font-medium text-red-200">{title}</p>
      ) : null}
      <p className={`${title ? "mt-1" : ""} text-sm leading-relaxed text-red-200/90`}>
        {message}
      </p>
    </div>
  );
}

export function AuthNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-muted-foreground">
      {children}
    </div>
  );
}
