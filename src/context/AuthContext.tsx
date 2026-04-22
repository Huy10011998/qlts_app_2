import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useCallback,
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
} from "../services/data/CallApi";
import { AuthContextType, LogoutReason } from "../types/Context.d";
import {
  AUTH_LOGIN_SERVICE,
  FACE_ID_ENABLED_KEY,
  FACE_ID_LOGIN_SERVICE,
} from "../constants/AuthStorage";

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

  const logout = useCallback(async (reason: LogoutReason = "OTHER") => {
    log("[Auth] Logout → hard reset");
    setLogoutReason(reason);
    setIsLoading(true);
    setTokenState(null);
    setIosAuthenticated(false);
    hardResetApi();

    try {
      await AsyncStorage.multiRemove(["token", "refreshToken"]);

      if (reason !== "EXPIRED") {
        await AsyncStorage.removeItem(FACE_ID_ENABLED_KEY);
        await Promise.all([
          Keychain.resetGenericPassword({ service: AUTH_LOGIN_SERVICE }),
          Keychain.resetGenericPassword({ service: FACE_ID_LOGIN_SERVICE }),
        ]);
      }
    } catch (e) {
      error("[Auth] Logout cleanup failed", e);
    } finally {
      setIsLoading(false);
      resetAuthState();
    }
  }, []);

  // TOKEN HANDLERS
  const setToken = async (value: string | null) => {
    try {
      if (value) {
        await AsyncStorage.setItem("token", value);
        setTokenInApi(value);
        setLogoutReason(undefined);
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
        setRefreshInApi(value);
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

  const clearLogoutReason = () => {
    setLogoutReason(undefined);
  };

  // BOOTSTRAP APP
  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        // FIX: load cả 2 token song song
        const [storedToken, storedRefresh] = await Promise.all([
          AsyncStorage.getItem("token"),
          AsyncStorage.getItem("refreshToken"),
        ]);

        setTokenState(storedToken);
        setTokenInApi(storedToken);
        setRefreshInApi(storedRefresh);

        log("[Auth] Bootstrap done", {
          token: !!storedToken,
          refresh: !!storedRefresh,
        });
      } catch (e) {
        error("[Auth] Bootstrap failed", e);
        await logout();
      } finally {
        setAuthReady(true);
      }
    };

    bootstrapAuth();
  }, [logout]);

  // API → LOGOUT HANDLER
  useEffect(() => {
    setOnAuthLogout(async (reason?: LogoutReason) => {
      await logout(reason);
    });
    return () => setOnAuthLogout(null);
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated,
        authReady,
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth phải được dùng trong AuthProvider");
  }
  return context;
};
