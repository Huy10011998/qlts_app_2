import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

export const useForegroundWebViewRemount = (onBeforeRemount?: () => void) => {
  const [renderKey, setRenderKey] = useState(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const onBeforeRemountRef = useRef(onBeforeRemount);
  onBeforeRemountRef.current = onBeforeRemount;

  const remountWebView = useCallback(() => {
    onBeforeRemountRef.current?.();
    setRenderKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (
        nextState === "active" &&
        previousState.match(/inactive|background/)
      ) {
        remountWebView();
      }
    });

    return () => subscription.remove();
  }, [remountWebView]);

  return { remountWebView, renderKey };
};
