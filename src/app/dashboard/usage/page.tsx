import { Info } from "lucide-react";
import { StateCard } from "@/components/dashboard/state-card";
import { fetchDeviceUsage } from "@/lib/api/account";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Usage",
  robots: { index: false, follow: false },
};

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export default async function UsagePage() {
  const session = await getSession();
  const result = session ? await fetchDeviceUsage(session.token, 30) : null;

  const header = (
    <header>
      <h1 className="text-2xl font-semibold tracking-tight">Usage</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Real request data for the last 30 days, straight from the Devora API.
      </p>
    </header>
  );

  if (!result) {
    return (
      <>
        {header}
        <StateCard title="Usage information" status="pending">
          <p>Sign in to view usage.</p>
        </StateCard>
      </>
    );
  }

  if (!result.ok) {
    const unauthorized = result.error.upstreamStatus === 401 || result.error.upstreamStatus === 403;
    return (
      <>
        {header}
        <StateCard title="Usage information" status="error">
          <p>
            {unauthorized
              ? "Your web session has expired or was signed out remotely. Please sign in again."
              : `Usage could not be loaded (HTTP ${result.error.upstreamStatus ?? "?"}). ${result.error.message}`}
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground/70">
            request id: {result.requestId}
          </p>
        </StateCard>
      </>
    );
  }

  const usage = result.data;
  const totalRequests = usage.models.reduce((sum, m) => sum + m.requests, 0);
  const totalOk = usage.models.reduce((sum, m) => sum + m.ok, 0);
  const totalFailed = usage.models.reduce((sum, m) => sum + m.failed, 0);
  const totalPrompt = usage.models.reduce((sum, m) => sum + m.promptTokens, 0);
  const totalCompletion = usage.models.reduce((sum, m) => sum + m.completionTokens, 0);

  return (
    <>
      {header}

      <StateCard title="Last 30 days — this web session" status="live">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Requests", value: formatNumber(totalRequests) },
            { label: "Succeeded", value: formatNumber(totalOk) },
            { label: "Failed", value: formatNumber(totalFailed) },
            {
              label: "Tokens",
              value: `${formatNumber(totalPrompt + totalCompletion)}`,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3.5"
            >
              <p className="text-xs uppercase tracking-wider text-muted-foreground/70">
                {stat.label}
              </p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {usage.models.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-xs uppercase tracking-wider text-muted-foreground/70">
                  <th className="pb-2 pr-4 font-medium">Model</th>
                  <th className="pb-2 pr-4 font-medium">Requests</th>
                  <th className="pb-2 pr-4 font-medium">OK</th>
                  <th className="pb-2 pr-4 font-medium">Failed</th>
                  <th className="pb-2 font-medium">Prompt / completion tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {usage.models.map((m) => (
                  <tr key={m.modelId}>
                    <td className="py-2.5 pr-4 text-foreground">{m.modelName || m.modelId}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{formatNumber(m.requests)}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{formatNumber(m.ok)}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{formatNumber(m.failed)}</td>
                    <td className="py-2.5 text-muted-foreground">
                      {formatNumber(m.promptTokens)} / {formatNumber(m.completionTokens)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-6 rounded-md border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-sm text-muted-foreground">
            No AI requests yet from this browser session. Usage shown here is
            scoped per device: your desktop app’s activity is attributed to
            that device, and this page reports the website’s own device.
          </p>
        )}
      </StateCard>

      <StateCard title="About this data" status="live">
        <p className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
          <span>
            The Devora API reports usage per device for privacy and security:
            a device can only ever read its own records. Desktop usage lives in
            the desktop app; this page always reflects the website session’s
            own numbers — never estimates.
          </span>
        </p>
      </StateCard>
    </>
  );
}
