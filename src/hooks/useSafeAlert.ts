import { useCallback, useEffect, useRef } from "react";
import {
  Alert,
  AlertButton,
  AlertOptions,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";

export const useSafeAlert = () => {
  const isFocused = useIsFocused();
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isMounted = useCallback(() => isMountedRef.current, []);

  const isActive = useCallback(
    () => isMountedRef.current && isFocused,
    [isFocused],
  );

  const showAlertIfActive = useCallback(
    (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      options?: AlertOptions,
    ) => {
      if (!isMountedRef.current || !isFocused) return;
      Alert.alert(title, message, buttons, options);
    },
    [isFocused],
  );

  return {
    isMounted,
    isActive,
    showAlertIfActive,
  };
};
