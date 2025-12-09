import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { AuthContextType } from "../types/Index";
import { error, log, warn } from "../utils/Logger";
import { clearTokenStorage, setOnAuthLogout } from "../services/data/CallApi";

// CONTEXT
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [token, setTokenState] = useState<string | null>(null);

  // Lưu hoặc clear access token
  const setToken = async (value: string | null) => {
    if (value) {
      log("[Auth] Save access token:", value);
      await AsyncStorage.setItem("token", value);
    } else {
      log("[Auth] Clear access token");
      await AsyncStorage.removeItem("token");
    }
    setTokenState(value);
    log("[Auth] tokenState updated:", value);
  };

  // Lưu hoặc clear refresh token
  const setRefreshToken = async (value: string | null) => {
    if (value) {
      log("[Auth] Save refresh token:", value);
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
      await Promise.all([
        AsyncStorage.removeItem("token"),
        AsyncStorage.removeItem("refreshToken"),
        clearTokenStorage(), // <--- thêm dòng này
      ]);
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
        setTokenState(stored);
        log("[Auth] Loaded token from storage:", stored);
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

  // useAutoRefreshToken();

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
