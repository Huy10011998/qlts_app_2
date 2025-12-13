import axios, { AxiosError, AxiosInstance } from "axios";
import { Buffer } from "buffer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_ENDPOINTS, BASE_URL } from "../../config/Index";
import { error, log, warn } from "../../utils/Logger";
import { jwtDecode } from "jwt-decode";
import { JwtPayload } from "../../types/Context.d";

// GLOBAL LOGOUT HANDLER
let onAuthLogout: (() => Promise<void>) | null = null;
export const setOnAuthLogout = (cb: (() => Promise<void>) | null) => {
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

// HELPERS
const safeDecode = (token: string): JwtPayload | null => {
  try {
    return jwtDecode<JwtPayload>(token);
  } catch (_) {
    return null;
  }
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

// REFRESH FLOW
let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string | null) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string | null) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const refreshTokenFlow = async (): Promise<string> => {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) throw { NEED_LOGIN: true };

    const res = await refreshApi.post(API_ENDPOINTS.REFRESH_TOKEN, {
      value: refreshToken,
    });

    const data = res?.data?.data;
    if (!data?.accessToken) throw { NEED_LOGIN: true };

    // Save access token
    await AsyncStorage.setItem("token", data.accessToken);
    cachedToken = data.accessToken;

    // Save refresh token (if provided)
    if (data.refreshToken) {
      await AsyncStorage.setItem("refreshToken", data.refreshToken);
      cachedRefresh = data.refreshToken;
    }

    log("[API] Token refreshed successfully");
    return data.accessToken;
  } catch (err: any) {
    await clearTokenStorage();
    throw Object.assign(new Error("NEED_LOGIN"), { NEED_LOGIN: true });
  }
};

// REQUEST
const REFRESH_BEFORE_MS = 60 * 1000; // 1 phút

api.interceptors.request.use(async (config) => {
  let token = await getToken();
  if (token) {
    const decoded = safeDecode(token);
    const expiresIn = decoded?.exp ? decoded.exp * 1000 - Date.now() : null;

    if (expiresIn !== null && expiresIn < REFRESH_BEFORE_MS) {
      log("[API] Token near expiry → refreshing...");

      if (isRefreshing) {
        token = await new Promise<string | null>((resolve) =>
          subscribeTokenRefresh(resolve)
        );
      } else {
        isRefreshing = true;
        try {
          token = await refreshTokenFlow();
          onRefreshed(token);
        } catch (e) {
          onRefreshed(null);
          throw e;
        } finally {
          isRefreshing = false;
        }
      }
    }

    (config.headers as any).Authorization = `Bearer ${token}`;
  }

  return config;
});

// RESPONSE
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError & { NEED_LOGIN?: boolean }) => {
    const originalRequest: any = err.config;

    // Nếu refresh trả NEED_LOGIN
    if (err.NEED_LOGIN) {
      warn("[API] Refresh failed → redirect to login");
      if (onAuthLogout) await onAuthLogout();
      return Promise.reject(err);
    }

    // Không phải lỗi 401 hoặc đã retry
    if (
      err.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      return Promise.reject(err);
    }

    originalRequest._retry = true;
    warn("[API] 401 → retry with refresh");

    // Nếu offline hoặc lỗi mạng → không logout
    if (!err.response && err.message === "Network Error") {
      error("[API] Network error → do not logout");
      return Promise.reject(err);
    }

    // Nếu đang refresh: đợi
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          if (newToken) {
            resolve(
              api({
                ...originalRequest,
                headers: {
                  ...originalRequest.headers,
                  Authorization: `Bearer ${newToken}`,
                },
              })
            );
          } else {
            reject(
              Object.assign(new Error("NEED_LOGIN"), { NEED_LOGIN: true })
            );
          }
        });
      });
    }

    // Tự refresh
    isRefreshing = true;
    try {
      const token = await refreshTokenFlow();
      onRefreshed(token);

      return api({
        ...originalRequest,
        headers: {
          ...originalRequest.headers,
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (refreshErr) {
      onRefreshed(null);
      return Promise.reject({ NEED_LOGIN: true });
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

export const getDetails = async <T = any,>(nameClass: string, id: number) =>
  callApi<T>("POST", `/${nameClass}/get-details`, { id });

export const getDetailsHistory = async <T = any,>(
  nameClass: string,
  id: number
) =>
  callApi<T>("POST", `/${nameClass}/get-list-history-detail`, { log_ID: id });

export const getClassReference = async <T = any,>(nameClass: string) =>
  callApi<T>("POST", API_ENDPOINTS.GET_CLASS_REFERENCE, {
    referenceName: nameClass,
  });

export const getListHistory = async <T = any,>(id: number, nameClass: string) =>
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
