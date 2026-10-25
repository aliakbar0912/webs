#!/usr/bin/env node
/**
 * Devora website — one-time PocketBase setup.
 *
 * Creates the three `website_*` collections the website uses to keep its
 * operational data in the SAME PocketBase that owns Devora identities
 * (the admin API's account store):
 *
 *   website_pricing            — published pricing plans (PUBLIC read,
 *                                superuser-only writes)
 *   website_support_messages   — support form inbox (superuser-only)
 *   website_webhook_events     — Paddle webhook audit ledger (superuser-only,
 *                                unique eventId)
 *
 * The script is IDEMPOTENT: collections that already exist are checked and
 * left alone (their data is never touched). It does NOT modify any existing
 * Devora collections (users, _superusers, _externalAuths, ...) — it only adds
 * these three new ones.
 *
 * Usage:
 *   DEVORA_PB_URL=https://pocketbase.example.com \
 *   DEVORA_PB_ADMIN_EMAIL=website@example.com \
 *   DEVORA_PB_ADMIN_PASSWORD='...' \
 *   node scripts/setup-website-collections.mjs
 *
 * (Values can also be passed as --url / --email / --password arguments.)
 *
 * After it finishes, manage the data in the PocketBase admin UI:
 *   - Pricing: create/enable "website_pricing" records (planId, name,
 *     billingPeriod, priceDisplay, ...). The website pricing page reads them
 *     within seconds. No enabled records → the page honestly shows
 *     "Pricing to be announced".
 *   - Support: read "website_support_messages" (the website's support form
 *     writes here).
 *   - Webhooks: "website_webhook_events" fills up automatically once Paddle
 *     webhooks are configured.
 */

const args = process.argv.slice(2);
function argValue(name) {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

const BASE_URL = (argValue("url") || process.env.DEVORA_PB_URL || "").trim().replace(/\/+$/, "");
const EMAIL = (argValue("email") || process.env.DEVORA_PB_ADMIN_EMAIL || "").trim();
const PASSWORD = argValue("password") || process.env.DEVORA_PB_ADMIN_PASSWORD || "";

if (!BASE_URL || !EMAIL || !PASSWORD) {
  console.error(
    "Missing configuration. Provide DEVORA_PB_URL, DEVORA_PB_ADMIN_EMAIL and DEVORA_PB_ADMIN_PASSWORD (or --url/--email/--password)."
  );
  process.exit(1);
}
if (!/^https:\/\//.test(BASE_URL)) {
  console.error("DEVORA_PB_URL must start with https:// (the website refuses plain http in production).");
  process.exit(1);
}

const TIMEOUT_MS = 15000;

async function call(method, path, { body, token } = {}) {
  let res;
  try {
    res = await fetch(BASE_URL + path, {
      method,
      headers: {
        accept: "application/json",
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    console.error(`PocketBase could not be reached at ${BASE_URL}: ${err.message}`);
    process.exit(1);
  }
  const text = await res.text().catch(() => "");
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function superuserToken() {
  const r = await call("POST", "/api/collections/_superusers/auth-with-password", {
    body: { identity: EMAIL, password: PASSWORD },
  });
  if (r.status !== 200 || typeof r.data?.token !== "string") {
    console.error(
      `PocketBase superuser sign-in failed (HTTP ${r.status}). Check the email/password — they must belong to a _superusers record, not a regular user.`
    );
    process.exit(1);
  }
  return r.data.token;
}

// Field type shapes differ between PocketBase v0.23+ ("fields" array) and
// older versions ("schema" array). We build both from one definition.
function modernFields(def) {
  return def.fields.map((f) => {
    const field = { name: f.name, type: f.type, required: Boolean(f.required) };
    if (f.type === "select") {
      field.values = f.values;
      field.maxSelect = 1;
    }
    if (f.type === "text" && f.max) field.max = f.max;
    if (f.type === "json" && f.maxSize) field.maxSize = f.maxSize;
    return field;
  });
}

function legacySchema(def) {
  return def.fields.map((f) => ({
    name: f.name,
    type: f.type,
    required: Boolean(f.required),
    options: {
      ...(f.type === "select" ? { values: f.values, maxSelect: 1 } : {}),
      ...(f.type === "text" && f.max ? { max: f.max } : {}),
      ...(f.type === "json" && f.maxSize ? { maxSize: f.maxSize } : {}),
    },
  }));
}

const COLLECTIONS = [
  {
    name: "website_pricing",
    description: "Published Devora pricing plans, shown on the website /pricing page.",
    fields: [
      { name: "planId", type: "text", required: true, max: 64 },
      { name: "name", type: "text", required: true, max: 120 },
      { name: "tagline", type: "text", required: false, max: 200 },
      { name: "billingPeriod", type: "select", required: true, values: ["month", "year"] },
      { name: "priceDisplay", type: "text", required: false, max: 32 },
      { name: "currency", type: "text", required: false, max: 8 },
      { name: "paddlePriceId", type: "text", required: false, max: 128 },
      { name: "features", type: "json", required: false, maxSize: 65536 },
      { name: "highlighted", type: "bool", required: false },
      { name: "enabled", type: "bool", required: false },
      { name: "sortOrder", type: "number", required: false },
    ],
    // "" = everyone (public read of published plans); null = superuser only.
    listRule: "",
    viewRule: "",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    indexes: ["CREATE UNIQUE INDEX idx_website_pricing_planId ON website_pricing (planId)"],
  },
  {
    name: "website_support_messages",
    description: "Support form inbox — messages submitted through the website /support page.",
    fields: [
      { name: "name", type: "text", required: false, max: 120 },
      { name: "email", type: "text", required: true, max: 200 },
      { name: "subject", type: "text", required: true, max: 200 },
      { name: "category", type: "text", required: true, max: 60 },
      { name: "message", type: "text", required: true, max: 20000 },
      { name: "status", type: "text", required: false, max: 20 },
    ],
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    indexes: [],
  },
  {
    name: "website_webhook_events",
    description: "Paddle Billing webhook audit ledger (each event processed exactly once).",
    fields: [
      { name: "eventId", type: "text", required: true, max: 64 },
      { name: "eventType", type: "text", required: true, max: 120 },
      { name: "payload", type: "text", required: false, max: 600000 },
    ],
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    indexes: ["CREATE UNIQUE INDEX idx_website_webhook_events_eventId ON website_webhook_events (eventId)"],
  },
];

async function ensureCollection(def, token) {
  const existing = await call("GET", `/api/collections/${encodeURIComponent(def.name)}`, { token });
  if (existing.status === 200) {
    console.log(`= ${def.name}: already exists — left untouched.`);
    return "exists";
  }

  // PocketBase v0.23+ payload shape.
  let r = await call("POST", "/api/collections", {
    token,
    body: {
      name: def.name,
      type: "base",
      fields: modernFields(def),
      listRule: def.listRule,
      viewRule: def.viewRule,
      createRule: def.createRule,
      updateRule: def.updateRule,
      deleteRule: def.deleteRule,
      indexes: def.indexes,
    },
  });

  // Older PocketBase: retry with the legacy "schema" shape.
  if (r.status === 400 && r.data && JSON.stringify(r.data).includes("schema")) {
    r = await call("POST", "/api/collections", {
      token,
      body: {
        name: def.name,
        type: "base",
        schema: legacySchema(def),
        listRule: def.listRule,
        viewRule: def.viewRule,
        createRule: def.createRule,
        updateRule: def.updateRule,
        deleteRule: def.deleteRule,
        indexes: def.indexes,
      },
    });
  }

  if (r.status === 200 || r.status === 201 || r.status === 204) {
    console.log(`+ ${def.name}: created.`);
    return "created";
  }

  console.error(`! ${def.name}: FAILED (HTTP ${r.status}) — ${JSON.stringify(r.data)?.slice(0, 400)}`);
  return "failed";
}

async function main() {
  console.log(`PocketBase: ${BASE_URL}`);
  const token = await superuserToken();
  console.log("Signed in as superuser.\n");

  const results = [];
  for (const def of COLLECTIONS) {
    results.push([def.name, await ensureCollection(def, token)]);
  }

  console.log("\nSummary:");
  for (const [name, result] of results) {
    console.log(`  ${result === "failed" ? "!" : "+"} ${name}: ${result}`);
  }
  if (results.some(([, r]) => r === "failed")) process.exit(1);

  console.log(
    `
Next steps:
  1. Open the PocketBase admin UI and add enabled records to "website_pricing"
     (planId, name, billingPeriod=month|year, priceDisplay e.g. "$10",
      paddlePriceId when Paddle is live, features as a JSON array of strings,
      highlighted, enabled, sortOrder). The website pricing page picks them up
      automatically; with no enabled records it shows "Pricing to be announced".
  2. Support messages will appear in "website_support_messages".
  3. Paddle webhook events will appear in "website_webhook_events".
  4. Set on the WEBSITE deployment:
       DEVORA_PB_URL=${BASE_URL}
       DEVORA_PB_ADMIN_EMAIL=<the same dedicated superuser email>
       DEVORA_PB_ADMIN_PASSWORD=<its password>
`
  );
}

main();
