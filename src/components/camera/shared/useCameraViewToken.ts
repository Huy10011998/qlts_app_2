import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getTokenViewCamera } from "../../../services/data/callApi";
import { decodeTokenExpiry, isTokenStillValid } from "./cameraStreamUtils";
import { useNetworkAwareReload } from "../../../hooks/useNetworkAwareReload";
import { warn } from "../../../utils/Logger";

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
  const [tokenErrorMessage, setTokenErrorMessage] = useState<string | null>(
    null,
  );

  const cameraTokenRef = useRef("");
  const isFocusedRef = useRef(false);
  const tokenRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const tokenRequestRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    cameraTokenRef.current = cameraToken;
  }, [cameraToken]);

  // Keep this synchronous with render so a focus callback in the same commit
  // cannot observe the previous tab's focus state and skip the reload.
  isFocusedRef.current = isFocused;

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
        fetchCameraTokenRef.current(false);
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

      let request = tokenRequestRef.current;
      try {
        if (!request) {
          request = (async () => {
            const res: any = await getTokenViewCamera();
            return res?.data ?? null;
          })();
          tokenRequestRef.current = request;
        }

        const nextToken = await request;

        // A request can start on CameraList, finish while the Settings tab is
        // active, then be awaited by CameraList when it receives focus again.
        // Apply its result after awaiting based on the *current* focus state;
        // otherwise that race leaves cameraToken empty and every card loading.
        if (nextToken && isFocusedRef.current) {
          const timestamp = Date.now();
          cameraTokenRef.current = nextToken;
          setCameraToken(nextToken);
          setThumbTimestamp(timestamp);
          setTokenErrorMessage(null);
          scheduleProactiveRefresh(nextToken);
          onTokenReceived?.(nextToken, timestamp);
        }
      } catch (err) {
        warn("getTokenViewCamera error:", err);
        if (isFocusedRef.current) {
          setTokenErrorMessage(
            "Vui lòng kiểm tra kết nối mạng hoặc quay lại để thử lại.",
          );
        }
      } finally {
        if (tokenRequestRef.current === request) {
          tokenRequestRef.current = null;
        }
      }
    },
    [onTokenReceived, scheduleProactiveRefresh],
  );

  useEffect(() => {
    fetchCameraTokenRef.current = fetchCameraToken;
  }, [fetchCameraToken]);

  useNetworkAwareReload(
    () => {
      fetchCameraTokenRef.current(true);
    },
    {
      enabled: isFocused,
      hasError: Boolean(tokenErrorMessage),
      onOffline: () => {
        setCameraToken("");
        cameraTokenRef.current = "";
        setTokenErrorMessage(
          "Vui lòng kiểm tra kết nối mạng hoặc quay lại để thử lại.",
        );
      },
    },
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (isFocusedRef.current) {
          fetchCameraTokenRef.current(true);
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
    tokenErrorMessage,
  };
}
