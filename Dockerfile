# Devora website — production image for Dokploy.
# Multi-stage: bun installs deps and builds; a slim node runtime serves the
# standalone output. No secrets are copied into the image.

FROM oven/bun:1.2-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.2-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma client must be generated inside the image before building.
RUN bunx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
# package.json "build" = next build + copy static/public into standalone.
RUN bun run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S devora && adduser -S devora -G devora \
    && mkdir -p /app/data \
    && chown -R devora:devora /app

# Standalone output already includes .next/static and public
# (package.json build script copies them in).
COPY --from=builder --chown=devora:devora /app/.next/standalone ./

USER devora
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
