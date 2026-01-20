import axios, { AxiosError, AxiosInstance } from "axios";
import { Buffer } from "buffer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_ENDPOINTS, BASE_URL } from "../../config/Index";
import { log, warn } from "../../utils/Logger";
import { LogoutReason } from "../../types/Context.d";

// GLOBAL LOGOUT HANDLER
let onAuthLogout: ((reason?: LogoutReason) => Promise<void>) | null = null;

export const setOnAuthLogout = (
  cb: ((reason?: LogoutReason) => Promise<void>) | null
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

// IN-MEMORY CACHE
let cachedToken: string | null = null;
let cachedRefresh: string | null = null;

export const setTokenInApi = (token: string | null) => {
  cachedToken = token;
};

export const setRefreshInApi = (refresh: string | null) => {
  cachedRefresh = refresh;
};

const getToken = async () => {
  if (cachedToken) return cachedToken;
  cachedToken = await AsyncStorage.getItem("token");
  return cachedToken;
};

const getRefreshToken = async () => {
  if (cachedRefresh) return cachedRefresh;
  cachedRefresh = await AsyncStorage.getItem("refreshToken");
  return cachedRefresh;
};

export const clearTokenStorage = async () => {
  log("[API] Clearing cached tokens");
  cachedToken = null;
  cachedRefresh = null;
  await AsyncStorage.multiRemove(["token", "refreshToken"]);
};

export const resetAuthState = () => {
  cachedToken = null;
  cachedRefresh = null;
  isRefreshing = false;
  refreshSubscribers = [];
  refreshPromise = null;
};

export const hardResetApi = () => {
  log("[API] Hard reset API state");
  cachedToken = null;
  cachedRefresh = null;
  isRefreshing = false;
  refreshSubscribers = [];
  refreshPromise = null;
};

const throwNeedLogin = (): never => {
  const e = new Error("NEED_LOGIN");
  (e as any).NEED_LOGIN = true;
  throw e;
};

// REFRESH FLOW
let isRefreshing = false;
let isLoggingOut = false;
let refreshPromise: Promise<string> | null = null;
let refreshSubscribers: ((token: string | null) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string | null) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string | null) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

export const refreshTokenFlow = async (): Promise<string> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) throwNeedLogin();

      const res = await refreshApi.post(API_ENDPOINTS.REFRESH_TOKEN, {
        value: refreshToken,
      });

      const data = res?.data?.data;
      if (!data?.accessToken) throwNeedLogin();

      await AsyncStorage.setItem("token", data.accessToken);
      setTokenInApi(data.accessToken);

      if (data.refreshToken) {
        await AsyncStorage.setItem("refreshToken", data.refreshToken);
        cachedRefresh = data.refreshToken;
      }

      log("[API] Refresh token success");
      return data.accessToken;
    } catch (err: any) {
      // NETWORK ERROR → KHÔNG logout
      if (!err.response) {
        warn("[API] Refresh failed due to network");
        throw err;
      }

      const status = err.response.status;
      if (status === 401 || status === 403 || err?.NEED_LOGIN) {
        await clearTokenStorage();
        throwNeedLogin();
      }

      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// REQUEST
api.interceptors.request.use(async (config) => {
  const token = await getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// RESPONSE
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError & { NEED_LOGIN?: boolean; OFFLINE?: boolean }) => {
    const originalRequest: any = err.config;

    /** ===== NETWORK ERROR ===== */
    if (!err.response) {
      warn("[API] Network error → reject fast");
      return Promise.reject(Object.assign(err, { OFFLINE: true }));
    }

    /** ===== REFRESH FAILED HARD ===== */
    if (err.NEED_LOGIN) {
      warn("[API] NEED_LOGIN → logout");

      if (!isLoggingOut) {
        isLoggingOut = true;
        await onAuthLogout?.("EXPIRED");
      }

      return Promise.reject(err);
    }

    /** ===== NOT 401 OR ALREADY RETRIED ===== */
    if (
      err.response.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      return Promise.reject(err);
    }

    originalRequest._retry = true;
    warn("[API] 401 → try refresh");

    /** ===== WAIT FOR REFRESH ===== */
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          if (!newToken) {
            reject(
              Object.assign(new Error("NEED_LOGIN"), { NEED_LOGIN: true })
            );
            return;
          }

          resolve(
            api({
              ...originalRequest,
              headers: {
                ...originalRequest.headers,
                Authorization: `Bearer ${newToken}`,
              },
            })
          );
        });
      });
    }

    /** ===== DO REFRESH ===== */
    isRefreshing = true;

    try {
      const newToken = await refreshTokenFlow();
      onRefreshed(newToken);

      return api({
        ...originalRequest,
        headers: {
          ...originalRequest.headers,
          Authorization: `Bearer ${newToken}`,
        },
      });
    } catch (refreshErr: any) {
      onRefreshed(null);

      /** NETWORK ERROR → DON'T LOGOUT */
      if (!refreshErr?.response) {
        warn("[API] Refresh network error");
        return Promise.reject(Object.assign(refreshErr, { OFFLINE: true }));
      }

      /** REFRESH TOKEN INVALID → LOGOUT */
      warn("[API] Refresh invalid → logout");

      return Promise.reject(Object.assign(refreshErr, { NEED_LOGIN: true }));
    } finally {
      isRefreshing = false;
    }
  }
);

// Generic API wrapper
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

// API functions
export const getList = async <T = any,>(
  nameClass: string,
  orderby: string,
  pageSize: number,
  skipSize: number,
  searchText: string,
  conditions: any[],
  conditionsAll: any[]
) =>
  callApi<T>("POST", `/${nameClass}/get-list`, {
    orderby,
    pageSize,
    skipSize,
    searchText,
    conditions,
    conditionsAll,
  });

export const getBuildTree = async <T = any,>(nameClass: string) =>
  callApi<T>("POST", `/${nameClass}/build-tree`, {});

export const getDetails = async <T = any,>(nameClass: string, id: string) =>
  callApi<T>("POST", `/${nameClass}/get-details`, { id });

export const getDetailsHistory = async <T = any,>(
  nameClass: string,
  id: string
) =>
  callApi<T>("POST", `/${nameClass}/get-list-history-detail`, { log_ID: id });

export const getClassReference = async <T = any,>(nameClass: string) =>
  callApi<T>("POST", API_ENDPOINTS.GET_CLASS_REFERENCE, {
    referenceName: nameClass,
  });

export const getListHistory = async <T = any,>(id: string, nameClass: string) =>
  callApi<T>("POST", `/${nameClass}/get-list-history`, { id });

export const getListAttachFile = async (
  nameClass: string,
  orderby: string,
  pageSize: number,
  skipSize: number,
  searchText: string,
  conditions: any[],
  conditionsAll: any[]
) =>
  callApi<{ data: { items: Record<string, any>[]; totalCount: number } }>(
    "POST",
    `/${nameClass}/get-attach-file`,
    { orderby, pageSize, skipSize, searchText, conditions, conditionsAll }
  );

export const getPreviewAttachFile = async (
  name: string,
  path: string,
  nameClass: string
) => {
  const res = await api.post(
    `/${nameClass}/preview-attach-file`,
    { name, path, isMobile: true },
    { responseType: "arraybuffer", timeout: 10000 }
  );
  return {
    headers: res.headers,
    data: Buffer.from(res.data, "binary").toString("base64"),
  };
};

export const getPropertyClass = async <T = any,>(nameClass: string) =>
  callApi<T>("POST", API_ENDPOINTS.GET_CLASS_BY_NAME, { nameClass });

export const getFieldActive = async <T = any,>(iD_Class_MoTa: string) =>
  callApi<T>("POST", API_ENDPOINTS.GET_FIELD_ACTIVE, { iD_Class_MoTa });

export const getPreviewAttachProperty = async (path: string) => {
  const res = await api.post(API_ENDPOINTS.PREVIEW_ATTACH_PROPERTY, path, {
    responseType: "arraybuffer",
    timeout: 10000,
    headers: { "Content-Type": "application/json" },
  });
  return {
    headers: res.headers,
    data: Buffer.from(res.data, "binary").toString("base64"),
  };
};

export const getPreviewBC = async (
  param: Record<string, any>,
  path: string
) => {
  const res = await api.post(path, param, {
    responseType: "arraybuffer",
    timeout: 10000,
  });
  return {
    headers: res.headers,
    data: Buffer.from(res.data, "binary").toString("base64"),
  };
};

export const insert = async <T = any,>(nameClass: string, payload: any) =>
  callApi<T>("POST", `/${nameClass}/insert`, payload);

export const update = async <T = any,>(nameClass: string, payload: any) =>
  callApi<T>("POST", `/${nameClass}/update`, payload);

export const deleteItems = async <T = any,>(
  nameClass: string,
  body: { iDs: number[]; saveHistory: boolean }
) => callApi<T>("POST", `/${nameClass}/delete`, body);

export const checkReferenceUsage = async <T = any,>(
  nameClass: string,
  iDs: number[]
) => callApi<T>("POST", `/${nameClass}/check-reference-usage`, { iDs });

export const uploadAttachProperty = async ({ file }: { file: any }) => {
  const form = new FormData();
  form.append("File", {
    uri: file.uri,
    name: file.fileName || file.name,
    type: file.type,
  });
  const res = await callApi<{ data: string }>(
    "POST",
    `/Common/attach-property`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data;
};

export const getPermission = async <T = any,>() =>
  callApi<T>("POST", API_ENDPOINTS.GET_PERMISSION);

export const tuDongTang = async <T = any,>(nameClass: string, payload: {}) =>
  callApi<T>("POST", `/${nameClass}/tu-dong-tang`, payload);

export const getParentValue = async <T = any,>(
  nameClass: string,
  payload: {}
) => callApi<T>("POST", `/${nameClass}/parent-value`, payload);
