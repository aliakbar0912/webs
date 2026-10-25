import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info, Megaphone, MonitorSmartphone, ShieldCheck, XCircle } from "lucide-react";
import { StateCard } from "@/components/dashboard/state-card";
import {
  fetchAccount,
  fetchAnnouncements,
  fetchAuthConfig,
  fetchUpstreamHealth,
  type DevoraAnnouncement,
} from "@/lib/api/account";
import { getSession } from "@/lib/session";

function ServiceDot({ state }: { state: "ok" | "down" | "pending" }) {
  const map = {
    ok: { cls: "bg-emerald-300", label: "Devora API service: operational" },
    down: { cls: "bg-red-400", label: "Devora API service: unreachable" },
    pending: { cls: "bg-zinc-500", label: "Devora API service: not checked" },
  } as const;
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <span className={`h-2 w-2 rounded-full ${map[state].cls}`} aria-hidden="true" />
      {map[state].label}
    </span>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  const health = await fetchUpstreamHealth();
  const [account, authConfig, announcements] = session
    ? await Promise.all([
        fetchAccount(session.token),
        fetchAuthConfig(),
        fetchAnnouncements(session.token),
      ])
    : [null, null, null];

  const serviceState = !health.ok && health.error.code === "not_configured" ? "pending" : health.ok ? "ok" : "down";
  const user = account?.ok ? account.data.user : null;
  const devices = account?.ok ? account.data.devices : null;
  const activeDevices = devices?.filter((d) => d.signedIn) ?? [];
  const notices = announcements?.ok
    ? announcements.data.announcements.slice(0, 5)
    : [];

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {user?.email ?? session?.email ?? "Signed in"}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <ServiceDot state={serviceState} />
          {user?.verified ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-300/80" aria-hidden="true" />
              Email verified
            </span>
          ) : user ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-amber-200/90">
              <XCircle className="h-4 w-4" aria-hidden="true" />
              Email not verified yet
            </span>
          ) : null}
        </div>
      </header>

      {account && !account.ok ? (
        <StateCard title="Account" status="error">
          <p>
            The account endpoint responded with an error
            {account.error.upstreamStatus ? ` (HTTP ${account.error.upstreamStatus})` : ""}
            {account.error.upstreamCode ? `, code “${account.error.upstreamCode}”` : ""}.{" "}
            {account.error.message}
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground/70">
            request id: {account.requestId}
          </p>
        </StateCard>
      ) : (
        <StateCard title="Account" status={user ? "live" : "pending"}>
          {user ? (
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground/70">Email</dt>
                <dd className="mt-0.5 text-sm text-foreground">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground/70">Name</dt>
                <dd className="mt-0.5 text-sm text-foreground">{user.name || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground/70">Member since</dt>
                <dd className="mt-0.5 text-sm text-foreground">
                  {user.created
                    ? new Date(user.created).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground/70">
                  Session token expires
                </dt>
                <dd className="mt-0.5 text-sm text-foreground">
                  {account?.ok && account.data.tokenExpiresAt
                    ? new Date(account.data.tokenExpiresAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </dd>
              </div>
              {account?.ok && account.data.identities.length > 0 ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground/70">
                    Linked sign-in methods
                  </dt>
                  <dd className="mt-0.5 flex flex-wrap gap-2">
                    {account.data.identities.map((identity) => (
                      <span
                        key={identity.id}
                        className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs capitalize text-zinc-300"
                      >
                        {identity.provider}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p>
              Your session is active, but the account endpoint couldn’t be used
              right now. This panel populates automatically once connected.
            </p>
          )}
        </StateCard>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Link href="/dashboard/devices" className="group">
          <StateCard title="Devices" status={devices ? "live" : "pending"}>
            {devices ? (
              <p>
                <span className="text-2xl font-semibold text-foreground">{activeDevices.length}</span>{" "}
                <span className="text-muted-foreground">
                  active {activeDevices.length === 1 ? "device" : "devices"} enrolled — including
                  this web session. Manage or sign them out from{" "}
                  <span className="text-zinc-300 underline-offset-4 group-hover:underline">the devices page</span>.
                </span>
              </p>
            ) : (
              <p>Enrolled desktop devices will be listed here, respecting your plan’s limits.</p>
            )}
          </StateCard>
        </Link>
        <Link href="/dashboard/usage" className="group">
          <StateCard title="Usage" status="live">
            <p>
              <MonitorSmartphone className="mb-1 h-5 w-5 text-zinc-400" aria-hidden="true" />
              <span className="text-muted-foreground">
                Per-device AI usage for the last 30 days, straight from the Devora API.
              </span>
            </p>
          </StateCard>
        </Link>
      </div>

      <StateCard title="Plan & subscription" status="pending">
        <p>
          The Devora API does not expose billing or subscription routes yet
          (verified against the server source), and our payment provider is
          still in approval. When billing routes ship and Paddle is approved,
          your plan state appears here automatically.{" "}
          <Link href="/pricing" className="text-zinc-300 underline-offset-4 hover:underline">
            See the pricing page
          </Link>
          .
        </p>
      </StateCard>

      {authConfig?.ok && authConfig.data.providers.length > 0 ? (
        <StateCard title="Sign-in methods" status="live">
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
            <span>
              Linked methods are managed in your account (shown above). Google
              and GitHub browser sign-in is available in the Devora desktop
              app; the website supports email and password.
            </span>
          </p>
        </StateCard>
      ) : null}

      {notices.length > 0 ? <AnnouncementsCard notices={notices} /> : null}
    </>
  );
}

function AnnouncementLevelIcon({ level }: { level: DevoraAnnouncement["level"] }) {
  if (level === "critical") {
    return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden="true" />;
  }
  if (level === "warning") {
    return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />;
  }
  return <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />;
}

function AnnouncementsCard({ notices }: { notices: DevoraAnnouncement[] }) {
  return (
    <StateCard title="Announcements" status="live">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Megaphone className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
        Published by the Devora team — the same notices the desktop app shows.
      </p>
      <ul className="mt-4 space-y-4">
        {notices.map((notice) => (
          <li key={notice.slug} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-start gap-2.5">
              <AnnouncementLevelIcon level={notice.level} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{notice.title}</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {notice.body}
                </p>
                <p className="mt-2 text-xs text-muted-foreground/60">
                  {notice.updatedAt
                    ? new Date(notice.updatedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : null}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </StateCard>
  );
}
