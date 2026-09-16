import { DeviceEventEmitter, NativeModules, Platform } from "react-native";

export type AndroidUpdateStatus = "available" | "upToDate" | "unsupported";

export type AndroidUpdateCheckResult = {
  status: AndroidUpdateStatus;
  availableVersionCode?: number | null;
  installStatus?: number;
};

type AppUpdateNativeModule = {
  checkForUpdate: () => Promise<AndroidUpdateCheckResult>;
  startFlexibleUpdate: () => Promise<boolean>;
  completeFlexibleUpdate: () => void;
};

const nativeModule: AppUpdateNativeModule | undefined = NativeModules.AppUpdate;

/**
 * Google Play In-App Updates chỉ có trên Android; iOS vẫn dùng iTunes Lookup.
 * Thêm nữa một bản JS mới có thể chạy trên binary native cũ chưa có module —
 * lúc đó `nativeModule` là undefined chứ không phải lỗi.
 */
const isSupported = Platform.OS === "android" && nativeModule != null;

const UNSUPPORTED: AndroidUpdateCheckResult = { status: "unsupported" };

/**
 * Dò bản mới trên Play. Trả "unsupported" thay vì ném lỗi khi bản cài không đến
 * từ Play (debug, sideload, máy thiếu Play Services) — đó là tình huống bình
 * thường, không phải sự cố để đi báo người dùng.
 *
 * Lỗi thật (mất mạng, Play lỗi nội bộ) vẫn ném ra cho caller xử lý.
 */
export const checkAndroidUpdate =
  async (): Promise<AndroidUpdateCheckResult> => {
    if (!isSupported) return UNSUPPORTED;

    return nativeModule!.checkForUpdate();
  };

/**
 * Mở luồng cập nhật mềm của Play: tải ngầm, app vẫn dùng được bình thường.
 *
 * @return true nếu người dùng đồng ý cập nhật, false nếu họ từ chối.
 */
export const startAndroidFlexibleUpdate = async (): Promise<boolean> => {
  if (!isSupported) return false;

  return nativeModule!.startFlexibleUpdate();
};

/** Khởi động lại app để cài bản đã tải xong. */
export const completeAndroidFlexibleUpdate = () => {
  if (!isSupported) return;

  nativeModule!.completeFlexibleUpdate();
};

/**
 * Lắng nghe lúc bản cập nhật tải xong để nhắc người dùng khởi động lại. Native
 * cũng bắn lại sự kiện này mỗi lần app về foreground, vì bản tải xong trong lúc
 * app ở nền sẽ nằm im mãi nếu không ai nhắc.
 *
 * @return hàm gỡ listener.
 */
export const addAndroidUpdateDownloadedListener = (listener: () => void) => {
  if (!isSupported) return () => {};

  const subscription = DeviceEventEmitter.addListener(
    "AppUpdateDownloaded",
    listener,
  );

  return () => subscription.remove();
};
