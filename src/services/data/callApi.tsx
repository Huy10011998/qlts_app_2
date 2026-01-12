import axios, { AxiosError, AxiosInstance } from "axios";
import { Buffer } from "buffer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_ENDPOINTS, BASE_URL } from "../../config/Index";
import { error, log, warn } from "../../utils/Logger";

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
    } catch (refreshErr: any) {
      onRefreshed(null);

      // Network error → chờ auto reload
      if (!refreshErr?.response) {
        warn("[API] Refresh network error → wait for reconnect");
        return Promise.reject(refreshErr);
      }

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

export const getParentValue = async <T = any,>(
  nameClass: string,
  payload: {}
) => callApi<T>("POST", `/${nameClass}/parent-value`, payload);
