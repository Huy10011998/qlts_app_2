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

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isMounted = useCallback(() => isMountedRef.current, []);

  const isActive = useCallback(
    () =>
      isMountedRef.current &&
      isFocused &&
      logoutReason !== "EXPIRED",
    [isFocused, logoutReason],
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
        !isFocused ||
        logoutReason === "EXPIRED"
      ) {
        return;
      }
      Alert.alert(title, message, buttons, options);
    },
    [isFocused, logoutReason],
  );

  return {
    isMounted,
    isActive,
    showAlertIfActive,
  };
};
