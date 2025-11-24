import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { AuthContextType, JwtPayload } from "../types/Index";
import { error, log, warn } from "../utils/Logger";
import { setOnAuthLogout } from "../services/data/CallApi";

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
    try {
      await AsyncStorage.multiRemove(["token", "refreshToken"]);
    } catch (e) {
      warn("[Auth] Error clearing storage on logout");
    }
    setTokenState(null);
  };

  // Khi app load → lấy access token hợp lệ (KHÔNG tự refresh ở đây)
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("token");
        if (stored && !isTokenExpired(stored)) {
          setTokenState(stored);
          log("[Auth] Loaded valid token from storage");
        } else {
          setTokenState(null);
          log("[Auth] No valid token on load");
        }
      } catch (err) {
        error("[Auth] Failed to load token from storage", err);
        await logout();
      }
    })();
  }, []);

  // Đăng ký logout handler cho module api (để api có thể gọi logout khi refresh thất bại)
  useEffect(() => {
    setOnAuthLogout(async () => {
      await logout();
    });
    return () => {
      setOnAuthLogout(null);
    };
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

/**
 * Lấy access token hiện tại từ storage nhưng KHÔNG thực hiện refresh ở đây.
 * Trả về token nếu còn hạn, hoặc null nếu không có / hết hạn.
 */
export const getValidToken = async (): Promise<string | null> => {
  try {
    const accessToken = await AsyncStorage.getItem("token");
    if (accessToken && !isTokenExpired(accessToken)) {
      return accessToken;
    }
    return null;
  } catch (err) {
    error("[Auth] getValidToken error", err);
    return null;
  }
};
