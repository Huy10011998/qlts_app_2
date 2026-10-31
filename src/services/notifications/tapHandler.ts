import { StackActions } from "@react-navigation/native";
import {
  navigationRef,
  pushScreensFromRef,
} from "../../navigation/navigationService";
import { getThongBaoScreens } from "../../screens/ThongBao/thongBaoRules";
import { store } from "../../store";
import { thongBaoDaDoc } from "../data/thongBaoApi";
import { log, warn } from "../../utils/Logger";
import {
  buildCameraAiParams,
  CAMERA_AI_ROUTE,
  type CameraAiRouteParams,
  canViewCameraPush,
  getCameraAiOpenAction,
  isCameraAiPush,
} from "./cameraPush";
import { TAP_DEDUPE_LIMIT } from "./constants";
import { createDedupeStore } from "./dedupe";
import { parseNotificationParams } from "./payload";
import { isKnownPushRoute, navigateToPushRoute } from "./pushRoutes";
import {
  buildThongBaoPushTarget,
  emitThongBaoPush,
  getThongBaoPushId,
  isThongBaoPush,
  THONG_BAO_BADGE_NOTIFICATION_ID,
} from "./thongBaoPush";
import type { PushTapPayload } from "./types";

/**
 * Hàng đợi 1 phần tử cho thao tác "user bấm vào thông báo".
 *
 * Cần hàng đợi vì thời điểm nhận sự kiện bấm thường SỚM HƠN thời điểm có thể
 * điều hướng:
 * - app mở từ trạng thái quit: NavigationContainer chưa mount;
 * - đã bật Face ID / vân tay: còn phải chờ mở khoá (sessionUnlocked) mới vào được AppNavigator.
 *
 * Chỉ giữ lần bấm mới nhất — nếu user bấm nhiều thông báo trước khi app kịp mở
 * thì đích đến hợp lý là thông báo cuối cùng.
 */
let pendingTap: PushTapPayload | null = null;

const handledTaps = createDedupeStore(TAP_DEDUPE_LIMIT);

/**
 * Cùng một thông báo có thể tới từ nhiều listener (FCM + notifee) → chỉ xử lý 1 lần.
 * Trừ thông báo tóm tắt số chưa đọc (Android): id cố định, nằm lại khay, bấm bao lần cũng mở chuông.
 */
const isAlreadyHandled = (payload: PushTapPayload) =>
  payload.id !== THONG_BAO_BADGE_NOTIFICATION_ID && handledTaps.has(payload.id);

/**
 * Đích đến của một thông báo.
 *
 * BE gửi noti camera theo khoá nghiệp vụ (`type` + `ID_Camera`) chứ không gửi
 * `route`/`params`, nên phải suy ra route ở đây. Các loại noti sau này vẫn dùng
 * được đường `route`/`params` chung.
 */
const resolveTapTarget = (
  data: Record<string, string>,
): {
  route: string;
  params?: Record<string, unknown>;
  /** Push bình luận: chồng màn Bình luận lên chi tiết. */
  binhLuan?: Record<string, unknown>;
} | null => {
  if (isCameraAiPush(data)) {
    const params = buildCameraAiParams(data);
    return params ? { route: CAMERA_AI_ROUTE, params } : null;
  }

  // Thông báo chuông (8-Mobile-ThongBao mục 6): mở như bấm trong chuông.
  if (isThongBaoPush(data)) return buildThongBaoPushTarget(data);

  if (!data.route || !isKnownPushRoute(data.route)) return null;

  return {
    route: data.route,
    params: parseNotificationParams(data.params),
  };
};

/** Noti camera: chồng / thay / đứng yên tuỳ màn đang mở (`getCameraAiOpenAction`). */
const openCameraAiFromRef = (params: CameraAiRouteParams): boolean => {
  if (!navigationRef.isReady()) return false;

  const action = getCameraAiOpenAction(
    navigationRef.getCurrentRoute(),
    params.cameras[0].iD_Camera,
  );

  log("[Push] Mở live view camera theo thông báo", {
    action,
    cameraId: params.cameras[0].iD_Camera,
  });

  if (action === "stay") return true;

  try {
    navigationRef.dispatch(
      action === "replace"
        ? StackActions.replace(CAMERA_AI_ROUTE, params)
        : StackActions.push(CAMERA_AI_ROUTE, params),
    );
    return true;
  } catch (err) {
    warn("[Push] Mở live view camera thất bại", err);
    return false;
  }
};

const routePendingTap = (): boolean => {
  if (!pendingTap) return true;

  const payload = pendingTap;

  if (isCameraAiPush(payload.data)) {
    const canViewCamera = canViewCameraPush(store.getState().permission);

    // Quyền nạp sau khi vào AppNavigator — giữ lại chờ, đừng chặn oan người có quyền.
    if (canViewCamera === null) return false;

    if (!canViewCamera) {
      log("[Push] Không có quyền xem Camera → chỉ mở app", {
        id: payload.id,
        source: payload.source,
      });
      handledTaps.claim(payload.id);
      pendingTap = null;
      return true;
    }
  }

  const target = resolveTapTarget(payload.data);

  // Không suy ra được đích đến: coi như đã xử lý xong — mục tiêu của thông báo
  // chỉ là mở app, không cần điều hướng.
  if (!target) {
    log("[Push] Thông báo không có đích hợp lệ → chỉ mở app", {
      id: payload.id,
      type: payload.data.type,
      route: payload.data.route,
      source: payload.source,
    });
    handledTaps.claim(payload.id);
    pendingTap = null;
    return true;
  }

  // Push chuông: chồng màn như bấm trong chuông (back hết về chỗ đang đứng).
  const navigated = isThongBaoPush(payload.data)
    ? pushScreensFromRef(getThongBaoScreens(target))
    : isCameraAiPush(payload.data)
    ? openCameraAiFromRef(target.params as CameraAiRouteParams)
    : navigateToPushRoute(target.route, target.params);

  if (!navigated) {
    // Navigation chưa sẵn sàng — giữ pendingTap để drain lại lần sau.
    return false;
  }

  handledTaps.claim(payload.id);
  pendingTap = null;
  markThongBaoPushRead(payload.data);
  return true;
};

/**
 * Bấm push thông báo = đánh dấu đọc thông báo đó (mục 6). Chỉ gọi lúc đã điều
 * hướng được — tức đã đăng nhập, có token. Lỗi thì chuông vẫn còn chưa đọc.
 */
const markThongBaoPushRead = (data: Record<string, string>) => {
  const id = isThongBaoPush(data) ? getThongBaoPushId(data) : null;
  if (!id) return;
  thongBaoDaDoc([id])
    .then((left) => left != null && emitThongBaoPush({ kind: "read", soChuaDoc: left }))
    .catch((err) => warn("[Push] Đánh dấu đã đọc thông báo thất bại", err));
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
    type: payload.data.type,
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

/** Lần bấm đang chờ là noti camera, còn chờ quyền nạp xong mới biết có mở được không. */
export const isPendingPushTapWaitingForPermissions = (): boolean =>
  pendingTap !== null &&
  isCameraAiPush(pendingTap.data) &&
  canViewCameraPush(store.getState().permission) === null;

/** Xoá lần bấm đang chờ — gọi khi logout để không điều hướng cho phiên mới. */
export const clearPendingPushTap = (): void => {
  pendingTap = null;
};
