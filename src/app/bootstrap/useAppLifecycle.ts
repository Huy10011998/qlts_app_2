import { RefObject, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { emitAppRefetch } from "../../utils/AppRefetchBus";
import { log } from "../../utils/Logger";

type UseAppLifecycleParams = {
  safeReloadRef: RefObject<(() => Promise<void> | undefined) | undefined>;
  checkAppUpdateRef: RefObject<() => Promise<void>>;
  retryTimer: RefObject<ReturnType<typeof setTimeout> | null>;
};

export function useAppLifecycle({
  safeReloadRef,
  checkAppUpdateRef,
  retryTimer,
}: UseAppLifecycleParams) {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const lastConnected = useRef<boolean | null>(null);

  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const isConnected =
        state.isConnected === true && state.isInternetReachable !== false;

      if (lastConnected.current === false && isConnected) {
        log("[APP] Network reconnected");
        emitAppRefetch("network");
        safeReloadRef.current?.();
      }

      lastConnected.current = isConnected;
    });

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
          safeReloadRef.current?.();
          checkAppUpdateRef.current?.();
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
  }, [checkAppUpdateRef, retryTimer, safeReloadRef]);
}
