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
} from "../services/data/CallApi";
import { AuthContextType } from "../types/Context.d";

// CONTEXT
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false); // NEW
  const [isLoading, setIsLoading] = useState(false);
  const [iosAuthenticated, setIosAuthenticated] = useState(false);

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

  const logout = async () => {
    log("[Auth] Logout → hard reset");
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
    }
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
    setOnAuthLogout(async () => {
      await logout();
    });
    return () => setOnAuthLogout(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        authReady, // expose
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
  if (!context) {
    throw new Error("useAuth phải được dùng trong AuthProvider");
  }
  return context;
};
