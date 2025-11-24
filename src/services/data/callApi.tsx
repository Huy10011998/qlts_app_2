import axios, { AxiosError, AxiosInstance } from "axios";
import { Buffer } from "buffer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_ENDPOINTS, BASE_URL } from "../../config/Index";
import { error, log, warn } from "../../utils/Logger";

// --- Exposed helper for AuthContext to register logout handler ---
let onAuthLogout: (() => Promise<void>) | null = null;
export const setOnAuthLogout = (cb: (() => Promise<void>) | null) => {
  onAuthLogout = cb;
};

// Axios instance
export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json;charset=UTF-8" },
  timeout: 15000,
});

// A separate axios instance used only for refresh calls to avoid interceptor loops
const refreshApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json;charset=UTF-8" },
  timeout: 15000,
});

// Refresh Token Queue (for concurrent 401 handling)
let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string | null) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string | null) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

// Request interceptor — chỉ attach token (KHÔNG gọi refresh)
api.interceptors.request.use(
  async (config) => {
    try {
      const accessToken = await AsyncStorage.getItem("token");
      if (accessToken) {
        if (config.headers?.set) {
          config.headers.set("Authorization", `Bearer ${accessToken}`);
        } else {
          (config.headers as any).Authorization = `Bearer ${accessToken}`;
        }
        log("[API] Request → attach token:", accessToken.slice(0, 20) + "...");
      }
    } catch (err) {
      warn("[API] Request interceptor failed to read token");
    }
    return config;
  },
  (err) => Promise.reject(err)
);

// Response interceptor with refresh flow
api.interceptors.response.use(
  (response) => response,
  async (err: AxiosError) => {
    const originalRequest: any = err.config;

    // If not a 401 or no originalRequest, just reject
    if (err.response?.status !== 401 || !originalRequest) {
      return Promise.reject(err);
    }

    // Prevent infinite loop: only retry once
    if (originalRequest._retry) {
      return Promise.reject(err);
    }
    originalRequest._retry = true;

    warn("[API] 401 Unauthorized → attempt refresh flow");

    if (isRefreshing) {
      // Already refreshing: queue and wait for token
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          } else {
            reject(err);
          }
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshToken = await AsyncStorage.getItem("refreshToken");
      if (!refreshToken) {
        warn("[API] Missing refresh token during refresh flow");
        // cleanup and force logout if available
        try {
          await AsyncStorage.multiRemove(["token", "refreshToken"]);
        } catch (e) {
          // ignore
        }
        if (onAuthLogout) await onAuthLogout();
        onRefreshed(null);
        return Promise.reject(err);
      }

      log("[API] Call refresh endpoint");
      const res = await refreshApi.post(API_ENDPOINTS.REFRESH_TOKEN, {
        value: refreshToken,
      });

      const data = res?.data?.data;

      // helpful debug logging if server returned unexpected shape
      if (!data) {
        error("[API] Refresh response missing data object", res?.data);
      }

      if (!data?.accessToken) {
        warn("[API] Refresh successful but missing accessToken in response");
        // clear tokens + logout
        try {
          await AsyncStorage.multiRemove(["token", "refreshToken"]);
        } catch (e) {
          // ignore
        }
        if (onAuthLogout) await onAuthLogout();
        onRefreshed(null);
        return Promise.reject(err);
      }

      // Save new tokens
      await AsyncStorage.setItem("token", data.accessToken);
      if (data.refreshToken) {
        await AsyncStorage.setItem("refreshToken", data.refreshToken);
      }

      log("[API] Refresh success, retrying queued requests");
      onRefreshed(data.accessToken);

      // Retry original request with new token
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    } catch (refreshErr) {
      error("[API] Refresh token error:", refreshErr);
      // Clear tokens and trigger logout
      try {
        await AsyncStorage.multiRemove(["token", "refreshToken"]);
      } catch (e) {
        // ignore
      }
      if (onAuthLogout) {
        try {
          await onAuthLogout();
        } catch (e) {
          // ignore
        }
      }
      onRefreshed(null);
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

// Generic API Wrapper
export const callApi = async <T,>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  data?: any,
  configOverride?: any
): Promise<T> => {
  const response = await api.request<T>({
    method,
    url,
    data,
    ...configOverride,
  });
  return response.data;
};

// API Functions (kept like original)
export const getList = async <T = any,>(
  nameClass: string,
  orderby: string,
  pageSize: number,
  skipSize: number,
  searchText: string,
  conditions: any[],
  conditionsAll: any[]
): Promise<T> => {
  return callApi<T>("POST", `/${nameClass}/get-list`, {
    orderby,
    pageSize,
    skipSize,
    searchText,
    conditions,
    conditionsAll,
  });
};

export const getBuildTree = async <T = any,>(nameClass: string): Promise<T> => {
  return callApi<T>("POST", `/${nameClass}/build-tree`, {});
};

export const getDetails = async <T = any,>(
  nameClass: string,
  id: number
): Promise<T> => {
  return callApi<T>("POST", `/${nameClass}/get-details`, { id });
};

export const getDetailsHistory = async <T = any,>(
  nameClass: string,
  id: number
): Promise<T> => {
  return callApi<T>("POST", `/${nameClass}/get-list-history-detail`, {
    log_ID: id,
  });
};

export const getClassReference = async <T = any,>(
  nameClass: string
): Promise<T> => {
  return callApi<T>("POST", API_ENDPOINTS.GET_CLASS_REFERENCE, {
    referenceName: nameClass,
  });
};

export const getListHistory = async <T = any,>(
  id: number,
  nameClass: string
): Promise<T> => {
  return callApi<T>("POST", `/${nameClass}/get-list-history`, { id });
};

export const getListAttachFile = async (
  nameClass: string,
  orderby: string,
  pageSize: number,
  skipSize: number,
  searchText: string,
  conditions: any[],
  conditionsAll: any[]
): Promise<{ data: { items: Record<string, any>[]; totalCount: number } }> => {
  return callApi("POST", `/${nameClass}/get-attach-file`, {
    orderby,
    pageSize,
    skipSize,
    searchText,
    conditions,
    conditionsAll,
  });
};

export const getPreviewAttachFile = async (
  name: string,
  path: string,
  nameClass: string
): Promise<{ headers: any; data: string }> => {
  const response = await api.post(
    `/${nameClass}/preview-attach-file`,
    { name, path, isMobile: true },
    { responseType: "arraybuffer", timeout: 10000 }
  );
  const base64Data = Buffer.from(response.data, "binary").toString("base64");
  return { headers: response.headers, data: base64Data };
};

export const getPropertyClass = async <T = any,>(
  nameClass: string
): Promise<T> => {
  return callApi<T>("POST", API_ENDPOINTS.GET_CLASS_BY_NAME, { nameClass });
};

export const getFieldActive = async <T = any,>(
  iD_Class_MoTa: string
): Promise<T> => {
  return callApi<T>("POST", API_ENDPOINTS.GET_FIELD_ACTIVE, { iD_Class_MoTa });
};

export const getPreviewAttachProperty = async (
  path: string
): Promise<{ headers: any; data: string }> => {
  const response = await api.post(API_ENDPOINTS.PREVIEW_ATTACH_PROPERTY, path, {
    responseType: "arraybuffer",
    timeout: 10000,
    headers: { "Content-Type": "application/json" },
  });
  const base64Data = Buffer.from(response.data, "binary").toString("base64");
  return { headers: response.headers, data: base64Data };
};

export const getPreviewBC = async (
  param: Record<string, any>,
  path: string
): Promise<{ headers: any; data: string }> => {
  const response = await api.post(path, param, {
    responseType: "arraybuffer",
    timeout: 10000,
  });
  const base64Data = Buffer.from(response.data, "binary").toString("base64");
  return { headers: response.headers, data: base64Data };
};

export const insert = async <T = any,>(
  nameClass: string,
  payload: any
): Promise<T> => {
  return callApi<T>("POST", `/${nameClass}/insert`, payload);
};

export const checkReferenceUsage = async <T = any,>(
  nameClass: string,
  iDs: number[]
): Promise<T> => {
  return callApi<T>("POST", `/${nameClass}/check-reference-usage`, { iDs });
};

export const deleteItems = async <T = any,>(
  nameClass: string,
  body: { iDs: number[]; saveHistory: boolean }
): Promise<T> => {
  return callApi<T>("POST", `/${nameClass}/delete`, body);
};
