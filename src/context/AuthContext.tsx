// src/context/AuthContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosError, AxiosInstance } from "axios";
import { jwtDecode } from "jwt-decode";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { AuthContextType, JwtPayload } from "../types";
import { API_ENDPOINTS, BASE_URL } from "../config";

// ================= CONTEXT =================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [token, setTokenState] = useState<string | null>(null);

  const setToken = async (value: string | null) => {
    if (value) {
      console.log("[Auth] Set new access token:", value.slice(0, 20) + "...");
      await AsyncStorage.setItem("token", value);
    } else {
      console.log("[Auth] Clear access token");
      await AsyncStorage.removeItem("token");
    }
    setTokenState(value);
  };

  const setRefreshToken = async (refreshToken: string | null) => {
    if (refreshToken) {
      console.log(
        "[Auth] Set new refresh token:",
        refreshToken.slice(0, 20) + "..."
      );
      await AsyncStorage.setItem("refreshToken", refreshToken);
    } else {
      console.log("[Auth] Clear refresh token");
      await AsyncStorage.removeItem("refreshToken");
    }
  };

  const logout = async () => {
    console.log("[Auth] Logout → clear all tokens");
    await AsyncStorage.multiRemove(["token", "refreshToken"]);
    setTokenState(null);
  };

  useEffect(() => {
    (async () => {
      const validToken = await getValidToken();
      if (validToken) setTokenState(validToken);
    })();
  }, []);

  return (
    <AuthContext.Provider value={{ token, setToken, setRefreshToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải được sử dụng trong AuthProvider");
  return context;
};

// ================= TOKEN UTILS =================
export const isTokenExpired = (token: string | null | undefined): boolean => {
  if (!token) return true;
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    const expired = Date.now() >= decoded.exp * 1000 - 30000; // trừ 30s dự phòng
    if (expired) console.log("[Auth] Token expired");
    return expired;
  } catch (err) {
    console.warn("[Auth] Token decode failed:", err);
    return true;
  }
};

// ================= TOKEN FLOW =================
export const getValidToken = async (): Promise<string | null> => {
  const accessToken = await AsyncStorage.getItem("token");
  const refreshToken = await AsyncStorage.getItem("refreshToken");

  if (!refreshToken) {
    console.log("[Auth] No refresh token → force logout");
    await AsyncStorage.multiRemove(["token", "refreshToken"]);
    return null;
  }

  if (accessToken && !isTokenExpired(accessToken)) {
    return accessToken;
  }

  console.log("[Auth] Access token expired → refreshing...");
  return await refreshTokenPair(refreshToken);
};

const refreshApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json;charset=UTF-8" },
});

const refreshTokenPair = async (
  refreshToken: string
): Promise<string | null> => {
  try {
    console.log(
      "[Auth] Call refresh API with refresh token:",
      refreshToken.slice(0, 20) + "..."
    );
    const response = await refreshApi.post(API_ENDPOINTS.REFRESH_TOKEN, {
      value: refreshToken,
    });

    const data = response?.data?.data;
    if (!data?.accessToken) {
      console.warn("[Auth] Refresh API success but no accessToken returned");
      return null;
    }

    console.log(
      "[Auth] Refresh success → new access token + maybe refresh token"
    );
    await AsyncStorage.setItem("token", data.accessToken);

    if (data.refreshToken) {
      await AsyncStorage.setItem("refreshToken", data.refreshToken);
    } else {
      await AsyncStorage.setItem("refreshToken", refreshToken); // giữ lại cái cũ
    }

    return data.accessToken;
  } catch (err) {
    console.error("[Auth] Refresh failed → clearing tokens", err);
    await AsyncStorage.multiRemove(["token", "refreshToken"]);
    return null;
  }
};

// ================= AXIOS INSTANCE =================
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

// Request interceptor
api.interceptors.request.use(async (config) => {
  const accessToken = await getValidToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
    console.log("[API] Attach token:", accessToken.slice(0, 20) + "...");
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        console.log("[API] Token refresh in progress → queue request");
        return new Promise((resolve) => {
          refreshSubscribers.push((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        console.log("[API] Start token refresh");
        const newToken = await getValidToken();
        isRefreshing = false;

        if (!newToken) throw new Error("Cannot refresh token");

        notifySubscribers(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        console.log("[API] Retry request after refresh");
        return api(originalRequest);
      } catch (err) {
        isRefreshing = false;
        refreshSubscribers = [];
        console.error("[API] Refresh + retry failed:", err);
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
