import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getTokenViewCamera } from "../../../services/data/CallApi";
import { subscribeAppRefetch } from "../../../utils/AppRefetchBus";
import {
  decodeTokenExpiry,
  isTokenStillValid,
} from "./cameraStreamUtils";

type UseCameraViewTokenParams = {
  isFocused: boolean;
  onActive?: () => void;
  onBackground?: () => void;
  onTokenReceived?: (token: string, timestamp: number) => void;
};

export function useCameraViewToken({
  isFocused,
  onActive,
  onBackground,
  onTokenReceived,
}: UseCameraViewTokenParams) {
  const [cameraToken, setCameraToken] = useState("");
  const [thumbTimestamp, setThumbTimestamp] = useState(0);

  const cameraTokenRef = useRef("");
  const isFocusedRef = useRef(false);
  const tokenRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const tokenRequestRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    cameraTokenRef.current = cameraToken;
  }, [cameraToken]);

  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  const clearTokenRefreshTimer = useCallback(() => {
    if (tokenRefreshTimerRef.current) {
      clearTimeout(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }
  }, []);

  const fetchCameraTokenRef = useRef<(force?: boolean) => Promise<void>>(
    async () => {},
  );

  const scheduleProactiveRefresh = useCallback(
    (token: string) => {
      clearTokenRefreshTimer();
      const expiry = decodeTokenExpiry(token);

      if (!expiry) return;

      const delay = expiry - Date.now() - 60000;
      if (delay <= 0) return;

      tokenRefreshTimerRef.current = setTimeout(() => {
        void fetchCameraTokenRef.current(false);
      }, delay);
    },
    [clearTokenRefreshTimer],
  );

  const fetchCameraToken = useCallback(
    async (force = false) => {
      if (!isFocusedRef.current) return;

      if (!force && isTokenStillValid(cameraTokenRef.current)) {
        scheduleProactiveRefresh(cameraTokenRef.current);
        return;
      }

      if (tokenRequestRef.current) {
        await tokenRequestRef.current;
        return;
      }

      try {
        tokenRequestRef.current = (async () => {
          const res: any = await getTokenViewCamera();
          const nextToken = res?.data ?? null;

          if (nextToken && isFocusedRef.current) {
            const timestamp = Date.now();
            setCameraToken(nextToken);
            setThumbTimestamp(timestamp);
            scheduleProactiveRefresh(nextToken);
            onTokenReceived?.(nextToken, timestamp);
          }

          return nextToken;
        })();

        await tokenRequestRef.current;
      } catch (err) {
        console.warn("getTokenViewCamera error:", err);
      } finally {
        tokenRequestRef.current = null;
      }
    },
    [onTokenReceived, scheduleProactiveRefresh],
  );

  useEffect(() => {
    fetchCameraTokenRef.current = fetchCameraToken;
  }, [fetchCameraToken]);

  useEffect(() => {
    const unsub = subscribeAppRefetch(() => {
      void fetchCameraTokenRef.current(true);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (isFocusedRef.current) {
          void fetchCameraTokenRef.current(true);
          onActive?.();
        }
        return;
      }

      if (state === "background") {
        onBackground?.();
      }
    });

    return () => sub.remove();
  }, [onActive, onBackground]);

  return {
    cameraToken,
    cameraTokenRef,
    clearTokenRefreshTimer,
    fetchCameraToken,
    fetchCameraTokenRef,
    isFocusedRef,
    setCameraToken,
    setThumbTimestamp,
    thumbTimestamp,
  };
}
