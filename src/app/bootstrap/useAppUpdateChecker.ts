import { RefObject, useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";
import {
  ANDROID_STORE_URL,
  getStoreVersionInfo,
  getUpdateReminderKey,
  markUpdateReminderDismissed,
  openStoreForUpdate,
  shouldShowUpdateReminder,
} from "../../utils/AppVersion";
import {
  addAndroidUpdateDownloadedListener,
  completeAndroidFlexibleUpdate,
  startAndroidFlexibleUpdate,
} from "../../services/appUpdate/androidInAppUpdate";
import { warn } from "../../utils/Logger";
import { StoreVersionInfo } from "../../utils/appVersion/types";

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
  const shownUpdateVersionRef = useRef<string | null>(null);
  const checkAppUpdateRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!isAuthenticated) {
      hasCheckedUpdateRef.current = false;
      shownUpdateVersionRef.current = null;
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
      if (!versionInfo?.hasUpdate) return;

      const reminderKey = getUpdateReminderKey(versionInfo);
      if (!reminderKey) return;

      const shouldShow = await shouldShowUpdateReminder(reminderKey);
      if (!shouldShow) return;
      if (shownUpdateVersionRef.current === reminderKey) {
        return;
      }

      shownUpdateVersionRef.current = reminderKey;

      if (Platform.OS === "android") {
        await promptAndroidUpdate(reminderKey);
        return;
      }

      promptIosUpdate(versionInfo, reminderKey);
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

  /**
   * Luồng flexible tải ngầm xong thì bản mới vẫn chưa được cài — phải khởi động
   * lại app. Native bắn sự kiện này cả lúc tải xong lẫn mỗi lần app về
   * foreground, vì bản tải xong trong lúc app ở nền sẽ nằm im nếu không ai nhắc.
   */
  useEffect(() => {
    if (Platform.OS !== "android") return;

    return addAndroidUpdateDownloadedListener(() => {
      Alert.alert(
        "Đã tải xong bản cập nhật",
        "Khởi động lại ứng dụng để hoàn tất cài đặt.",
        [
          { text: "Để sau", style: "cancel" },
          { text: "Cài đặt ngay", onPress: completeAndroidFlexibleUpdate },
        ],
        { cancelable: true },
      );
    });
  }, []);

  return {
    checkAppUpdateRef,
  };
}

/**
 * Android không cần Alert tự dựng: Play đã có hộp thoại xác nhận riêng, bấm
 * đồng ý là tải ngầm luôn, không phải rời app sang store.
 */
const promptAndroidUpdate = async (reminderKey: string) => {
  try {
    const accepted = await startAndroidFlexibleUpdate();
    if (!accepted) {
      markUpdateReminderDismissed(reminderKey);
    }
  } catch (err) {
    warn("[Version] Flexible update flow failed", err);
    // Không mở được luồng trong app thì vẫn còn đường ra store thủ công.
    openStoreForUpdate(ANDROID_STORE_URL).catch((linkErr) => {
      warn("[Version] Open store failed", linkErr);
    });
  }
};

const promptIosUpdate = (versionInfo: StoreVersionInfo, reminderKey: string) => {
  Alert.alert(
    "Có phiên bản mới",
    `Bạn đang dùng phiên bản ${versionInfo.currentVersion}. Phiên bản mới nhất là ${
      versionInfo.latestVersion ?? ""
    }. Bạn có muốn cập nhật ngay không?`,
    [
      {
        text: "Để sau",
        style: "cancel",
        onPress: () => {
          markUpdateReminderDismissed(reminderKey);
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
};
