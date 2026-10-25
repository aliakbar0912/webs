import Link from "next/link";

/** Devora brand mark — geometric "D" glyph, rendered inline (no image request). */
export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Devora logo"
    >
      <rect width="64" height="64" rx="14" className="fill-black" />
      <rect
        x="0.5"
        y="0.5"
        width="63"
        height="63"
        rx="13.5"
        fill="none"
        className="stroke-white/15"
      />
      <path
        d="M23 17h9.5c8.83 0 15.5 6.72 15.5 15s-6.67 15-15.5 15H23V17z"
        fill="none"
        className="stroke-white"
        strokeWidth="4.5"
      />
      <rect x="17" y="17" width="4.5" height="30" rx="1.5" className="fill-white" />
      <circle cx="47.5" cy="45.5" r="3" className="fill-white" />
    </svg>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`group flex items-center gap-2.5 ${className ?? ""}`}
      aria-label="Devora — home"
    >
      <LogoMark className="h-7 w-7 transition-transform duration-300 group-hover:-rotate-3" />
      <span className="text-[17px] font-semibold tracking-tight text-foreground">
        Devora
      </span>
    </Link>
  );
}
