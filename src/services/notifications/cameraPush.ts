import {
  hasFullPermission,
  hasViewPermission,
} from "../../hooks/shared/permissionHelpers";
import type { CameraRouteItem } from "../../types";
import type { PermissionState } from "../../types/redux.d";

/**
 * Giá trị `data.type` BE gửi cho thông báo AI service nhận dạng hình ảnh
 * (phát hiện đối tượng / cháy khói / hút thuốc) — bản BE 16/09/2026.
 */
export const CAMERA_AI_TYPE = "CAMERA_AI";

/**
 * `data.type` của bản BE 27/08/2026, khi nguồn sự kiện còn là đầu ghi phát hiện
 * chuyển động. Giữ lại để app mới vẫn mở được live view trong lúc server chưa
 * deploy bản mới — xoá sau khi BE deploy xong.
 */
const LEGACY_CAMERA_MOTION_TYPE = "CAMERA_MOTION";

/** Route live view mà thông báo camera mở tới. */
export const CAMERA_AI_ROUTE = "CameraListGrid";

/**
 * Lọc theo `type` thay vì theo sự có mặt của ID_Camera: sau này còn loại thông
 * báo camera khác (mất kết nối đầu ghi…) dùng chung các khoá này.
 */
export const isCameraAiPush = (data: Record<string, string>): boolean =>
  data.type === CAMERA_AI_TYPE || data.type === LEGACY_CAMERA_MOTION_TYPE;

/**
 * Người dùng có được xem camera không — cùng điều kiện `canView("Camera")` của
 * màn Camera.
 *
 * BE đang gửi noti camera cho cả tài khoản không có tính năng Camera, nên app tự
 * chặn: đang mở app thì không hiện noti, bấm vào thì chỉ mở app. Chặn ở đây chỉ
 * là lớp phụ — app ở nền hay đã tắt thì OS tự hiện noti, phải để BE lọc người nhận.
 *
 * @returns null khi quyền chưa nạp xong (vừa mở app từ noti) — chưa kết luận được.
 */
export const canViewCameraPush = ({
  permissions,
  loaded,
}: PermissionState): boolean | null =>
  loaded
    ? hasViewPermission(permissions, "Camera", hasFullPermission(permissions))
    : null;

export type CameraAiRouteParams = {
  zoneName?: string;
  cameras: CameraRouteItem[];
  layoutCount: number;
  /** Đánh dấu màn mở từ noti — xem `getCameraAiOpenAction`. */
  fromPush: true;
};

/**
 * Dựng params cho màn live view từ khối `data` của thông báo.
 *
 * `CameraListGrid` chỉ cần iD_Camera_Ma để ghép URL stream, nên một mình payload
 * là đủ — không phải gọi API lấy danh sách camera trước khi mở.
 *
 * @returns null khi BE gửi thiếu/sai ID_Camera hoặc CameraMa — caller chỉ mở app
 * chứ không điều hướng, tuyệt đối không để payload lạ làm crash navigation.
 */
export const buildCameraAiParams = (
  data: Record<string, string>,
): CameraAiRouteParams | null => {
  const cameraId = Number(data.ID_Camera);
  const cameraCode = data.CameraMa?.trim();

  if (!Number.isFinite(cameraId) || cameraId <= 0 || !cameraCode) return null;

  return {
    zoneName: data.ViTri || data.VungCamera || undefined,
    // Lưới 1 ô: thông báo chỉ trỏ tới đúng một camera, để mặc định 4×4 thì hình
    // nằm lọt thỏm góc trên bên trái, phần còn lại là khoảng đen.
    layoutCount: 1,
    cameras: [
      {
        iD_Camera: cameraId,
        iD_Camera_Ma: cameraCode,
        iD_Camera_MoTa: data.CameraTen || cameraCode,
      },
    ],
    fromPush: true,
  };
};

/**
 * Mở live view theo noti mà không phá chỗ người dùng đang đứng.
 *
 * Không dùng `navigate`: đang ở `CameraListGrid` (vd lưới 16 cam) thì navigate
 * thay params của chính màn đó — lưới 16 cam mất, back không về lại được, còn
 * bố cục/trang là state của lưới cũ nên 1 cam nằm lọt góc ô 4×4.
 *
 * - `push`: chồng màn 1 cam lên, back là về đúng chỗ cũ (kể cả lưới 16 cam);
 * - `replace`: đang ở màn mở từ noti của camera khác → thay màn đó, bấm nhiều
 *   noti liên tiếp không chồng thành một dãy phải back qua từng cái;
 * - `stay`: đang xem đúng camera đó từ noti trước → đứng yên.
 */
export const getCameraAiOpenAction = (
  current: { name: string; params?: object } | undefined,
  cameraId: number,
): "push" | "replace" | "stay" => {
  if (current?.name !== CAMERA_AI_ROUTE) return "push";

  const params = current.params as Partial<CameraAiRouteParams> | undefined;
  if (!params?.fromPush) return "push";

  return params.cameras?.[0]?.iD_Camera === cameraId ? "stay" : "replace";
};

/**
 * Khoá gom nhóm thông báo trên thanh trạng thái Android.
 *
 * SERVER KHÔNG CHẶN DỘI: AI service báo bao nhiêu sự kiện thì BE đẩy bấy nhiêu
 * noti (việc gom là do bên AI tự làm). Nên gom nhóm phía app là bắt buộc, không
 * phải tô điểm — một camera có thể dồn nhiều noti liên tiếp.
 *
 * Prefix cố định theo type mới, kể cả với payload legacy, để noti cũ/mới của
 * cùng một camera vẫn nằm chung một nhóm.
 */
export const getCameraAiGroupId = (
  data: Record<string, string>,
): string | undefined =>
  isCameraAiPush(data) && data.ID_Camera
    ? `${CAMERA_AI_TYPE}:${data.ID_Camera}`
    : undefined;
