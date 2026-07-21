/**
 * Thin wrapper for HTTP calls to third-party hosts (store lookups, weather,
 * camera stream server) that legitimately bypass the app's axios client — those
 * hosts are not the app API and must not receive the app auth headers/baseURL.
 * Centralizes optional timeout + abort so these calls stay consistent.
 */
type ExternalFetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  /** Caller-provided abort signal (honored alongside any timeout). */
  signal?: AbortSignal;
  /** When set, aborts the request after this many ms. */
  timeoutMs?: number;
};

export const externalFetch = (
  url: string,
  { method = "GET", headers, signal, timeoutMs }: ExternalFetchOptions = {},
): Promise<Response> => {
  if (!timeoutMs) {
    return fetch(url, { method, headers, signal });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    signal.addEventListener("abort", () => controller.abort());
  }

  return fetch(url, { method, headers, signal: controller.signal }).finally(
    () => clearTimeout(timeout),
  );
};
