/**
 * Devora upstream API client — server-side only.
 *
 * Guarantees:
 * - Requests are restricted to the configured API host (SSRF protection).
 * - Hard request timeouts; no unbounded waits.
 * - A structured, discriminated result type: callers must handle failure.
 * - Secrets (server API key) are attached server-side and never logged.
 * - Diagnostics include request IDs; sensitive values are never logged.
 *
 * IMPORTANT: upstream endpoint contracts beyond `GET /healthz` are not yet
 * verified (see INTEGRATION.md). This client is therefore conservative and
 * typed loosely — it reports upstream failures honestly instead of guessing.
 */

import "server-only";
import { randomUUID } from "crypto";
import { apiBaseUrl, serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

const DEFAULT_TIMEOUT_MS = 10_000;

export type ApiErrorCode =
  | "not_configured"
  | "network_error"
  | "timeout"
  | "upstream_error"
  | "invalid_response";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  /** HTTP status returned by the upstream API, when the request completed. */
  upstreamStatus?: number;
  /** Stable machine-readable code returned by the upstream API, when present. */
  upstreamCode?: string;
  requestId: string;
}

export type ApiResult<T> =
  | { ok: true; data: T; requestId: string }
  | { ok: false; error: ApiError; requestId: string };

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  /**
   * When false, the server API key is omitted even if configured
   * (used for endpoints that authenticate with a user token instead).
   */
  useServerKey?: boolean;
  /** Bearer token obtained from a user login (never a desktop device token). */
  userToken?: string;
}

function describeError(err: unknown, requestId: string): ApiError {
  if (err instanceof Error && err.name === "TimeoutError") {
    return {
      code: "timeout",
      message: "The request to the Devora API timed out.",
      requestId,
    };
  }
  if (err instanceof Error && err.name === "AbortError") {
    return { code: "timeout", message: "The request was aborted.", requestId };
  }
  return {
    code: "network_error",
    message: "The Devora API could not be reached.",
    requestId,
  };
}

/**
 * Perform a JSON request against the configured upstream API.
 * Path must be rooted and will be resolved against the configured base URL.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<ApiResult<T>> {
  const requestId = randomUUID();
  const base = apiBaseUrl();

  if (!base) {
    return {
      ok: false,
      requestId,
      error: {
        code: "not_configured",
        message:
          "The Devora API base URL is not configured on this server. An administrator must set DEVORA_API_BASE_URL.",
        requestId,
      },
    };
  }

  // SSRF guard: only same-origin (relative to configured base) paths allowed.
  if (!path.startsWith("/")) {
    return {
      ok: false,
      requestId,
      error: {
        code: "invalid_response",
        message: "Internal error: API paths must be rooted.",
        requestId,
      },
    };
  }

  let url: URL;
  try {
    url = new URL(path, base);
    if (url.host !== base.host || url.protocol !== "https:") {
      throw new Error("host mismatch");
    }
  } catch {
    return {
      ok: false,
      requestId,
      error: {
        code: "invalid_response",
        message: "Internal error: request host is outside the allowed API origin.",
        requestId,
      },
    };
  }

  const headers: Record<string, string> = {
    accept: "application/json",
    "x-request-id": requestId,
  };

  // The Devora API gate expects the shared access key in the `x-api-key`
  // header (see server/src/app.ts hasApiKey). User-authenticated calls
  // additionally carry the device token as `Authorization: Bearer`.
  const useServerKey = options.useServerKey !== false;
  const apiKey = serverEnv.apiKey();
  if (useServerKey && apiKey) {
    headers["x-api-key"] = apiKey;
  }
  if (options.userToken) {
    headers.authorization = `Bearer ${options.userToken}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );
  const onOuterAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onOuterAbort, { once: true });

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await response.text();
    let payload: unknown = undefined;
    if (text.length > 0) {
      try {
        payload = JSON.parse(text);
      } catch {
        if (response.ok) {
          logger.warn("api", "Upstream returned non-JSON body with 2xx status", {
            requestId,
            path,
            status: response.status,
          });
          return {
            ok: false,
            requestId,
            error: {
              code: "invalid_response",
              message: "The Devora API returned an unexpected response format.",
              upstreamStatus: response.status,
              requestId,
            },
          };
        }
      }
    }

    if (!response.ok) {
      const errPayload =
        payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
      const inner =
        errPayload.error && typeof errPayload.error === "object"
          ? (errPayload.error as Record<string, unknown>)
          : {};
      const upstreamCode =
        typeof inner.code === "string" ? inner.code : undefined;
      const upstreamMessage =
        typeof inner.message === "string" ? inner.message : undefined;

      logger.warn("api", "Upstream API error", {
        requestId,
        method: options.method ?? "GET",
        path,
        status: response.status,
        upstreamCode,
      });

      return {
        ok: false,
        requestId,
        error: {
          code: "upstream_error",
          message:
            upstreamMessage ??
            `The Devora API returned status ${response.status}.`,
          upstreamStatus: response.status,
          upstreamCode,
          requestId,
        },
      };
    }

    return { ok: true, data: payload as T, requestId };
  } catch (err) {
    logger.error("api", "Upstream request failed", {
      requestId,
      method: options.method ?? "GET",
      path,
      err,
    });
    return { ok: false, requestId, error: describeError(err, requestId) };
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", onOuterAbort);
  }
}
