export type StoreVersionInfo = {
  currentBuildNumber: string;
  currentVersion: string;
  /** Đã quyết sẵn ở tầng store: iOS so version, Android hỏi thẳng Play. */
  hasUpdate: boolean;
  /**
   * Bản cài không đến từ store (debug, sideload) nên không dò được — khác hẳn
   * với dò thất bại, và không nên hiện như một lỗi.
   */
  isCheckUnsupported?: boolean;
  /** Chỉ iOS: Play In-App Updates không trả về versionName của bản mới. */
  latestVersion?: string;
  latestBuildNumber?: string;
  /** Chỉ Android. */
  availableVersionCode?: number;
  storeUrl: string;
  source: "appStore" | "playInApp";
};

export type UpdateReminderState = {
  dismissedAt: number;
  latestVersion: string;
};
