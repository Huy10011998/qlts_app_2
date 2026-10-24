import { useCallback, useEffect, useRef } from "react";
import { AlertButton, AlertOptions } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { AppAlert } from "../components/ui/AppAlert";

export const useSafeAlert = () => {
  const isFocused = useIsFocused();
  const isMountedRef = useRef(true);
  const { logoutReason } = useAuth();
  const isFocusedRef = useRef(isFocused);
  const logoutReasonRef = useRef(logoutReason);

  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  useEffect(() => {
    logoutReasonRef.current = logoutReason;
  }, [logoutReason]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isMounted = useCallback(() => isMountedRef.current, []);

  const isActive = useCallback(
    () =>
      isMountedRef.current &&
      isFocusedRef.current &&
      logoutReasonRef.current !== "EXPIRED",
    [],
  );

  const showAlertIfActive = useCallback(
    (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      options?: AlertOptions,
    ) => {
      if (
        !isMountedRef.current ||
        !isFocusedRef.current ||
        logoutReasonRef.current === "EXPIRED"
      ) {
        return;
      }
      AppAlert.alert(title, message, buttons, options);
    },
    [],
  );

  return {
    isMounted,
    isActive,
    showAlertIfActive,
  };
};
