import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { error, log, warn } from "../utils/Logger";
import { clearTokenStorage, setOnAuthLogout } from "../services/data/CallApi";
import { AuthContextType } from "../types/Context.d";

// CONTEXT
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [iosAuthenticated, setIosAuthenticated] = useState(false);

  // Lưu hoặc clear access token
  const setToken = async (value: string | null) => {
    try {
      if (value) {
        log("[Auth] Save access token:", value);
        await AsyncStorage.setItem("token", value);
      } else {
        log("[Auth] Clear access token");
        await AsyncStorage.removeItem("token");
      }
      setTokenState(value);
      log("[Auth] tokenState updated:", value);
    } catch (e) {
      error("[Auth] Failed to set token", e);
    }
  };

  // Lưu hoặc clear refresh token
  const setRefreshToken = async (value: string | null) => {
    try {
      if (value) {
        log("[Auth] Save refresh token:", value);
        await AsyncStorage.setItem("refreshToken", value);
      } else {
        log("[Auth] Clear refresh token");
        await AsyncStorage.removeItem("refreshToken");
      }
    } catch (e) {
      error("[Auth] Failed to set refresh token", e);
    }
  };

  // Logout → clear cả access + refresh token
  const logout = async () => {
    log("[Auth] Logout → clear all tokens");
    try {
      await Promise.all([
        AsyncStorage.removeItem("token"),
        AsyncStorage.removeItem("refreshToken"),
        clearTokenStorage(),
      ]);
    } catch (e) {
      warn("[Auth] Error clearing storage on logout");
    } finally {
      setTokenState(null);
    }
  };

  // Khi app load → lấy access token
  useEffect(() => {
    const loadToken = async () => {
      try {
        const stored = await AsyncStorage.getItem("token");
        setTokenState(stored);
        log("[Auth] Loaded token from storage:", stored);
      } catch (err) {
        error("[Auth] Failed to load token from storage", err);
        await logout();
      } finally {
        setIsLoading(false);
      }
    };

    loadToken();
  }, []);

  // Đăng ký logout handler cho API
  useEffect(() => {
    setOnAuthLogout(async () => {
      await logout();
    });
    return () => {
      setOnAuthLogout(null);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        isLoading,
        iosAuthenticated,
        setIosAuthenticated,
        setToken,
        setRefreshToken,
        logout,
      }}
    >
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
