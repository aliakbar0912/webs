import { Reveal } from "@/components/motion/reveal";

export function PageHeader({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}) {
  const alignCls = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <div className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden="true"
        className="bg-grid bg-grid-fade pointer-events-none absolute inset-0"
      />
      <Reveal className={`relative w-full max-w-3xl px-4 pb-14 pt-16 sm:px-6 sm:pb-16 sm:pt-20 ${alignCls}`}>
        {eyebrow ? (
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {description}
          </p>
        ) : null}
      </Reveal>
    </div>
  );
}
