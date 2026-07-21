import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { Buffer } from "buffer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_ENDPOINTS, BASE_URL } from "../../config/index";
import { log, warn } from "../../utils/Logger";
import type { LogoutReason } from "../../types/context.d";
import { withTimeout } from "../../utils/helpers/promise";

export type ApiMethod = "GET" | "POST" | "PUT" | "DELETE";

type AuthenticatedRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type ApiError = AxiosError & {
  NEED_LOGIN?: boolean;
  code?: string;
};

export type RefreshedSession = {
  accessToken: string;
  refreshToken: string;
};

const AUTH_STORAGE_KEYS = {
  accessToken: "token",
  refreshToken: "refreshToken",
} as const;

const ACCESS_TOKEN_SOFT_REFRESH_LEEWAY_MS = 5 * 60_000;
const ACCESS_TOKEN_HARD_REFRESH_LEEWAY_MS = 15_000;
const BACKGROUND_REFRESH_RETRY_COOLDOWN_MS = 30_000;

// GLOBAL LOGOUT HANDLER
let onAuthLogout: ((reason?: LogoutReason) => Promise<void>) | null = null;

export const setOnAuthLogout = (
  cb: ((reason?: LogoutReason) => Promise<void>) | null,
) => {
  onAuthLogout = cb;
};

// AXIOS
export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json;charset=UTF-8" },
});

const refreshApi = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json;charset=UTF-8" },
});

// IN-MEMORY TOKEN CACHE
let cachedToken: string | null = null;
let cachedRefresh: string | null = null;
let tokenLoaded = false;
let refreshLoaded = false;

const syncAccessToken = (token: string | null) => {
  cachedToken = token;
  tokenLoaded = true;
};

const syncRefreshToken = (refreshToken: string | null) => {
  cachedRefresh = refreshToken;
  refreshLoaded = true;
};

export const setTokenInApi = (token: string | null) => {
  syncAccessToken(token);
};

export const setRefreshInApi = (refresh: string | null) => {
  syncRefreshToken(refresh);
};

const getToken = async () => {
  if (tokenLoaded) return cachedToken;
  cachedToken = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.accessToken);
  tokenLoaded = true;
  return cachedToken;
};

const getRefreshToken = async () => {
  if (refreshLoaded) return cachedRefresh;
  cachedRefresh = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);
  refreshLoaded = true;
  return cachedRefresh;
};

export const clearTokenStorage = async () => {
  log("[API] Clearing cached tokens");
  syncAccessToken(null);
  syncRefreshToken(null);
  await AsyncStorage.multiRemove([
    AUTH_STORAGE_KEYS.accessToken,
    AUTH_STORAGE_KEYS.refreshToken,
  ]);
};

export const resetRefreshState = () => {
  refreshPromise = null;
};

export const resetAuthState = () => {
  syncAccessToken(null);
  syncRefreshToken(null);
  resetRefreshState();
  logoutPromise = null;
};

export const hardResetApi = () => {
  log("[API] Hard reset API state");
  syncAccessToken(null);
  syncRefreshToken(null);
  resetRefreshState();
  logoutPromise = null;
};

const createNeedLoginError = (): Error & { NEED_LOGIN: true } => {
  const e = new Error("NEED_LOGIN");
  (e as Error & { NEED_LOGIN: true }).NEED_LOGIN = true;
  return e as Error & { NEED_LOGIN: true };
};

const isNeedLoginError = (
  error: unknown,
): error is Error & { NEED_LOGIN: true } =>
  Boolean((error as { NEED_LOGIN?: boolean } | undefined)?.NEED_LOGIN);

const isAuthFailureStatus = (status?: number) =>
  status === 401 || status === 403;

export const isAuthExpiredError = (error: unknown) => {
  if (isNeedLoginError(error)) return true;

  const status = (error as { response?: { status?: number } } | undefined)
    ?.response?.status;

  return isAuthFailureStatus(status);
};

const isTimeoutError = (error: unknown) =>
  (error as { message?: string; code?: string } | undefined)?.message ===
    "TIMEOUT" ||
  (error as { message?: string; code?: string } | undefined)?.code ===
    "ECONNABORTED";

const decodeJwtPayload = (token: string): { exp?: number } | null => {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const normalizedPayload = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");

    const decodedPayload = Buffer.from(normalizedPayload, "base64").toString(
      "utf8",
    );

    return JSON.parse(decodedPayload) as { exp?: number };
  } catch {
    return null;
  }
};

export const getAccessTokenExpiry = (token: string): number | null => {
  const exp = decodeJwtPayload(token)?.exp;
  if (typeof exp !== "number") return null;
  return exp * 1000;
};

export const shouldRefreshAccessToken = (
  token: string,
  leewayMs = ACCESS_TOKEN_SOFT_REFRESH_LEEWAY_MS,
) => {
  const expiry = getAccessTokenExpiry(token);
  if (!expiry) return false;
  return expiry - Date.now() <= leewayMs;
};

const shouldBlockRequestForTokenRefresh = (token: string) =>
  shouldRefreshAccessToken(token, ACCESS_TOKEN_HARD_REFRESH_LEEWAY_MS);

const withAuthHeader = (
  headers: InternalAxiosRequestConfig["headers"] | undefined,
  token: string,
) => {
  const nextHeaders = AxiosHeaders.from(headers ?? {});
  nextHeaders.set("Authorization", `Bearer ${token}`);
  return nextHeaders;
};

const logRequest = (method: ApiMethod, url: string, hasBody: boolean) => {
  log("[API] Request", { method, url, hasBody });
};

const logResponse = (method: ApiMethod, url: string, status: number) => {
  log("[API] Response", { method, url, status });
};

const logError = (
  method: ApiMethod,
  url: string,
  error: unknown,
  hasBody: boolean,
) => {
  if (!axios.isAxiosError(error)) {
    warn("[API] Unknown error", { method, url, hasBody, error });
    return;
  }

  const responseMessage =
    typeof error.response?.data === "object" && error.response?.data !== null
      ? (error.response.data as { message?: string }).message
      : undefined;

  warn("[API] Error", {
    method,
    url,
    hasBody,
    status: error.response?.status,
    code: error.code,
    message: responseMessage ?? error.message,
  });
};

const triggerLogoutOnce = async (reason: LogoutReason = "EXPIRED") => {
  if (!onAuthLogout) return;
  if (!logoutPromise) {
    logoutPromise = (async () => {
      await onAuthLogout?.(reason);
    })().finally(() => {
      logoutPromise = null;
    });
  }

  await logoutPromise;
};

// REFRESH FLOW
let refreshPromise: Promise<RefreshedSession> | null = null;
let logoutPromise: Promise<void> | null = null;
let lastBackgroundRefreshAttemptAt = 0;

export const refreshTokenFlow = async (): Promise<RefreshedSession> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) throw createNeedLoginError();

      const res = await withTimeout(
        refreshApi.post(API_ENDPOINTS.REFRESH_TOKEN, {
          value: refreshToken,
          isMobile: true,
        }),
        8000,
      );

      const data = res?.data?.data;
      if (!data?.accessToken) throw createNeedLoginError();

      const nextRefreshToken = data.refreshToken ?? refreshToken;
      syncAccessToken(data.accessToken);
      syncRefreshToken(nextRefreshToken);

      AsyncStorage.multiSet([
        [AUTH_STORAGE_KEYS.accessToken, data.accessToken],
        [AUTH_STORAGE_KEYS.refreshToken, nextRefreshToken],
      ]).catch((storageErr) => {
        warn("[API] Persist refreshed token failed", storageErr);
      });

      log("[API] Refresh token success");
      return {
        accessToken: data.accessToken,
        refreshToken: nextRefreshToken,
      };
    } catch (err: any) {
      if (isNeedLoginError(err) || isAuthFailureStatus(err?.response?.status)) {
        await clearTokenStorage();
        throw createNeedLoginError();
      }

      if (!err?.response || isTimeoutError(err)) {
        warn("[API] Refresh failed due to network", {
          code: err?.code,
          message: err?.message,
        });
      }

      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

export const refreshAccessTokenInBackground = async (source = "background") => {
  const now = Date.now();
  if (
    !refreshPromise &&
    now - lastBackgroundRefreshAttemptAt < BACKGROUND_REFRESH_RETRY_COOLDOWN_MS
  ) {
    return;
  }

  lastBackgroundRefreshAttemptAt = now;

  try {
    const token = await getToken();
    if (!token || !shouldRefreshAccessToken(token)) return;

    log("[API] Soft refresh access token", { source });
    await refreshTokenFlow();
  } catch (err: any) {
    if (isNeedLoginError(err)) {
      warn("[API] Background refresh expired → logout");
      await triggerLogoutOnce("EXPIRED");
      return;
    }

    warn("[API] Background refresh failed", {
      source,
      code: err?.code,
      message: err?.message,
    });
  }
};

const ensureValidAccessToken = async () => {
  const token = await getToken();
  if (!token) return null;
  if (!shouldRefreshAccessToken(token)) return token;

  if (shouldBlockRequestForTokenRefresh(token)) {
    warn("[API] Access token expired/critical → refresh before request");
    const refreshedSession = await refreshTokenFlow();
    return refreshedSession.accessToken;
  }

  refreshAccessTokenInBackground("request");
  return token;
};

// REQUEST
api.interceptors.request.use(async (config) => {
  const token = await ensureValidAccessToken();

  if (token) {
    config.headers = withAuthHeader(config.headers, token);
  }

  return config;
});

// RESPONSE
api.interceptors.response.use(
  (res) => res,
  async (err: ApiError) => {
    const originalRequest = err.config as
      | AuthenticatedRequestConfig
      | undefined;

    if (isNeedLoginError(err)) {
      warn("[API] NEED_LOGIN → logout");
      await triggerLogoutOnce("EXPIRED");
      return Promise.reject(err);
    }

    if (!err.response || !originalRequest) {
      return Promise.reject(err);
    }

    if (err.response.status !== 401 || originalRequest._retry) {
      return Promise.reject(err);
    }

    originalRequest._retry = true;
    warn("[API] 401 → try refresh");

    try {
      const { accessToken } = await refreshTokenFlow();

      return api({
        ...originalRequest,
        headers: withAuthHeader(originalRequest.headers, accessToken),
      });
    } catch (refreshErr: any) {
      if (isNeedLoginError(refreshErr)) {
        warn("[API] Refresh expired → logout");
        await triggerLogoutOnce("EXPIRED");
      }

      return Promise.reject(refreshErr);
    }
  },
);

// Generic API wrapper
export const callApi = async <T,>(
  method: ApiMethod,
  url: string,
  data?: any,
  configOverride?: AxiosRequestConfig,
): Promise<T> => {
  const hasBody = data !== undefined && data !== null;
  logRequest(method, url, hasBody);

  try {
    const response = await api.request<T>({
      method,
      url,
      data,
      ...configOverride,
    });

    logResponse(method, url, response.status);

    return response.data;
  } catch (error) {
    logError(method, url, error, hasBody);
    throw error;
  }
};
