import { useAuth } from "../context/AuthContext";
import { BootstrapAuthState } from "./bootstrap/types";
import { useBootstrapAuthRefs } from "./bootstrap/useBootstrapAuthRefs";
import { useAppUpdateChecker } from "./bootstrap/useAppUpdateChecker";
import { usePermissionReloader } from "./bootstrap/usePermissionReloader";
import { useAppLifecycle } from "./bootstrap/useAppLifecycle";
import { useNhanVienInfoLoader } from "./bootstrap/useNhanVienInfoLoader";
import { usePushNotifications } from "./bootstrap/usePushNotifications";

export default function AppBootstrap() {
  const { isAuthenticated, authReady, sessionUnlocked } =
    useAuth() as BootstrapAuthState;

  const { isAuthenticatedRef, authReadyRef, sessionUnlockedRef } =
    useBootstrapAuthRefs({
      isAuthenticated,
      authReady,
      sessionUnlocked,
    });

  const { checkAppUpdateRef } = useAppUpdateChecker({
    isAuthenticated,
    authReady,
    sessionUnlocked,
    isAuthenticatedRef,
    authReadyRef,
    sessionUnlockedRef,
  });

  const { retryTimer, safeReloadRef } = usePermissionReloader({
    isAuthenticatedRef,
    authReadyRef,
    sessionUnlockedRef,
  });

  useAppLifecycle({
    safeReloadRef,
    checkAppUpdateRef,
    retryTimer,
  });

  useNhanVienInfoLoader({
    isAuthenticated,
    authReady,
    sessionUnlocked,
  });

  usePushNotifications({
    isAuthenticated,
    authReady,
    sessionUnlocked,
  });

  return null;
}
