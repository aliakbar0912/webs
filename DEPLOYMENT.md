# Deploying the Devora website to Dokploy

Target: **https://devora.mughalx.tech** — deployed as a **separate service**
on the existing Dokploy host. This deployment touches nothing else: the
existing API, admin panel, PocketBase, SearXNG, or other services are not
modified, and no DNS or proxy changes are made for them.

---

## 1. What ships in this repository

| Item | Location |
| --- | --- |
| Next.js 16 App Router website (TypeScript strict) | `src/` |
| Production Dockerfile (multi-stage, non-root, healthcheck) | `Dockerfile` |
| Health endpoint for restart/health checks | `GET /api/health` |
| Environment template (placeholders only, no secrets) | `.env.example` |
| Integration report (verified vs pending endpoints) | `INTEGRATION.md` |
| Build / quality commands | `package.json` scripts |

Commands:

```bash
bun install          # install dependencies
bun run dev          # local development (port 3000)
bun run lint         # ESLint
bunx tsc --noEmit    # TypeScript strict check (app sources)
bun run build        # production build (standalone output)
```

## 2. Repository hygiene

- `.env` is **never committed**. Only `.env.example` with placeholders is.
- All secrets are injected at runtime through Dokploy environment variables.
- Before pushing, run a quick secret scan:

```bash
git grep -nE "sk-|secret|password|api[_-]key" -- .env.example Dockerfile src/ | grep -v "process.env" || true
```

## 3. Create the service in Dokploy

1. **Push this project to a Git repository** (the website only — it is a
   standalone Next.js app and does not depend on the desktop app code).
2. In Dokploy: **New Project → New Resource → Application**, connect the repo.
3. Build type: **Dockerfile** (path: `./Dockerfile`). The image builds with
   Bun and runs on `node:22-alpine` as a non-root user.
4. Port: **3000**.
5. Domain: add `devora.mughalx.tech` in the app's **Domain** tab and enable
   HTTPS — Dokploy's existing reverse proxy (Traefik) issues the certificate.
   The app itself forces no assumptions about the domain; it reads
   `NEXT_PUBLIC_SITE_URL` for canonical/OG URLs.
6. Health check: path **`/api/health`**, expects HTTP 200. The container also
   defines an internal Docker `HEALTHCHECK`.

### PocketBase storage (recommended) — where website data lives

By default (and as an automatic fallback) support messages and the Paddle
webhook audit ledger live in SQLite. **The recommended setup stores them in
PocketBase instead — the same store that owns Devora accounts** — together
with owner-managed pricing plans. Mount the volume anyway so the fallback
keeps working:

- Mount point: **`/app/data`**
- Environment variable: `DATABASE_URL=file:/app/data/devora.db`

Then create the schema once (one-off, e.g. from a Dokploy console using the
builder image or any machine with the repo):

```bash
DATABASE_URL=file:/app/data/devora.db bunx prisma db push
```

(There is deliberately **no user table** — accounts stay in the existing
upstream system. See `INTEGRATION.md`.)

To activate the central PocketBase store, run the one-time idempotent setup
script from any machine with Node 18+ and network access to PocketBase:

```bash
DEVORA_PB_URL=https://<your-pocketbase> \
DEVORA_PB_ADMIN_EMAIL=<dedicated website superuser> \
DEVORA_PB_ADMIN_PASSWORD='...' \
node scripts/setup-website-collections.mjs
```

It creates only `website_pricing`, `website_support_messages` and
`website_webhook_events` (existing Devora collections are never touched).
Then set `DEVORA_PB_URL`, `DEVORA_PB_ADMIN_EMAIL`, `DEVORA_PB_ADMIN_PASSWORD`
on the website deployment. **After the updated API server is deployed, the
admin panel's new “Website” tab manages all of it**: pricing plans
(create/edit/publish), the support inbox and the webhook audit log — the
PocketBase admin UI is no longer needed for day-to-day operation. With no
enabled plans the pricing page honestly shows "Pricing to be announced".
Full data-flow table: `INTEGRATION.md` §3.

### Provider sign-in (Google / GitHub)

The website's sign-in and register pages show working "Continue with Google"
buttons as soon as the provider is enabled on the PocketBase `users`
collection — no website configuration is needed:

1. Google Cloud Console → OAuth client (Web application) → authorized
   redirect URI: `https://devora.mughalx.tech/api/auth/oauth/callback`.
2. PocketBase admin UI → `users` collection → OAuth2 → enable the provider
   and paste the client id/secret.

The flow runs entirely server-side on the website (PocketBase holds the
client secret and checks PKCE); a signed-in Google account gets the same web
device session as a password sign-in. Details: `INTEGRATION.md` §4a.

## 4. Environment variables (set in Dokploy, never in Git)

Copy values from `.env.example` into the app's Environment tab. Minimum set:

```ini
NEXT_PUBLIC_SITE_URL=https://devora.mughalx.tech
NEXT_PUBLIC_BILLING_ENABLED=false
DATABASE_URL=file:/app/data/devora.db
DEVORA_API_BASE_URL=https://saas.mughalx.tech
# Only when the API expects a server key:
DEVORA_SERVER_API_KEY=
# Required for login sessions to work (openssl rand -hex 32):
SESSION_SECRET=
# Central PocketBase storage (recommended — see §3 above):
DEVORA_PB_URL=
DEVORA_PB_ADMIN_EMAIL=
DEVORA_PB_ADMIN_PASSWORD=
```

Paddle, release-manifest, and support-webhook variables are documented in
`.env.example` and stay empty until each integration is confirmed
(`INTEGRATION.md` §3). Never mix `PADDLE_ENV=sandbox` credentials with
`live`, and never place any secret in a `NEXT_PUBLIC_*` variable.

## 5. Deploy, then verify

1. **Deploy** in Dokploy; wait for the health check to pass.
2. Smoke-test the deployment:

```bash
curl -s https://devora.mughalx.tech/api/health
# {"status":"ok","service":"devora-website",...}

bash scripts/smoke-routes.sh   # replace BASE with https://devora.mughalx.tech
```

3. Walk the pages: `/`, `/features`, `/pricing`, `/download`, `/docs`,
   `/support`, `/login`, `/register`, `/forgot-password`, `/terms`,
   `/privacy`, `/refunds`. Confirm `/dashboard` redirects to
   `/login?next=%2Fdashboard` when signed out.
4. Check `robots.txt` and `sitemap.xml` resolve, and that OG metadata
   renders on a share preview.
5. Confirm nothing in the client bundle contains secrets: view-source +
   DevTools network — the only session artifact is the HttpOnly
   `devora_session` cookie.

## 6. Enabling integrations later

Each capability in this website ships **built but honestly disabled** until
its dependency exists. Activation checklist:

| Capability | What must exist | Where to configure |
| --- | --- | --- |
| Sign-in / registration / dashboards | Real upstream auth contract + server API key + `SESSION_SECRET` | Env vars + `DEVORA_API_*_PATH` (adjust paths if real routes differ) |
| Google / GitHub sign-in | Provider enabled on the PocketBase `users` collection | PocketBase admin UI (OAuth2 settings) — website picks it up automatically |
| Central data store (support inbox, webhook ledger, pricing) | PocketBase `website_*` collections | `scripts/setup-website-collections.mjs` + `DEVORA_PB_*` env vars |
| Manage pricing / support inbox / webhooks | Updated API server + admin panel deployed | Admin panel → **Website** tab (`/admin/api/website/*` routes) |
| Published pricing plans | Enabled records in `website_pricing` | **Admin panel → Website tab** (PocketBase admin UI also works; env `NEXT_PUBLIC_PRO_*` is a fallback only) |
| Billing & subscription sync | Paddle account approved; product/price IDs | `PADDLE_*` env vars; webhook URL `https://devora.mughalx.tech/api/webhooks/paddle`; flip `NEXT_PUBLIC_BILLING_ENABLED=true` |
| Downloads | Signed release manifest (HTTPS JSON) | `DEVORA_RELEASE_MANIFEST_URL` |
| Support email delivery | Webhook destination | `SUPPORT_WEBHOOK_URL` (messages are stored in PocketBase/SQLite regardless) |

Test billing **in Paddle Sandbox first** (`PADDLE_ENV=sandbox`) and only then
switch to live — the webhook verifies signatures and stays idempotent in both.

## 7. Operational notes

- **Rollback:** redeploy the previous Git SHA in Dokploy; SQLite data lives on
  the volume and is unaffected.
- **Logs:** structured JSON (`ts`, `level`, `scope`, `message`) with automatic
  redaction of credentials/tokens/license keys.
- **Rate limits:** auth and support endpoints are rate-limited in-process
  (10 login attempts / 15 min / IP, 5 support messages / hour / IP).
- **Scaling:** if you run more than one replica, move the SQLite file to a
  managed database or add a shared rate-limit store; the current limiter is
  per-instance by design and documented as such.
