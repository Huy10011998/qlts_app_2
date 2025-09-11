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

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [token, setTokenState] = useState<string | null>(null);

  const setToken = async (value: string | null) => {
    if (value) {
      await AsyncStorage.setItem("token", value);
      console.log("[AuthProvider] setToken: Lưu accessToken");
    } else {
      await AsyncStorage.removeItem("token");
      console.log("[AuthProvider] setToken: Xoá accessToken");
    }
    setTokenState(value);
  };

  const setRefreshToken = async (refreshToken: string | null) => {
    if (refreshToken) {
      await AsyncStorage.setItem("refreshToken", refreshToken);
      console.log("[AuthProvider] setRefreshToken: Lưu refreshToken");
    } else {
      await AsyncStorage.removeItem("refreshToken");
      console.log("[AuthProvider] setRefreshToken: Xoá refreshToken");
    }
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(["token", "refreshToken"]);
    setTokenState(null);
    console.log("[AuthProvider] logout: Đã xoá token + refreshToken");
  };

  useEffect(() => {
    (async () => {
      console.log("[AuthProvider] App start → kiểm tra token hợp lệ");
      const validToken = await getValidToken();
      if (validToken) {
        console.log("[AuthProvider] Token hợp lệ → setTokenState");
        setTokenState(validToken);
      } else {
        console.warn("[AuthProvider] Không tìm thấy token hợp lệ");
      }
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

// TOKEN UTILS
export const isTokenExpired = (token: string | null | undefined): boolean => {
  if (!token) return true;
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    const expired = Date.now() >= decoded.exp * 1000 - 30000;
    console.log(
      "[isTokenExpired] Token exp =",
      decoded.exp,
      "expired =",
      expired
    );
    return expired;
  } catch (err) {
    console.error("[isTokenExpired] Decode failed:", err);
    return true;
  }
};

export const getValidToken = async (): Promise<string | null> => {
  const [accessToken, refreshToken] = await Promise.all([
    AsyncStorage.getItem("token"),
    AsyncStorage.getItem("refreshToken"),
  ]);

  console.log("[getValidToken] AccessToken:", accessToken);
  console.log("[getValidToken] RefreshToken:", refreshToken);

  if (!accessToken || !refreshToken) {
    console.warn("[getValidToken] Không có token => return null");
    return null;
  }

  if (!isTokenExpired(accessToken)) {
    console.log("[getValidToken] AccessToken còn hạn → dùng luôn");
    return accessToken;
  }

  console.log("[getValidToken] AccessToken hết hạn → gọi refresh...");
  return await refreshTokenPair(refreshToken);
};

// REFRESH TOKEN
const refreshTokenPair = async (
  refreshToken: string
): Promise<string | null> => {
  console.log(
    "[refreshTokenPair] Gọi API refresh với refreshToken:",
    refreshToken
  );

  try {
    const response = await axios.post(API_ENDPOINTS.REFRESH_TOKEN, {
      value: refreshToken,
    });

    console.log("[refreshTokenPair] Response:", response.data);

    const data = response?.data?.data;
    if (!data?.accessToken) {
      console.warn("[refreshTokenPair] Không có accessToken trong response");
      return null;
    }

    await AsyncStorage.setItem("token", data.accessToken);
    console.log("[refreshTokenPair] Access token mới đã được lưu");

    if (data.refreshToken) {
      await AsyncStorage.setItem("refreshToken", data.refreshToken);
      console.log("[refreshTokenPair] Refresh token mới đã được lưu");
    }

    return data.accessToken;
  } catch (error: any) {
    console.error(
      "[refreshTokenPair] failed:",
      error?.response?.data || error.message
    );
    await AsyncStorage.multiRemove(["token", "refreshToken"]);
    return null;
  }
};

// AXIOS CONFIG
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json;charset=UTF-8" },
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const notifySubscribers = (newToken: string) => {
  console.log("[notifySubscribers] Gửi token mới cho subscribers");
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
};

api.interceptors.request.use(async (config) => {
  const accessToken = await getValidToken();
  console.log("[axios.request] Dùng token:", accessToken);

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      console.warn("[axios.response] 401 phát hiện, thử refresh token...");

      originalRequest._retry = true;

      if (isRefreshing) {
        console.log("[axios.response] Đang refresh, chờ token mới...");
        return new Promise((resolve) => {
          refreshSubscribers.push((newToken) => {
            console.log(
              "[axios.response] Nhận token mới từ subscriber:",
              newToken
            );
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const newToken = await getValidToken();
        isRefreshing = false;

        if (!newToken) {
          console.error(
            "[axios.response] Refresh thất bại, không có token mới"
          );
          throw new Error("Cannot refresh token");
        }

        console.log(
          "[axios.response] Refresh thành công, token mới:",
          newToken
        );
        notifySubscribers(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (err) {
        console.error("[axios.response] Refresh token error:", err);
        isRefreshing = false;
        refreshSubscribers = [];
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
