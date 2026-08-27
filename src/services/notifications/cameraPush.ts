import type { CameraRouteItem } from "../../types";

/** Giá trị `data.type` BE gửi cho thông báo đầu ghi phát hiện chuyển động. */
export const CAMERA_MOTION_TYPE = "CAMERA_MOTION";

/** Route live view mà thông báo chuyển động mở tới. */
export const CAMERA_MOTION_ROUTE = "CameraListGrid";

/**
 * Lọc theo `type` thay vì theo sự có mặt của ID_Camera: sau này còn loại thông
 * báo camera khác (mất kết nối đầu ghi…) dùng chung các khoá này.
 */
export const isCameraMotionPush = (data: Record<string, string>): boolean =>
  data.type === CAMERA_MOTION_TYPE;

/**
 * Dựng params cho màn live view từ khối `data` của thông báo.
 *
 * `CameraListGrid` chỉ cần iD_Camera_Ma để ghép URL stream, nên một mình payload
 * là đủ — không phải gọi API lấy danh sách camera trước khi mở.
 *
 * @returns null khi BE gửi thiếu/sai ID_Camera hoặc CameraMa — caller chỉ mở app
 * chứ không điều hướng, tuyệt đối không để payload lạ làm crash navigation.
 */
export const buildCameraMotionParams = (
  data: Record<string, string>,
): { zoneName?: string; cameras: CameraRouteItem[] } | null => {
  const cameraId = Number(data.ID_Camera);
  const cameraCode = data.CameraMa?.trim();

  if (!Number.isFinite(cameraId) || cameraId <= 0 || !cameraCode) return null;

  return {
    zoneName: data.ViTri || data.VungCamera || undefined,
    cameras: [
      {
        iD_Camera: cameraId,
        iD_Camera_Ma: cameraCode,
        iD_Camera_MoTa: data.CameraTen || cameraCode,
      },
    ],
  };
};

/**
 * Khoá gom nhóm thông báo trên thanh trạng thái Android.
 *
 * Một camera chỉ bắn tối đa 1 noti / 10 giây (server đã chặn dội), nhưng nhiều
 * camera cùng có chuyển động thì vẫn dồn một lúc — gom theo camera cho đỡ rối.
 */
export const getCameraMotionGroupId = (
  data: Record<string, string>,
): string | undefined =>
  isCameraMotionPush(data) && data.ID_Camera
    ? `${CAMERA_MOTION_TYPE}:${data.ID_Camera}`
    : undefined;
