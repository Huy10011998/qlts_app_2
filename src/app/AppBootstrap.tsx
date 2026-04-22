import { useEffect, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { log } from "../utils/Logger";
import { emitAppRefetch } from "../utils/AppRefetchBus";
import { reloadPermissions } from "../store/PermissionActions";
import { useAppDispatch } from "../store/Hooks";
import { useAuth } from "../context/AuthContext";

export default function AppBootstrap() {
  const dispatch = useAppDispatch();

  const { isAuthenticated, authReady, iosAuthenticated } = useAuth() as {
    isAuthenticated: boolean;
    authReady?: boolean;
    iosAuthenticated: boolean;
  };

  const appState = useRef<AppStateStatus>(AppState.currentState);
  const lastConnected = useRef<boolean | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttempt = useRef(0);
  const isReloading = useRef(false);

  const MAX_RETRY_ATTEMPTS = 4;
  const BASE_RETRY_MS = 5000;

  // FIX: dùng ref để luôn đọc giá trị auth mới nhất trong listeners
  // tránh stale closure khi useEffect deps là []
  const isAuthenticatedRef = useRef(isAuthenticated);
  const iosAuthenticatedRef = useRef(iosAuthenticated);
  const authReadyRef = useRef(authReady);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    iosAuthenticatedRef.current = iosAuthenticated;
  }, [iosAuthenticated]);

  useEffect(() => {
    authReadyRef.current = authReady;
  }, [authReady]);

  // FIX: dùng useRef cho function để tránh stale closure trong listeners
  const safeReloadRef = useRef<() => Promise<void> | undefined>(undefined);

  safeReloadRef.current = async () => {
    if (!isAuthenticatedRef.current) return;
    if (authReadyRef.current === false) return;
    if (Platform.OS === "ios" && !iosAuthenticatedRef.current) return;
    if (isReloading.current) return;

    isReloading.current = true;

    try {
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
        const delay = Math.min(
          BASE_RETRY_MS * 2 ** retryAttempt.current,
          30000,
        );
        retryAttempt.current += 1;
        retryTimer.current = setTimeout(() => {
          retryTimer.current = null;
          void safeReloadRef.current?.();
        }, delay);
      }
    } finally {
      // FIX: reset ngay sau khi xong thay vì setTimeout 3s cứng
      // tránh block reload hợp lệ nếu fetch mất > 3s
      isReloading.current = false;
    }
  };

  useEffect(() => {
    // FIX: deps [] — listeners chỉ đăng ký 1 lần, không re-subscribe
    // khi isAuthenticated/iosAuthenticated thay đổi
    // → không miss network/foreground event trong lúc re-subscribe

    // NET INFO LISTENER
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const isConnected =
        state.isConnected === true && state.isInternetReachable !== false;

      // từ offline → online
      if (lastConnected.current === false && isConnected) {
        log("[APP] Network reconnected");
        emitAppRefetch("network");
        void safeReloadRef.current?.();
      }

      lastConnected.current = isConnected;
    });

    // APP STATE LISTENER
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
          void safeReloadRef.current?.();
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
  }, []); // FIX: empty deps — stable listeners

  return null;
}
