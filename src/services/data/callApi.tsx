import axios, { AxiosError, AxiosInstance } from "axios";
import { Buffer } from "buffer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_ENDPOINTS, BASE_URL } from "../../config/Index";
import { log, warn } from "../../utils/Logger";
import { isTokenExpired } from "../../context/AuthContext";
import { jwtDecode } from "jwt-decode";
import { JwtPayload } from "../../types/Context.d";

let onAuthLogout: (() => Promise<void>) | null = null;
export const setOnAuthLogout = (cb: (() => Promise<void>) | null) => {
  onAuthLogout = cb;
};

// Axios instances
export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json;charset=UTF-8" },
  timeout: 15000,
});

const refreshApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json;charset=UTF-8" },
  timeout: 15000,
});

// Refresh token queue
let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];
const subscribeTokenRefresh = (cb: (token: string | null) => void) => {
  refreshSubscribers.push(cb);
};
const onRefreshed = (token: string | null) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

// In-memory token cache
let cachedToken: string | null = null;

// Helper: lấy token hợp lệ (cache + storage)
const getToken = async () => {
  if (cachedToken && !isTokenExpired(cachedToken)) return cachedToken;
  const token = await AsyncStorage.getItem("token");
  cachedToken = token;
  return token;
};

// Refresh token function
const refreshTokenFlow = async (): Promise<string> => {
  try {
    const refreshToken = await AsyncStorage.getItem("refreshToken");
    if (!refreshToken) throw new Error("Missing refresh token");

    const res = await refreshApi.post(API_ENDPOINTS.REFRESH_TOKEN, {
      value: refreshToken,
    });
    const data = res?.data?.data;
    if (!data?.accessToken) throw new Error("No accessToken in refresh");

    await AsyncStorage.setItem("token", data.accessToken);
    if (data.refreshToken)
      await AsyncStorage.setItem("refreshToken", data.refreshToken);

    cachedToken = data.accessToken; // update cache
    log("[API] Token refreshed successfully");
    return data.accessToken;
  } catch (err) {
    cachedToken = null;
    await AsyncStorage.multiRemove(["token", "refreshToken"]);
    if (onAuthLogout) await onAuthLogout();
    throw err;
  }
};

// Request interceptor: attach token + auto refresh
const REFRESH_BEFORE_MS = 60 * 1000; // 1 phút trước khi hết hạn
api.interceptors.request.use(async (config) => {
  let token = await getToken();

  if (token) {
    // Kiểm tra thời điểm token hết hạn
    const decoded = jwtDecode<JwtPayload>(token);
    const expiresIn = decoded.exp * 1000 - Date.now();

    if (expiresIn < REFRESH_BEFORE_MS) {
      log("[API] Token near expiry → refresh before request");

      if (isRefreshing) {
        token = await new Promise<string | null>((resolve) =>
          subscribeTokenRefresh(resolve)
        );
        if (!token) throw new Error("Token refresh failed");
      } else {
        isRefreshing = true;
        try {
          token = await refreshTokenFlow();
          onRefreshed(token);
        } catch (err) {
          onRefreshed(null);
          throw err;
        } finally {
          isRefreshing = false;
        }
      }
    }

    (config.headers as any).Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor fallback 401
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const originalRequest: any = err.config;
    if (
      err.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    )
      return Promise.reject(err);

    originalRequest._retry = true;
    warn("[API] 401 Unauthorized → retry with refresh flow");

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          } else reject(err);
        });
      });
    }

    isRefreshing = true;
    try {
      const token = await refreshTokenFlow();
      onRefreshed(token);
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return api(originalRequest);
    } catch (refreshErr) {
      onRefreshed(null);
      return Promise.reject(refreshErr);
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
