import Link from "next/link";
import { LogoMark } from "@/components/layout/logo";
import { siteConfig } from "@/lib/config/site";

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-black">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1 lg:pr-6">
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-7 w-7" />
              <span className="text-[17px] font-semibold tracking-tight">
                Devora
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              An AI coding assistant that lives on your desktop, built for real
              development workflows.
            </p>
          </div>

          <FooterColumn
            title="Product"
            links={siteConfig.footerNav.product}
          />
          <FooterColumn
            title="Account"
            links={siteConfig.footerNav.account}
          />
          <FooterColumn
            title="Company"
            links={siteConfig.footerNav.company}
          />
          <FooterColumn title="Legal" links={siteConfig.footerNav.legal} />
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Devora. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Devora is an independent product. Feature availability depends on
            your account and plan.
          </p>
        </div>
      </div>
    </footer>
  );
}
