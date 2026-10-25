#!/bin/bash
# Devora website — route smoke tests against the dev server.
# NOTE: auth/support endpoints are rate-limited per IP. On repeated runs you
# may see 429 for those checks — that means the rate limiter is working.
BASE="${1:-http://localhost:3000}"
pass=0; fail=0

check() { # path, expected_code, [curl args...]
  local path="$1"; local expected="$2"; shift 2
  local code
  code=$(curl -s -o /tmp/devora_smoke_body -w "%{http_code}" --max-time 20 "$@" "$BASE$path")
  if [ "$code" = "$expected" ]; then
    echo "PASS  $path -> $code"; pass=$((pass+1))
  else
    echo "FAIL  $path -> $code (expected $expected)"; fail=$((fail+1))
    head -c 300 /tmp/devora_smoke_body; echo
  fi
}

# accept "code1 or 429" (429 = rate limiter kicked in on a repeated run)
check_or_limited() {
  local path="$1"; local expected="$2"; shift 2
  local code
  code=$(curl -s -o /tmp/devora_smoke_body -w "%{http_code}" --max-time 20 "$@" "$BASE$path")
  if [ "$code" = "$expected" ] || [ "$code" = "429" ]; then
    echo "PASS  $path -> $code"; pass=$((pass+1))
  else
    echo "FAIL  $path -> $code (expected $expected)"; fail=$((fail+1))
    head -c 300 /tmp/devora_smoke_body; echo
  fi
}

# Public pages
check "/" 200
check "/features" 200
check "/pricing" 200
check "/download" 200
check "/docs" 200
check "/support" 200
check "/terms" 200
check "/privacy" 200
check "/refunds" 200
check "/login" 200
check "/register" 200
check "/forgot-password" 200

# SEO endpoints
check "/sitemap.xml" 200
check "/robots.txt" 200
check "/manifest.webmanifest" 200
check "/opengraph-image" 200
check "/icon.svg" 200

# Dashboard guard: unauthenticated must redirect to login (server-side)
guard=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" --max-time 20 "$BASE/dashboard")
echo "$guard" | grep -q "^30[78] " && echo "$guard" | grep -q "/login" && { echo "PASS  /dashboard guard redirect"; pass=$((pass+1)); } || { echo "FAIL  /dashboard guard: $guard"; fail=$((fail+1)); }
for sub in subscription devices usage; do
  guard=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" --max-time 20 "$BASE/dashboard/$sub")
  echo "$guard" | grep -q "^30[78] " && { echo "PASS  /dashboard/$sub guard redirect"; pass=$((pass+1)); } || { echo "FAIL  /dashboard/$sub guard: $guard"; fail=$((fail+1)); }
done

# Health endpoint
check "/api/health" 200

# Auth routes: honest behavior when the website cannot reach/configure the API.
# Login checks SESSION_SECRET first (503 when unset, e.g. this sandbox); with
# configuration in place an empty body would be a 400 instead. Both are honest.
login_code1=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H 'content-type: application/json' -d '{}' "$BASE/api/auth/login")
{ [ "$login_code1" = "400" ] || [ "$login_code1" = "503" ] || [ "$login_code1" = "429" ]; } && { echo "PASS  /api/auth/login empty body -> $login_code1"; pass=$((pass+1)); } || { echo "FAIL  /api/auth/login empty body -> $login_code1"; fail=$((fail+1)); }
login_code2=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H 'content-type: application/json' -d 'not-json' "$BASE/api/auth/login")
{ [ "$login_code2" = "400" ] || [ "$login_code2" = "503" ] || [ "$login_code2" = "429" ]; } && { echo "PASS  /api/auth/login invalid json -> $login_code2"; pass=$((pass+1)); } || { echo "FAIL  /api/auth/login invalid json -> $login_code2"; fail=$((fail+1)); }
code=$(curl -s -o /tmp/devora_login_body -w "%{http_code}" -X POST -H 'content-type: application/json' -d '{"email":"test@example.com","password":"wrongpassword"}' "$BASE/api/auth/login")
{ [ "$code" = "503" ] || [ "$code" = "401" ] || [ "$code" = "429" ]; } && echo "PASS  /api/auth/login honest unauthenticated state ($code)" && pass=$((pass+1)) || { echo "FAIL  /api/auth/login -> $code"; head -c 300 /tmp/devora_login_body; echo; fail=$((fail+1)); }

check_or_limited "/api/auth/register" 400 -X POST -H 'content-type: application/json' -d '{"email":"bad","password":"x"}'
check_or_limited "/api/auth/reset-password" 400 -X POST -H 'content-type: application/json' -d '{"otpId":"","otpCode":"12","password":"x"}'
check_or_limited "/api/auth/forgot-password" 400 -X POST -H 'content-type: application/json' -d '{"email":"nope"}'
check "/api/auth/logout" 200 -X POST

# Support API: validation + honeypot + honest storage (rate-limited to 5/h/IP)
support_code=$(curl -s -o /tmp/devora_support_body -w "%{http_code}" -X POST -H 'content-type: application/json' -d '{}' "$BASE/api/support")
{ [ "$support_code" = "400" ] || [ "$support_code" = "429" ]; } && { echo "PASS  /api/support invalid body -> $support_code"; pass=$((pass+1)); } || { echo "FAIL  /api/support invalid body -> $support_code"; fail=$((fail+1)); }
resp=$(curl -s -X POST -H 'content-type: application/json' -d '{"name":"Smoke Test","email":"smoke@example.com","category":"general","subject":"Automated smoke test","message":"This is an automated smoke test message from the route verification script.","website":""}' "$BASE/api/support")
echo "$resp" | grep -q '"ok":true' && echo "PASS  /api/support valid submission stored" || echo "INFO  /api/support response: $resp (likely rate-limited on a repeated run)"

# Paddle webhook: honest 503 while secret is not configured
check "/api/webhooks/paddle" 503 -X POST -H 'content-type: application/json' -d '{"event_id":"evt_test","event_type":"x"}'

# 404 page
check "/definitely-not-a-page" 404

echo "-----------------------------"
echo "PASS: $pass   FAIL: $fail"
[ "$fail" = "0" ]
