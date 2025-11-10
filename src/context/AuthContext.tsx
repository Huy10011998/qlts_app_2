import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { AuthContextType, JwtPayload } from "../types/Index";
import { API_ENDPOINTS, BASE_URL } from "../config/Index";
import { error, log, warn } from "../utils/Logger";

// CONTEXT
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [token, setTokenState] = useState<string | null>(null);

  // Lưu hoặc clear access token
  const setToken = async (value: string | null) => {
    if (value) {
      log("[Auth] Save access token");
      await AsyncStorage.setItem("token", value);
    } else {
      log("[Auth] Clear access token");
      await AsyncStorage.removeItem("token");
    }
    setTokenState(value);
  };

  // Lưu hoặc clear refresh token
  const setRefreshToken = async (value: string | null) => {
    if (value) {
      log("[Auth] Save refresh token");
      await AsyncStorage.setItem("refreshToken", value);
    } else {
      log("[Auth] Clear refresh token");
      await AsyncStorage.removeItem("refreshToken");
    }
  };

  // Logout → clear cả access + refresh token
  const logout = async () => {
    log("[Auth] Logout → clear all tokens");
    await AsyncStorage.multiRemove(["token", "refreshToken"]);
    setTokenState(null);
  };

  // Khi app load → lấy access token hợp lệ
  useEffect(() => {
    (async () => {
      const validToken = await getValidToken(logout);
      if (validToken) setTokenState(validToken);
    })();
  }, []);

  return (
    <AuthContext.Provider value={{ token, setToken, setRefreshToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// HOOK
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải được dùng trong AuthProvider");
  return context;
};

// Kiểm tra access token hết hạn chưa
export const isTokenExpired = (token: string | null | undefined): boolean => {
  if (!token) return true;
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    const expired = Date.now() >= decoded.exp * 1000 - 30_000;
    if (expired) log("[Auth] Token expired");
    return expired;
  } catch (err) {
    warn("[Auth] Decode token failed");
    return true;
  }
};

// Lấy access token hợp lệ → nếu hết hạn thì refresh
export const getValidToken = async (
  onFailLogout?: () => Promise<void>
): Promise<string | null> => {
  const accessToken = await AsyncStorage.getItem("token");
  const refreshToken = await AsyncStorage.getItem("refreshToken");

  // Không có refresh token → logout luôn
  if (!refreshToken) {
    warn("[Auth] Missing refresh token → force logout");
    await AsyncStorage.multiRemove(["token", "refreshToken"]);
    if (onFailLogout) await onFailLogout();
    return null;
  }

  // Access token còn hạn → dùng tiếp
  if (accessToken && !isTokenExpired(accessToken)) {
    return accessToken;
  }

  // Hết hạn → gọi refresh
  log("[Auth] Access token expired → refreshing...");
  return await refreshTokenPair(refreshToken, onFailLogout);
};

// REFRESH TOKEN FLOW
const refreshApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json;charset=UTF-8" },
});

const refreshTokenPair = async (
  refreshToken: string,
  onFailLogout?: () => Promise<void>
): Promise<string | null> => {
  try {
    log("[Auth] Call refresh API");

    const res = await refreshApi.post(API_ENDPOINTS.REFRESH_TOKEN, {
      value: refreshToken,
    });

    const data = res?.data?.data;

    if (!data?.accessToken) {
      warn("[Auth] Refresh API success but missing accessToken");
      return null;
    }

    log("[Auth] Refresh success");

    // Lưu lại token mới
    await AsyncStorage.setItem("token", data.accessToken);
    await AsyncStorage.setItem(
      "refreshToken",
      data.refreshToken ?? refreshToken
    );

    return data.accessToken;
  } catch (err) {
    error("[Auth] Refresh failed");
    await AsyncStorage.multiRemove(["token", "refreshToken"]);
    if (onFailLogout) await onFailLogout();
    return null;
  }
};
