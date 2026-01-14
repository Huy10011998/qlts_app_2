import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";

import { log } from "../utils/Logger";
import { emitAppRefetch } from "../utils/AppRefetchBus";
import { reloadPermissions } from "../store/PermissionActions";
import { useAppDispatch } from "../store/Hooks";
import { getPermission } from "../services/Index";

export default function AppBootstrap() {
  const dispatch = useAppDispatch();

  const appState = useRef<AppStateStatus>(AppState.currentState);
  const lastConnected = useRef<boolean | null>(null);

  useEffect(() => {
    // NETWORK
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const isConnected = !!state.isConnected;

      if (lastConnected.current === false && isConnected) {
        log("[APP] Network reconnected");
        emitAppRefetch("network");
      }

      lastConnected.current = isConnected;
    });

    // APP STATE
    const subAppState = AppState.addEventListener("change", (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        log("[APP] App foreground");

        emitAppRefetch("foreground");
        dispatch(reloadPermissions());

        // trigger silent refresh / auth check
        getPermission().catch(() => {});
      }

      appState.current = nextState;
    });

    return () => {
      unsubscribeNetInfo();
      subAppState.remove();
    };
  }, [dispatch]);

  return null;
}
