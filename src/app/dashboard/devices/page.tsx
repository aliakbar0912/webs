import { MonitorSmartphone, ShieldAlert } from "lucide-react";
import { StateCard } from "@/components/dashboard/state-card";
import { DeviceListActions } from "@/components/dashboard/device-list-actions";
import { fetchAccount } from "@/lib/api/account";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Devices",
  robots: { index: false, follow: false },
};

export default async function DevicesPage() {
  const session = await getSession();
  const result = session
    ? await fetchAccount(session.token)
    : null;

  if (!result) {
    return (
      <>
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Devices</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Desktop devices enrolled with your account, and licensing status.
          </p>
        </header>
        <StateCard title="Enrolled devices" status="pending">
          <p>Sign in to view and manage your devices.</p>
        </StateCard>
      </>
    );
  }

  if (!result.ok) {
    const unauthorized =
      result.error.upstreamStatus === 401 || result.error.upstreamStatus === 403;
    return (
      <>
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Devices</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Desktop devices enrolled with your account, and licensing status.
          </p>
        </header>
        <StateCard title="Enrolled devices" status="error">
          <p>
            {unauthorized
              ? "Your web session has expired or was signed out remotely. Please sign in again."
              : `The devices list could not be loaded (HTTP ${result.error.upstreamStatus ?? "?"}${result.error.upstreamCode ? `, “${result.error.upstreamCode}”` : ""}). ${result.error.message}`}
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground/70">
            request id: {result.requestId}
          </p>
        </StateCard>
      </>
    );
  }

  const devices = result.data.devices;

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Devices</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Live from the Devora API — every computer and browser session enrolled
          with your account. Signing one out ends its access immediately.
        </p>
      </header>

      <StateCard title={`Enrolled devices (${devices.filter((d) => d.signedIn).length} active)`} status="live">
        <DeviceListActions devices={devices} />
      </StateCard>

      <StateCard title="How device limits work" status="live">
        <ul className="space-y-2.5">
          <li className="flex gap-2.5">
            <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
            <span>
              Each sign-in — desktop or this website — enrolls one device with
              your account. This web session appears in the list and counts
              exactly like a computer.
            </span>
          </li>
          <li className="flex gap-2.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
            <span>
              Limits and blocks are enforced server-side by the Devora API and
              cannot be bypassed from the client. The owner can block any
              device from the admin panel.
            </span>
          </li>
        </ul>
      </StateCard>
    </>
  );
}
