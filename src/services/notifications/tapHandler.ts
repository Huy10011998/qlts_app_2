import { log } from "../../utils/Logger";
import { TAP_DEDUPE_LIMIT } from "./constants";
import { createDedupeStore } from "./dedupe";
import { parseNotificationParams } from "./payload";
import { isKnownPushRoute, navigateToPushRoute } from "./pushRoutes";
import type { PushTapPayload } from "./types";

/**
 * Hàng đợi 1 phần tử cho thao tác "user bấm vào thông báo".
 *
 * Cần hàng đợi vì thời điểm nhận sự kiện bấm thường SỚM HƠN thời điểm có thể
 * điều hướng:
 * - app mở từ trạng thái quit: NavigationContainer chưa mount;
 * - iOS: còn phải chờ xác thực Face ID (iosAuthenticated) mới vào được AppNavigator.
 *
 * Chỉ giữ lần bấm mới nhất — nếu user bấm nhiều thông báo trước khi app kịp mở
 * thì đích đến hợp lý là thông báo cuối cùng.
 */
let pendingTap: PushTapPayload | null = null;

const handledTaps = createDedupeStore(TAP_DEDUPE_LIMIT);

/** Cùng một thông báo có thể tới từ nhiều listener (FCM + notifee) → chỉ xử lý 1 lần. */
const isAlreadyHandled = (payload: PushTapPayload) =>
  handledTaps.has(payload.id);

const routePendingTap = (): boolean => {
  if (!pendingTap) return true;

  const payload = pendingTap;
  const route = payload.data.route;

  // Không có route hoặc route lạ: coi như đã xử lý xong — mục tiêu của thông báo
  // chỉ là mở app, không cần điều hướng.
  if (!route || !isKnownPushRoute(route)) {
    log("[Push] Thông báo không có route hợp lệ → chỉ mở app", {
      id: payload.id,
      route,
      source: payload.source,
    });
    handledTaps.claim(payload.id);
    pendingTap = null;
    return true;
  }

  const navigated = navigateToPushRoute(
    route,
    parseNotificationParams(payload.data.params),
  );

  if (!navigated) {
    // Navigation chưa sẵn sàng — giữ pendingTap để drain lại lần sau.
    return false;
  }

  handledTaps.claim(payload.id);
  pendingTap = null;
  return true;
};

/**
 * Ghi nhận một lần bấm thông báo và điều hướng nếu đã đủ điều kiện.
 *
 * @param canNavigate app đã vào được AppNavigator chưa (đã đăng nhập, và trên
 * iOS là đã qua Face ID). Truyền false khi chưa — payload sẽ được giữ lại.
 */
export const handlePushTap = (
  payload: PushTapPayload,
  { canNavigate }: { canNavigate: boolean },
): void => {
  if (isAlreadyHandled(payload)) {
    log("[Push] Bỏ qua lần bấm trùng", {
      id: payload.id,
      source: payload.source,
    });
    return;
  }

  log("[Push] Nhận thao tác bấm thông báo", {
    id: payload.id,
    source: payload.source,
    route: payload.data.route,
    canNavigate,
  });

  pendingTap = payload;

  if (canNavigate) routePendingTap();
};

/**
 * Thử điều hướng lại lần bấm đang chờ. Gọi khi app đã đăng nhập xong và
 * NavigationContainer đã mount.
 */
export const drainPendingPushTap = (): void => {
  if (!pendingTap) return;
  routePendingTap();
};

export const hasPendingPushTap = (): boolean => pendingTap !== null;

/** Xoá lần bấm đang chờ — gọi khi logout để không điều hướng cho phiên mới. */
export const clearPendingPushTap = (): void => {
  pendingTap = null;
};
