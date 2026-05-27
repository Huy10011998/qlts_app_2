import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { useAutoReload } from "./useAutoReload";

type Options = {
  enabled?: boolean;
  hasError?: boolean;
  debounceMs?: number;
  onOffline?: () => void;
  refetchOnAppResume?: boolean;
};

export function useNetworkAwareReload(
  reloadFn: () => void | Promise<void>,
  options?: Options,
) {
  const {
    enabled = true,
    hasError = false,
    debounceMs = 800,
    onOffline,
    refetchOnAppResume = false,
  } = options || {};
  const lastRetryAtRef = useRef(0);
  const lastConnectedRef = useRef<boolean | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const fnRef = useRef(reloadFn);
  const onOfflineRef = useRef(onOffline);
  const hasErrorRef = useRef(hasError);
  const hasOfflineHandler = Boolean(onOffline);

  fnRef.current = reloadFn;
  onOfflineRef.current = onOffline;
  hasErrorRef.current = hasError;

  useAutoReload(reloadFn, {
    enabled: enabled && refetchOnAppResume,
    debounceMs,
  });

  useEffect(() => {
    if (!enabled || (!hasError && !hasOfflineHandler)) return;

    const handleNetworkState = (state: NetInfoState) => {
      const isConnected =
        state.isConnected === true && state.isInternetReachable !== false;
      const previousConnected = lastConnectedRef.current;

      lastConnectedRef.current = isConnected;

      if (!isConnected && previousConnected !== false) {
        onOfflineRef.current?.();
        return;
      }

      const shouldRetry =
        isConnected &&
        (previousConnected === false ||
          (previousConnected === null && hasErrorRef.current));

      if (shouldRetry) {
        const now = Date.now();
        if (now - lastRetryAtRef.current < debounceMs) return;

        lastRetryAtRef.current = now;
        fnRef.current();
      }
    };

    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (appStateRef.current !== "active") return;
      handleNetworkState(state);
    });

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        appStateRef.current = nextState;

        if (nextState !== "active") return;

        NetInfo.fetch().then(handleNetworkState).catch(() => {});
      },
    );

    return () => {
      unsubscribeNetInfo();
      appStateSubscription.remove();
    };
  }, [debounceMs, enabled, hasError, hasOfflineHandler]);
}
