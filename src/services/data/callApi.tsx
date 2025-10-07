import axios, { AxiosError, AxiosInstance } from "axios";
import { Buffer } from "buffer";
import { API_ENDPOINTS, BASE_URL } from "../../config/Index";
import { getValidToken } from "../../context/AuthContext";

// Axios instance
export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json;charset=UTF-8" },
  timeout: 15000,
});

// Refresh Token Queue
let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string | null) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string | null) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

// Request interceptor
api.interceptors.request.use(async (config) => {
  const token = await getValidToken();
  if (token) {
    if (config.headers?.set) {
      config.headers.set("Authorization", `Bearer ${token}`);
    } else {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    console.log("[API] Request → attach token:", token.slice(0, 20) + "...");
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      console.warn("[API] 401 Unauthorized → try refresh");
      originalRequest._retry = true;

      if (isRefreshing) {
        // Nếu đang refresh → chờ token mới
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken) => {
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(api(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      isRefreshing = true;

      try {
        const newToken = await getValidToken();
        if (!newToken) throw new Error("Refresh token failed");

        onRefreshed(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (err) {
        console.error("[API] Refresh failed → logout required");
        onRefreshed(null);
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
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

// API Functions
// Get list of any class
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

// Build-tree
export const getBuildTree = async <T = any,>(nameClass: string): Promise<T> => {
  return callApi<T>("POST", `/${nameClass}/build-tree`, {});
};

// Details
export const getDetails = async <T = any,>(
  nameClass: string,
  id: number
): Promise<T> => {
  return callApi<T>("POST", `/${nameClass}/get-details`, { id });
};

// History details
export const getDetailsHistory = async <T = any,>(
  nameClass: string,
  id: number
): Promise<T> => {
  return callApi<T>("POST", `/${nameClass}/get-list-history-detail`, {
    log_ID: id,
  });
};

// Class reference
export const getClassReference = async <T = any,>(
  nameClass: string
): Promise<T> => {
  return callApi<T>("POST", API_ENDPOINTS.GET_CLASS_REFERENCE, {
    referenceName: nameClass,
  });
};

// List history
export const getListHistory = async <T = any,>(
  id: number,
  nameClass: string
): Promise<T> => {
  return callApi<T>("POST", `/${nameClass}/get-list-history`, { id });
};

// List attached files
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

// Preview attached file
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

// Class properties
export const getPropertyClass = async <T = any,>(
  nameClass: string
): Promise<T> => {
  return callApi<T>("POST", API_ENDPOINTS.GET_CLASS_BY_NAME, { nameClass });
};

// Active fields
export const getFieldActive = async <T = any,>(
  iD_Class_MoTa: string
): Promise<T> => {
  return callApi<T>("POST", API_ENDPOINTS.GET_FIELD_ACTIVE, { iD_Class_MoTa });
};

// Preview attach property
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

// Preview báo cáo
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
