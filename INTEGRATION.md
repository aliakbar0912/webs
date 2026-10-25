# Devora AI — Website Integration Report

**Report date:** 2026-10-26 (updated after receiving the server source)
**Website target:** `https://devora.mughalx.tech`
**Public API base:** `https://saas.mughalx.tech`
**Server source:** `adminserver/server` (uploaded by the owner; all routes and
payload shapes below are verified against that source, not guessed).

---

## 1. How the integration actually works

The Devora API is a zero-dependency Node 22 service backed by PostgreSQL,
Redis (optional) and PocketBase (identities). Two facts drive the website
architecture:

1. **The API gate** — every request (except `/healthz`, `/readyz` and the
   OAuth callback) must carry the shared access key in the **`x-api-key`**
   header (`API_ACCESS_KEY`, ≥24 chars, constant-time compared). The website
   sends it server-side only, from `DEVORA_SERVER_API_KEY`.
2. **Device-token auth** — PocketBase owns identities. Clients sign a user in
   with PocketBase directly (`auth-with-password`), then exchange the pbToken
   at `POST /v1/auth/session { pbToken, installId, deviceName }`. The API
   binds a **device row** and returns a **device token** (30-day TTL, hashed
   at rest, rotatable via `/v1/auth/refresh`). Signed-in routes authenticate
   with `Authorization: Bearer <device token>`.

**Website as a client:** the website signs the user in exactly like the
desktop does — PocketBase first (server-side; the pbToken never leaves the
server or gets logged), then the session route. Each browser keeps a stable
random `installId` cookie (`devora_web_install`), so repeat sign-ins rebind
the same device row; if the API answers `409 device_proof_required` (identity
belongs to another account), the flow retries once with a fresh identity —
the same thing a brand-new desktop install does. Blocked devices are never
retried. The web session appears honestly in the account's device list.

**CORS:** the API grants browser CORS only to `ADMIN_ORIGIN`. The website
therefore makes **all** API calls server-side (Next.js route
handlers/server components), which it already did — no browser ever talks to
the API directly.

## 2. Confirmed endpoints used by the website

| Website capability | API route | Auth | Notes |
| --- | --- | --- | --- |
| Service health | `GET /healthz`, `GET /readyz` | keyless | `/api/health` aggregates |
| Auth config | `GET /v1/auth/config` | x-api-key | enabled flag, PB url + users collection, OAuth providers, loginRequired |
| Sign-in | PB `auth-with-password` → `POST /v1/auth/session` | x-api-key | `{ deviceId, token, tokenExpiresAt, claimed, user }` |
| Logout | `POST /v1/auth/logout` | Bearer | ends the web device session; idempotent |
| Token rotation | `POST /v1/auth/refresh` | Bearer | available; website relies on 30-day TTL instead |
| Account overview | `GET /v1/account` | Bearer | `{ user, identities, tokenExpiresAt, devices[] }` — powers dashboard + devices page |
| Remote sign-out | `POST /v1/account/devices/:id/sign-out` | Bearer | device management action |
| Usage | `GET /v1/usage?days=N` | Bearer | per-device request/token aggregates (models, ok/failed, prompt/completion tokens) |
| Downloads | `GET /v1/client-config` | x-api-key | `desktop.latestVersion`, `desktop.downloadUrl`, `statusMessage` — download page fallback |
| Installer stream | `GET /v1/updates/:id/download` | Bearer | used by the desktop updater; the website links to the configured HTTPS download URL instead |
| Password reset | PB `request-otp` → `POST /v1/auth/password-reset` | x-api-key | API verifies the OTP itself; `{ otpId, otpCode, password }` |
| Registration | PB `POST /api/collections/{users}/records` | public | **The API has no register route** — PocketBase owns signup; website creates the record + requests verification email |
| Provider sign-in (Google/GitHub) | PB `auth-methods` → provider → PB `auth-with-oauth2` → `POST /v1/auth/session` | x-api-key | The website runs the whole OAuth dance server-side against PocketBase (which holds each provider's client secret + PKCE); the pbToken then binds a web device exactly like the password flow. Buttons render only for providers enabled on the users collection |
| Announcements | `GET /v1/announcements` | Bearer | owner-published notices (`org_announcements`, edited in the admin panel); shown in the website dashboard |

## 3. Website data stored in PocketBase (central admin data store)

The website keeps **all of its operational data in the same PocketBase that
owns Devora identities** (the API server's account store), so the owner finds
everything in one place — no second user database, no data trapped on the
website container. A local SQLite file remains only as an automatic fallback
when PocketBase storage is not configured.

| Website data | PocketBase collection | API rules | Who writes it |
| --- | --- | --- | --- |
| User accounts | `{users}` (existing) | managed by the API server | the website (signup) + API server (sessions) |
| Pricing plans | `website_pricing` | **public read**, superuser-only writes | the owner — **admin panel → Website → Pricing plans** (or the PocketBase admin UI) |
| Support inbox | `website_support_messages` | superuser-only | the website (support form); read + mark handled in the admin panel → Website → Support inbox |
| Paddle webhook audit ledger | `website_webhook_events` | superuser-only, unique `eventId` | the website (webhook receiver); browse it in admin panel → Website → Webhook log |

The three `website_*` collections are created **once** with the idempotent
setup script:

```bash
DEVORA_PB_URL=https://<your-pocketbase> \
DEVORA_PB_ADMIN_EMAIL=<dedicated website superuser> \
DEVORA_PB_ADMIN_PASSWORD='...' \
node scripts/setup-website-collections.mjs
```

The script creates **only** these three collections; it never touches the
existing `users`, `_superusers`, `_externalAuths` or any API-server tables.
Pricing plan fields: `planId`, `name`, `tagline`, `billingPeriod`
(month/year), `priceDisplay`, `currency`, `paddlePriceId`, `features` (JSON
array of strings), `highlighted`, `enabled`, `sortOrder`. The pricing page
reads enabled plans (sorted by `sortOrder`) within its normal render cycle;
with **no enabled plans it honestly shows "Pricing to be announced"**, and
`paddlePriceId` is what turns a plan's checkout button live once billing is
enabled.

## 4. Confirmed NOT available (honest states in the UI)

- **Billing/subscription routes** — the server has none (full route table
  reviewed). The dashboard subscription page states this explicitly; the
  pricing page stays disabled until Paddle is approved **and** billing routes
  ship upstream. Paddle webhook receiver remains implemented and armed via
  `PADDLE_WEBHOOK_SECRET`, with an idempotent event ledger (PocketBase when
  configured, local SQLite otherwise).
- **MFA/OTP enrollment UI** — PocketBase MFA, if enabled, surfaces its real
  message on the login page.

## 4a. Provider sign-in (Google/GitHub) on the website

The API's own OAuth routes (`/v1/auth/oauth/start|callback|exchange`) are
built for the **desktop** loopback handoff and are not used by the website.
Instead the website completes PocketBase's OAuth2 flow directly, server-side
(the same calls the desktop's sign-in browser makes):

1. `GET /api/collections/{users}/auth-methods` → enabled providers, each with
   a fresh `state` + PKCE `codeVerifier` and an `authUrl` ending in
   `redirect_uri=`.
2. The browser is redirected to the provider with
   `redirect_uri = <site>/api/auth/oauth/callback`; the handshake
   (`provider, state, codeVerifier, redirectUrl, installId`) rides along in a
   short-lived HMAC-signed HttpOnly cookie (`devora_oauth`, 10 min).
3. The provider redirects back; the website verifies `state`, then calls
   `POST /api/collections/{users}/auth-with-oauth2` — PocketBase holds the
   client secret and checks PKCE + the exact redirect URL — and exchanges the
   returned pbToken for a web device session exactly like the password flow.

**Owner setup (one-time):**

1. Google Cloud Console → create an OAuth client (Web application) with the
   authorized redirect URI `https://devora.mughalx.tech/api/auth/oauth/callback`.
2. PocketBase admin UI → `users` collection → OAuth2 → enable the provider,
   paste the client id/secret. (Also set `PUBLIC_API_ORIGIN` on the API server
   if the desktop apps should offer the same provider.)
3. Done — the sign-in and register pages show "Continue with Google"
   automatically for every enabled provider; no website env change is needed.

No API server changes are involved in this flow.

## 5. Environment variables (final)

| Variable | Required | Purpose |
| --- | --- | --- |
| `DEVORA_API_BASE_URL` | Yes | API origin; requests host-restricted to it |
| `DEVORA_SERVER_API_KEY` | Yes for API features | The API's `API_ACCESS_KEY` (sent as `x-api-key`) |
| `SESSION_SECRET` | Yes for sign-in | HMAC key for the website's signed session cookie |
| `DATABASE_URL` | Yes (fallback) | SQLite file used only when PocketBase storage is not configured |
| `DEVORA_PB_URL` | Recommended | PocketBase origin — the same instance the API server uses (`POCKETBASE_URL`) |
| `DEVORA_PB_ADMIN_EMAIL` / `_PASSWORD` | With `DEVORA_PB_URL` | **Dedicated** PocketBase superuser for the website (writes support messages + webhook ledger) |
| `DEVORA_PB_*_COLLECTION` | No | Collection name overrides (defaults: `website_pricing`, `website_support_messages`, `website_webhook_events`, `users`) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical origin |
| `NEXT_PUBLIC_BILLING_ENABLED` | Until billing | `false` keeps purchase buttons honestly disabled |
| `DEVORA_*_PATH` endpoint overrides | No | All endpoint defaults are the confirmed routes |
| `DEVORA_RELEASE_MANIFEST_URL` | No | Optional signed manifest; falls back to `/v1/client-config` |
| `PADDLE_*` | When billing | Sandbox-first; never mixed with live |
| `NEXT_PUBLIC_PRO_MONTHLY_PRICE` / `_ANNUAL_PRICE` | No | Env-based price display fallback (PocketBase plans take priority) |
| `SUPPORT_WEBHOOK_URL` | No | Optional extra delivery of support messages (stored in PocketBase/SQLite regardless) |

## 6. Owner checklist

1. Set `DEVORA_SERVER_API_KEY` (= API's `API_ACCESS_KEY`) and `SESSION_SECRET`
   in Dokploy → sign-in, register, dashboard, devices, usage activate.
2. Run `scripts/setup-website-collections.mjs` once against PocketBase and set
   `DEVORA_PB_URL` + the dedicated superuser on the website → support inbox,
   webhook ledger and pricing all live in the central store (§3).
3. Publish pricing plans in the **admin panel → Website → Pricing plans**
   (creates/edits/publishes `website_pricing` records through the API's new
   `/admin/api/website/pricing` routes — no PocketBase admin UI needed).
   With no enabled plans the website honestly shows "Pricing to be announced".
4. Read the support inbox and webhook log in **admin panel → Website**.
5. For Google/GitHub sign-in: enable the provider on the PocketBase `users`
   collection (client id/secret + redirect URI, see §4a) — the website picks
   it up automatically.
6. Ensure PocketBase users collection allows self-signup if public
   registration should work (otherwise the register page shows the API's real
   answer).
7. Publish a desktop release in the admin panel (`/admin/api/releases`) →
   the download page picks up version + download URL automatically via
   `client-config`; or set `DEVORA_RELEASE_MANIFEST_URL` for checksum display.
8. Announcements published in the admin panel appear in signed-in users'
   dashboards automatically (`GET /v1/announcements`).
9. Paddle: after approval, add billing routes to the API (documented need),
   then configure `PADDLE_*` and flip `NEXT_PUBLIC_BILLING_ENABLED`.
10. Verify all `[OWNER TO VERIFY]` placeholders in `/terms`, `/privacy`,
   `/refunds` before launch.

## 7. Historical note

The first integration pass (before the server source was provided) could only
confirm `/healthz`; every other path returned a catch-all 401. The website was
built with honest "not configured" states for everything unverified. This
document now reflects the verified contract from the actual server source;
the adapters were rewritten against it.
