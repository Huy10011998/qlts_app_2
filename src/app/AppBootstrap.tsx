// bootstrap/AppBootstrap.tsx
import { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";

import { log } from "../utils/Logger";
import { emitAppRefetch } from "../utils/AppRefetchBus";
import { reloadPermissions } from "../store/PermissionActions";
import { useAppDispatch } from "../store/Hooks";

export default function AppBootstrap() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // NET INFO
    let lastConnected = true;

    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (!lastConnected && state.isConnected) {
        emitAppRefetch("network");
      }
      lastConnected = !!state.isConnected;
    });

    // APP STATE
    let currentState: AppStateStatus = AppState.currentState;

    const subAppState = AppState.addEventListener("change", (nextState) => {
      if (currentState.match(/inactive|background/) && nextState === "active") {
        log("[APP] App foreground");

        // reload data + permission
        emitAppRefetch("foreground");
        dispatch(reloadPermissions());
      }

      currentState = nextState;
    });

    return () => {
      unsubscribeNetInfo();
      subAppState.remove();
    };
  }, [dispatch]);

  return null;
}
