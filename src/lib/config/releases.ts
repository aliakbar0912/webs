import "server-only";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Desktop release manifest loader.
 *
 * Rules:
 * - Installer URLs, versions, and checksums are NEVER invented. They come
 *   exclusively from a trusted HTTPS manifest (DEVORA_RELEASE_MANIFEST_URL)
 *   supplied by the owner. If none is configured (or it fails validation),
 *   the download page renders an honest "Coming soon" state.
 */

export interface ReleasePlatform {
  os: "windows" | "macos" | "linux";
  arch: string;
  url: string;
  sha256: string | null;
  sizeBytes: number | null;
  /** e.g. "Authenticode signed" — only shown when the manifest asserts it. */
  signing: string | null;
}

export interface ReleaseInfo {
  version: string;
  channel: string;
  releasedAt: string | null;
  notes: string | null;
  platforms: ReleasePlatform[];
}

interface RawManifest {
  version?: unknown;
  channel?: unknown;
  releasedAt?: unknown;
  notes?: unknown;
  platforms?: unknown;
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseManifest(raw: unknown): ReleaseInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as RawManifest;
  if (typeof m.version !== "string" || !/^[0-9A-Za-z][0-9A-Za-z.\-+]*$/.test(m.version)) {
    return null;
  }
  if (!Array.isArray(m.platforms) || m.platforms.length === 0) return null;

  const platforms: ReleasePlatform[] = [];
  for (const p of m.platforms) {
    if (!p || typeof p !== "object") return null;
    const plat = p as Record<string, unknown>;
    if (
      (plat.os !== "windows" && plat.os !== "macos" && plat.os !== "linux") ||
      typeof plat.arch !== "string" ||
      !isHttpsUrl(plat.url)
    ) {
      return null;
    }
    platforms.push({
      os: plat.os,
      arch: plat.arch,
      url: plat.url,
      sha256: typeof plat.sha256 === "string" && /^[a-f0-9]{64}$/i.test(plat.sha256)
        ? plat.sha256
        : null,
      sizeBytes: typeof plat.sizeBytes === "number" && plat.sizeBytes > 0 ? plat.sizeBytes : null,
      signing: typeof plat.signing === "string" ? plat.signing : null,
    });
  }

  return {
    version: m.version,
    channel: typeof m.channel === "string" ? m.channel : "stable",
    releasedAt: typeof m.releasedAt === "string" ? m.releasedAt : null,
    notes: typeof m.notes === "string" ? m.notes : null,
    platforms,
  };
}

export async function getRelease(): Promise<ReleaseInfo | null> {
  const manifestUrl = serverEnv.releaseManifestUrl();
  if (!manifestUrl) return null;
  if (!isHttpsUrl(manifestUrl)) {
    logger.warn("releases", "DEVORA_RELEASE_MANIFEST_URL must be an HTTPS URL");
    return null;
  }
  try {
    const response = await fetch(manifestUrl, {
      next: { revalidate: 300 },
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      logger.warn("releases", "Release manifest fetch failed", { status: response.status });
      return null;
    }
    const raw: unknown = await response.json();
    const parsed = parseManifest(raw);
    if (!parsed) {
      logger.warn("releases", "Release manifest failed validation; showing honest empty state");
      return null;
    }
    return parsed;
  } catch (err) {
    logger.warn("releases", "Release manifest fetch error", { err });
    return null;
  }
}
