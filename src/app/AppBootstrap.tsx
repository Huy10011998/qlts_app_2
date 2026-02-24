import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { log } from "../utils/Logger";
import { emitAppRefetch } from "../utils/AppRefetchBus";
import { reloadPermissions } from "../store/PermissionActions";
import { useAppDispatch } from "../store/Hooks";
import { useAuth } from "../context/AuthContext";

export default function AppBootstrap() {
  const dispatch = useAppDispatch();

  // Nếu AuthProvider có authReady -> nên lấy luôn
  const { isAuthenticated, authReady } = useAuth() as {
    isAuthenticated: boolean;
    authReady?: boolean;
  };

  const appState = useRef<AppStateStatus>(AppState.currentState);
  const lastConnected = useRef<boolean | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttempt = useRef(0);

  // Guard chống spam reload
  const isReloading = useRef(false);
  const MAX_RETRY_ATTEMPTS = 4;
  const BASE_RETRY_MS = 5000;

  const safeReloadPermissions = async () => {
    if (!isAuthenticated) return;
    if (authReady === false) return;
    if (isReloading.current) return;

    isReloading.current = true;

    const ok = await dispatch(reloadPermissions());

    if (ok) {
      retryAttempt.current = 0;
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
    } else if (
      !retryTimer.current &&
      retryAttempt.current < MAX_RETRY_ATTEMPTS
    ) {
      const delay = Math.min(BASE_RETRY_MS * 2 ** retryAttempt.current, 30000);
      retryAttempt.current += 1;
      retryTimer.current = setTimeout(() => {
        retryTimer.current = null;
        void safeReloadPermissions();
      }, delay);
    }

    // tránh spam liên tục khi app foreground nhiều lần
    setTimeout(() => {
      isReloading.current = false;
    }, 3000);
  };

  useEffect(() => {
    /**
     * NETWORK LISTENER
     */
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const isConnected =
        state.isConnected === true && state.isInternetReachable !== false;

      // từ offline -> online
      if (lastConnected.current === false && isConnected) {
        log("[APP] Network reconnected");

        emitAppRefetch("network");
        void safeReloadPermissions();
      }

      lastConnected.current = isConnected;
    });

    /**
     * APP FOREGROUND LISTENER
     */
    const subAppState = AppState.addEventListener(
      "change",
      async (nextState) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextState === "active"
        ) {
          const net = await NetInfo.fetch();

          if (!net.isConnected || net.isInternetReachable === false) {
            log("[APP] Foreground but offline");
            appState.current = nextState;
            return;
          }

          log("[APP] App returned to foreground");

          emitAppRefetch("foreground");

          // reload ngay — interceptor sẽ tự refresh token nếu cần
          void safeReloadPermissions();
        }

        appState.current = nextState;
      },
    );

    return () => {
      unsubscribeNetInfo();
      subAppState.remove();
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
    };
  }, [dispatch, isAuthenticated, authReady]);

  return null;
}
