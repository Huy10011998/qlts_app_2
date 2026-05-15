import { RefObject, useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";
import {
  formatVersionWithBuild,
  getStoreVersionInfo,
  isNewerAppVersion,
  markUpdateReminderDismissed,
  openStoreForUpdate,
  shouldShowUpdateReminder,
} from "../../utils/AppVersion";

type UseAppUpdateCheckerParams = {
  isAuthenticated: boolean;
  authReady?: boolean;
  iosAuthenticated: boolean;
  isAuthenticatedRef: RefObject<boolean>;
  authReadyRef: RefObject<boolean | undefined>;
  iosAuthenticatedRef: RefObject<boolean>;
};

export function useAppUpdateChecker({
  isAuthenticated,
  authReady,
  iosAuthenticated,
  isAuthenticatedRef,
  authReadyRef,
  iosAuthenticatedRef,
}: UseAppUpdateCheckerParams) {
  const hasCheckedUpdateRef = useRef(false);
  const isCheckingUpdateRef = useRef(false);
  const checkAppUpdateRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!isAuthenticated) {
      hasCheckedUpdateRef.current = false;
    }
  }, [isAuthenticated]);

  checkAppUpdateRef.current = async () => {
    const canCheckUpdate =
      authReadyRef.current &&
      isAuthenticatedRef.current &&
      (Platform.OS !== "ios" || iosAuthenticatedRef.current);

    if (!canCheckUpdate || isCheckingUpdateRef.current) return;

    isCheckingUpdateRef.current = true;

    try {
      const versionInfo = await getStoreVersionInfo();
      if (!versionInfo) return;

      if (!isNewerAppVersion(versionInfo)) {
        return;
      }

      const shouldShow = await shouldShowUpdateReminder(
        versionInfo.latestVersion,
      );
      if (!shouldShow) return;

      Alert.alert(
        "Có phiên bản mới",
        `Bạn đang dùng phiên bản ${formatVersionWithBuild(
          versionInfo.currentVersion,
          versionInfo.currentBuildNumber,
        )}. Phiên bản mới nhất là ${formatVersionWithBuild(
          versionInfo.latestVersion,
          versionInfo.latestBuildNumber,
        )}. Bạn có muốn cập nhật ngay không?`,
        [
          {
            text: "Để sau",
            style: "cancel",
            onPress: () => {
              markUpdateReminderDismissed(versionInfo.latestVersion);
            },
          },
          {
            text: "Cập nhật",
            onPress: () => {
              openStoreForUpdate(versionInfo.storeUrl);
            },
          },
        ],
        { cancelable: true },
      );
    } finally {
      isCheckingUpdateRef.current = false;
    }
  };

  useEffect(() => {
    const canCheckUpdate =
      authReady &&
      isAuthenticated &&
      (Platform.OS !== "ios" || iosAuthenticated === true);

    if (!canCheckUpdate || hasCheckedUpdateRef.current) return;

    hasCheckedUpdateRef.current = true;
    checkAppUpdateRef.current();
  }, [authReady, iosAuthenticated, isAuthenticated]);

  return {
    checkAppUpdateRef,
  };
}
