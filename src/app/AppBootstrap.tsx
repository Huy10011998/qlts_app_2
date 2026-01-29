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
  const { isAuthenticated } = useAuth();

  const appState = useRef<AppStateStatus>(AppState.currentState);
  const lastConnected = useRef<boolean | null>(null);

  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const isConnected = !!state.isConnected;

      if (lastConnected.current === false && isConnected && isAuthenticated) {
        emitAppRefetch("network");
        dispatch(reloadPermissions());
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
          if (!net.isConnected) {
            log("[APP] Foreground but offline");
            return;
          }

          emitAppRefetch("foreground");

          // Thêm delay nhỏ để đợi token refresh từ AuthProvider
          setTimeout(() => {
            dispatch(reloadPermissions());
          }, 800);
        }

        appState.current = nextState;
      },
    );

    return () => {
      unsubscribeNetInfo();
      subAppState.remove();
    };
  }, [dispatch, isAuthenticated]);

  return null;
}
