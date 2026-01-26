import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import * as Keychain from "react-native-keychain";
import { error, log } from "../utils/Logger";
import {
  hardResetApi,
  setOnAuthLogout,
  setTokenInApi,
  setRefreshInApi,
  resetAuthState,
  refreshTokenFlow,
} from "../services/data/CallApi";
import { AuthContextType, LogoutReason } from "../types/Context.d";
import { AppState } from "react-native";
import { withTimeout } from "../utils/Helper";

// CONTEXT
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [iosAuthenticated, setIosAuthenticated] = useState(false);
  const [logoutReason, setLogoutReason] = useState<LogoutReason | undefined>();
  const isAuthenticated = !!token;

  // APP STATE HANDLER
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active" && isAuthenticated) {
        try {
          resetAuthState();
          await withTimeout(refreshTokenFlow(), 8000);
        } catch (err: any) {
          // MẤT MẠNG → KHÔNG logout
          if (!err?.response) {
            log("[Auth] Skip refresh due to offline");
            return;
          }

          // TOKEN HẾT HẠN / INVALID
          await logout("EXPIRED");
        }
      }
    });

    return () => sub.remove();
  }, [isAuthenticated]);

  // TOKEN HANDLERS
  const setToken = async (value: string | null) => {
    try {
      if (value) {
        await AsyncStorage.setItem("token", value);
        setTokenInApi(value); // sync API
        log("[Auth] Save access token");
      } else {
        await AsyncStorage.removeItem("token");
        setTokenInApi(null);
        log("[Auth] Clear access token");
      }
      setTokenState(value);
    } catch (e) {
      error("[Auth] Failed to set token", e);
    }
  };

  const setRefreshToken = async (value: string | null) => {
    try {
      if (value) {
        await AsyncStorage.setItem("refreshToken", value);
        setRefreshInApi(value); // sync API
        log("[Auth] Save refresh token");
      } else {
        await AsyncStorage.removeItem("refreshToken");
        setRefreshInApi(null);
        log("[Auth] Clear refresh token");
      }
    } catch (e) {
      error("[Auth] Failed to set refresh token", e);
    }
  };

  // LOGOUT

  const logout = async (reason: LogoutReason = "OTHER") => {
    log("[Auth] Logout → hard reset");
    setLogoutReason(reason);
    setIsLoading(true);
    try {
      hardResetApi();
      await AsyncStorage.multiRemove([
        "token",
        "refreshToken",
        "faceid-enabled",
      ]);
      await Keychain.resetGenericPassword({ service: "auth-login" });
    } finally {
      setTokenState(null);
      setIosAuthenticated(false);
      setIsLoading(false);
      resetAuthState();
    }
  };

  const clearLogoutReason = () => {
    setLogoutReason(undefined);
  };

  // BOOTSTRAP APP

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const [storedToken, storedRefresh] = await Promise.all([
          AsyncStorage.getItem("token"),
          AsyncStorage.getItem("refreshToken"),
        ]);

        setTokenState(storedToken);
        setTokenInApi(storedToken); // RẤT QUAN TRỌNG
        setRefreshInApi(storedRefresh);

        log("[Auth] Bootstrap done", {
          token: !!storedToken,
          refresh: !!storedRefresh,
        });
      } catch (e) {
        error("[Auth] Bootstrap failed", e);
        await logout();
      } finally {
        setAuthReady(true); // AUTH SẴN SÀNG
      }
    };

    bootstrapAuth();
  }, []);

  // API → LOGOUT HANDLER

  useEffect(() => {
    setOnAuthLogout(async (reason?: LogoutReason) => {
      await logout(reason);
    });
    return () => setOnAuthLogout(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated,
        authReady, // expose
        isLoading,
        iosAuthenticated,
        setIosAuthenticated,
        setToken,
        setRefreshToken,
        logout,
        logoutReason,
        clearLogoutReason,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// HOOK

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth phải được dùng trong AuthProvider");
  }
  return context;
};
