import { useCallback, useEffect, useRef } from "react";
import {
  Alert,
  AlertButton,
  AlertOptions,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";

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
      Alert.alert(title, message, buttons, options);
    },
    [],
  );

  return {
    isMounted,
    isActive,
    showAlertIfActive,
  };
};
