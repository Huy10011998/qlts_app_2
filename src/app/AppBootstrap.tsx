import { useAuth } from "../context/AuthContext";
import { BootstrapAuthState } from "./bootstrap/types";
import { useBootstrapAuthRefs } from "./bootstrap/useBootstrapAuthRefs";
import { useAppUpdateChecker } from "./bootstrap/useAppUpdateChecker";
import { usePermissionReloader } from "./bootstrap/usePermissionReloader";
import { useAppLifecycle } from "./bootstrap/useAppLifecycle";

export default function AppBootstrap() {
  const { isAuthenticated, authReady, iosAuthenticated } =
    useAuth() as BootstrapAuthState;

  const { isAuthenticatedRef, authReadyRef, iosAuthenticatedRef } =
    useBootstrapAuthRefs({
      isAuthenticated,
      authReady,
      iosAuthenticated,
    });

  const { checkAppUpdateRef } = useAppUpdateChecker({
    isAuthenticated,
    authReady,
    iosAuthenticated,
    isAuthenticatedRef,
    authReadyRef,
    iosAuthenticatedRef,
  });

  const { retryTimer, safeReloadRef } = usePermissionReloader({
    isAuthenticatedRef,
    authReadyRef,
    iosAuthenticatedRef,
  });

  useAppLifecycle({
    safeReloadRef,
    checkAppUpdateRef,
    retryTimer,
  });

  return null;
}
