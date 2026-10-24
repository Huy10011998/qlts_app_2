import { Linking, NativeModules, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import notifee, {
  AuthorizationStatus as NotifeeAuthorizationStatus,
} from "@notifee/react-native";
import {
  AuthorizationStatus,
  getMessaging,
  hasPermission,
  requestPermission,
} from "@react-native-firebase/messaging";
import {
  checkNotifications,
  RESULTS,
} from "react-native-permissions";
import { AppAlert } from "../../components/ui/AppAlert";
import { log, warn } from "../../utils/Logger";
import { PERMISSION_AUTO_ASKED_KEY } from "./constants";

/**
 * Trạng thái quyền thông báo dùng cho màn Cài đặt.
 * Đặt tên và các nhánh khớp với AppCameraPermissionStatus để 2 dòng quyền trong
 * Cài đặt hành xử giống nhau.
 */
export type AppNotificationPermissionStatus =
  | "granted"
  /** Chưa cấp nhưng hệ thống CÒN cho hiện dialog. */
  | "denied"
  /** Hệ thống KHÔNG hiện dialog nữa — phải vào Cài đặt để bật lại. */
  | "blocked"
  | "unknown";

/** PROVISIONAL/EPHEMERAL vẫn nhận được thông báo nên tính là đã cấp quyền. */
const GRANTED_FCM_STATUSES: number[] = [
  AuthorizationStatus.AUTHORIZED,
  AuthorizationStatus.PROVISIONAL,
  AuthorizationStatus.EPHEMERAL,
];

const GRANTED_NOTIFEE_STATUSES: number[] = [
  NotifeeAuthorizationStatus.AUTHORIZED,
  NotifeeAuthorizationStatus.PROVISIONAL,
];

/**
 * Hiện dialog xin quyền của hệ điều hành.
 *
 * Tách theo nền tảng có chủ đích:
 * - iOS: dùng RNFB messaging vì đây cũng là bước kích hoạt đăng ký APNs; xin
 *   quyền bằng đường khác sẽ khiến getToken() thất bại ở lần gọi đầu.
 * - Android: RNFB requestPermission là no-op, quyền POST_NOTIFICATIONS
 *   (Android 13+) phải xin qua notifee.
 *
 * Nội dung dialog do hệ điều hành quyết định — iOS không có usage-description key
 * cho quyền thông báo (không tồn tại NSUserNotificationsUsageDescription như
 * NSCameraUsageDescription) nên không chèn được text của app vào.
 *
 * Không throw — trả về trạng thái sau khi user chọn, hoặc "unknown" nếu lỗi.
 */
export const requestNotificationPermission =
  async (): Promise<AppNotificationPermissionStatus> => {
    try {
      if (Platform.OS === "ios") {
        const status = await requestPermission(getMessaging());
        log("[Push] Kết quả xin quyền iOS", { status });

        if (GRANTED_FCM_STATUSES.includes(status)) return "granted";
        // Vừa bị từ chối ở dialog → iOS sẽ không hiện lại lần nào nữa.
        return "blocked";
      }

      const settings = await notifee.requestPermission();
      log("[Push] Kết quả xin quyền Android", {
        status: settings.authorizationStatus,
      });

      if (GRANTED_NOTIFEE_STATUSES.includes(settings.authorizationStatus)) {
        return "granted";
      }

      // Android có thể là "từ chối lần này" hoặc "không hỏi lại" — đọc lại để
      // biết chính xác, vì hai trường hợp dẫn tới hướng dẫn khác nhau cho user.
      return getAndroidStatus();
    } catch (err) {
      warn("[Push] Xin quyền thông báo thất bại", err);
      return "unknown";
    }
  };

const getIosStatus = async (): Promise<AppNotificationPermissionStatus> => {
  const status = await hasPermission(getMessaging());

  if (GRANTED_FCM_STATUSES.includes(status)) return "granted";

  // iOS chỉ hiện dialog xin quyền đúng MỘT lần trong đời app. Sau khi user bấm
  // "Don't Allow", status thành DENIED và requestPermission trả về ngay mà không
  // hiện gì — lúc đó chỉ còn đường vào Cài đặt.
  return status === AuthorizationStatus.NOT_DETERMINED ? "denied" : "blocked";
};

const getAndroidStatus = async (): Promise<AppNotificationPermissionStatus> => {
  // notifee phản ánh công tắc thông báo thật của app, kể cả Android < 13 nơi
  // không có quyền runtime nhưng user vẫn tắt được trong Cài đặt.
  const settings = await notifee.getNotificationSettings();

  if (GRANTED_NOTIFEE_STATUSES.includes(settings.authorizationStatus)) {
    return "granted";
  }

  // Chưa bật: hỏi react-native-permissions xem còn hiện được dialog không. Nó tự
  // xử lý khác biệt giữa Android 13+ (POST_NOTIFICATIONS) và bản cũ hơn.
  // Chỉ gọi trên Android — trên iOS handler này không được biên dịch vào
  // (setup_permissions trong Podfile không bật 'Notifications').
  const { status } = await checkNotifications();

  return status === RESULTS.DENIED ? "denied" : "blocked";
};

/**
 * Đọc trạng thái quyền hiện tại mà KHÔNG hiện dialog.
 *
 * Trả về "unknown" khi có lỗi để màn Cài đặt hiển thị "Chưa xác định" thay vì
 * khẳng định sai là đã chặn.
 */
export const checkNotificationPermission =
  async (): Promise<AppNotificationPermissionStatus> => {
    try {
      const status =
        Platform.OS === "ios" ? await getIosStatus() : await getAndroidStatus();

      log("[Push] Trạng thái quyền thông báo", { status });
      return status;
    } catch (err) {
      warn("[Push] Kiểm tra quyền thông báo thất bại", err);
      return "unknown";
    }
  };

/**
 * Kiểm tra nhanh dạng boolean, dùng cho luồng lấy token.
 *
 * Tránh gọi requestNotificationPermission mỗi lần app vào foreground (trên iOS
 * lần gọi thứ hai không hiện dialog nhưng vẫn là round-trip native vô ích).
 */
export const hasNotificationPermission = async (): Promise<boolean> =>
  (await checkNotificationPermission()) === "granted";

/** Nhãn tiếng Việt cho màn Cài đặt. Khớp với getCameraPermissionLabel. */
export const getNotificationPermissionLabel = (
  status: AppNotificationPermissionStatus,
) => {
  switch (status) {
    case "granted":
      return "Đã cấp quyền";
    case "denied":
      return "Chưa cấp quyền";
    case "blocked":
      return "Đã chặn quyền";
    default:
      return "Chưa xác định";
  }
};

/**
 * Hộp của app nói vì sao cần quyền, hiện ngay trước dialog của hệ điều hành.
 *
 * Dialog hệ thống theo cỡ chữ và giao diện sáng/tối của điện thoại, app không
 * đổi được; iOS cũng không cho chèn lời giải thích vào dialog thông báo (xem
 * requestNotificationPermission). Nên lời giải thích nằm ở hộp này, đúng kiểu
 * chữ của app.
 *
 * Chỉ một nút "Tiếp tục" và luôn dẫn tới dialog hệ thống: Apple không chấp nhận
 * nút "Cho phép / Không cho phép" giả ở bước này.
 */
const explainBeforeAsking = () =>
  new Promise<void>((resolve) => {
    AppAlert.alert(
      "Bật thông báo",
      "App sẽ báo ngay khi có việc cần bạn duyệt, việc mới được giao hay cảnh báo từ camera. Bạn có thể tắt lại bất cứ lúc nào trong Cài đặt.",
      [{ text: "Tiếp tục", onPress: () => resolve() }],
      { cancelable: false },
    );
  });

const hasAutoAsked = async () => {
  try {
    return (await AsyncStorage.getItem(PERMISSION_AUTO_ASKED_KEY)) === "1";
  } catch {
    return false;
  }
};

const markAutoAsked = async () => {
  try {
    await AsyncStorage.setItem(PERMISSION_AUTO_ASKED_KEY, "1");
  } catch (err) {
    warn("[Push] Không ghi được dấu đã hỏi quyền thông báo", err);
  }
};

/**
 * Đảm bảo đã có quyền: kiểm tra trước, chỉ hỏi khi thật sự cần.
 * Dùng trong luồng lấy FCM token, tự chạy sau đăng nhập và mỗi lần mở lại app.
 *
 * Tự động chỉ hỏi MỘT lần, có hộp giải thích đi trước. Android 13+ từ chối lần
 * đầu vẫn còn hỏi lại được, nhưng bật lại mỗi lần mở app là làm phiền — người
 * dùng tự bật ở Cài đặt › Hệ thống › Quyền thông báo (gọi thẳng
 * requestNotificationPermission, không qua đây).
 */
export const ensureNotificationPermission = async (): Promise<boolean> => {
  const status = await checkNotificationPermission();

  if (status === "granted") return true;
  // Đã bị chặn thì gọi dialog cũng không hiện gì — khỏi mất một round-trip native.
  if (status === "blocked") return false;
  if (await hasAutoAsked()) return false;

  await explainBeforeAsking();
  const next = await requestNotificationPermission();
  // Ghi sau khi hỏi xong: tắt app lúc đang hiện hộp giải thích thì lần sau hỏi lại.
  await markAutoAsked();

  return next === "granted";
};

/**
 * Cầu native iOS: mở thẳng trang Thông báo của app (xem
 * ios/qlts_app_2/NotificationSettings.swift). Resolve false nếu hệ thống từ
 * chối mở — khi đó rơi về Linking.openSettings().
 */
const IosNotificationSettings = NativeModules.NotificationSettings as
  | { open: () => Promise<boolean> }
  | undefined;

/**
 * Mở trang cài đặt thông báo của app — dùng khi user đã từ chối trước đó.
 *
 * Android: notifee vào thẳng trang Thông báo của app (API >= 26).
 * iOS: notifee.openNotificationSettings() là no-op, resolve ngay và không mở gì
 * cả (bấm nút trông như treo), nên phải đi qua module native ở trên; bản build
 * cũ chưa có module thì rơi về Linking.openSettings() — tới trang app, người
 * dùng bấm thêm một nhịp vào "Thông báo".
 */
export const openNotificationSettings = async (): Promise<void> => {
  if (Platform.OS === "android") {
    try {
      await notifee.openNotificationSettings();
      return;
    } catch (err) {
      warn("[Push] Mở cài đặt thông báo thất bại, thử mở cài đặt app", err);
    }
  } else if (IosNotificationSettings) {
    try {
      if (await IosNotificationSettings.open()) return;
    } catch (err) {
      warn("[Push] Mở trang Thông báo iOS thất bại, thử mở cài đặt app", err);
    }
  }

  try {
    await Linking.openSettings();
  } catch (err) {
    warn("[Push] Mở cài đặt app thất bại", err);
  }
};
