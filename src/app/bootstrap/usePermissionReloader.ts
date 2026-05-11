import { RefObject, useRef } from "react";
import { Platform } from "react-native";
import { useAppDispatch } from "../../store/Hooks";
import { reloadPermissions } from "../../store/PermissionActions";
import { BASE_RETRY_MS, MAX_RETRY_ATTEMPTS } from "./constants";

type UsePermissionReloaderParams = {
  isAuthenticatedRef: RefObject<boolean>;
  authReadyRef: RefObject<boolean | undefined>;
  iosAuthenticatedRef: RefObject<boolean>;
};

export function usePermissionReloader({
  isAuthenticatedRef,
  authReadyRef,
  iosAuthenticatedRef,
}: UsePermissionReloaderParams) {
  const dispatch = useAppDispatch();
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttempt = useRef(0);
  const isReloading = useRef(false);
  const safeReloadRef = useRef<() => Promise<void> | undefined>(undefined);

  safeReloadRef.current = async () => {
    if (!isAuthenticatedRef.current) return;
    if (authReadyRef.current === false) return;
    if (Platform.OS === "ios" && !iosAuthenticatedRef.current) return;
    if (isReloading.current) return;

    isReloading.current = true;

    try {
      const ok = await dispatch(reloadPermissions());

      if (ok) {
        retryAttempt.current = 0;
        if (retryTimer.current) {
          clearTimeout(retryTimer.current);
          retryTimer.current = null;
        }
      } else if (
        !retryTimer.current &&
        retryAttempt.current < MAX_RETRY_ATTEMPTS
      ) {
        const delay = Math.min(
          BASE_RETRY_MS * 2 ** retryAttempt.current,
          30000,
        );
        retryAttempt.current += 1;
        retryTimer.current = setTimeout(() => {
          retryTimer.current = null;
          void safeReloadRef.current?.();
        }, delay);
      }
    } finally {
      isReloading.current = false;
    }
  };

  return {
    retryTimer,
    safeReloadRef,
  };
}
