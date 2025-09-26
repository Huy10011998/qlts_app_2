// src/services/apiClient.ts
import axios, { AxiosError, AxiosInstance } from "axios";
import { Buffer } from "buffer";
import { API_ENDPOINTS, BASE_URL } from "../../config";
import { getValidToken } from "../../context/AuthContext";

// =================== Axios instance ===================
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json;charset=UTF-8" },
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const notifySubscribers = (newToken: string) => {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
};

// Request interceptor: tự thêm token
api.interceptors.request.use(async (config) => {
  const token = await getValidToken();
  if (token) {
    console.log("[API] Attaching token:", token.slice(0, 20) + "...");
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      console.warn("[API] 401 detected → retrying with refresh token...");
      originalRequest._retry = true;

      if (isRefreshing) {
        console.log("[API] Refresh in progress → queue request");
        return new Promise((resolve) => {
          refreshSubscribers.push((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const newToken = await getValidToken();
        if (!newToken) throw new Error("Cannot refresh token");

        console.log("[API] Got new token:", newToken);
        notifySubscribers(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (err) {
        console.error("[API] Refresh failed → force logout");
        refreshSubscribers = [];
        throw err;
      } finally {
        isRefreshing = false;
      }
    }

    throw error;
  }
);

// =================== Generic API Wrapper ===================
export const callApi = async <T,>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  data?: any,
  configOverride?: any
): Promise<T> => {
  const config = { method, url, data, ...configOverride };
  const response = await api.request<T>(config);
  return response.data;
};

// =================== API Functions ===================

// Get list of any class
export const getList = async <T = any,>(
  nameClass: string,
  orderby: string,
  pageSize: number,
  skipSize: number,
  searchText: string,
  fields: any[],
  conditions: any[],
  conditionsAll: any[]
): Promise<T> => {
  return callApi<T>("POST", `/${nameClass}/get-list`, {
    orderby,
    pageSize,
    skipSize,
    searchText,
    fields,
    conditions,
    conditionsAll,
  });
};

// Get build-tree of any class
export const getBuildTree = async <T = any,>(nameClass: string): Promise<T> => {
  return callApi<T>("POST", `/${nameClass}/build-tree`, {});
};

// Get details of an item
export const getDetails = async <T = any,>(
  nameClass: string,
  id: number
): Promise<T> => {
  return callApi<T>("POST", `/${nameClass}/get-details`, { id });
};

// Get history details
export const getDetailsHistory = async <T = any,>(
  nameClass: string,
  id: number
): Promise<T> => {
  return callApi<T>("POST", `/${nameClass}/get-list-history-detail`, {
    log_ID: id,
  });
};

// Get class reference
export const getClassReference = async <T = any,>(
  nameClass: string
): Promise<T> => {
  return callApi<T>("POST", API_ENDPOINTS.GET_CLASS_REFERENCE, {
    referenceName: nameClass,
  });
};

// Get list history
export const getListHistory = async <T = any,>(
  id: number,
  nameClass: string
): Promise<T> => {
  return callApi<T>("POST", `/${nameClass}/get-list-history`, { id });
};

// Get list of attached files
export const getListAttachFile = async (
  nameClass: string,
  orderby: string,
  pageSize: number,
  skipSize: number,
  searchText: string,
  conditions: any[],
  conditionsAll: any[]
): Promise<{ data: { items: Record<string, any>[]; totalCount: number } }> => {
  return callApi<{
    data: { items: Record<string, any>[]; totalCount: number };
  }>("POST", `/${nameClass}/get-attach-file`, {
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

// Get class properties
export const getPropertyClass = async <T = any,>(
  nameClass: string
): Promise<T> => {
  return callApi<T>("POST", API_ENDPOINTS.GET_CLASS_BY_NAME, { nameClass });
};

// Get active fields
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
    headers: {
      "Content-Type": "application/json",
    },
  });

  const base64Data = Buffer.from(response.data, "binary").toString("base64");
  return { headers: response.headers, data: base64Data };
};
