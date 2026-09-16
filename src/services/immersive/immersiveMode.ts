import { AppState, NativeModules, Platform } from "react-native";

type ImmersiveModeNativeModule = {
  enable: () => void;
  disable: () => void;
};

const nativeModule: ImmersiveModeNativeModule | undefined =
  NativeModules.ImmersiveMode;

/**
 * Số màn đang yêu cầu ẩn thanh hệ thống.
 *
 * Đếm chứ không dùng cờ bật/tắt vì hai chế độ toàn màn hình có thể chồng nhau:
 * ở CameraListGrid, mở 1 camera từ lưới đang toàn màn hình thì lưới vẫn còn
 * đang yêu cầu ẩn. Dùng cờ thì lượt tắt của màn đóng trước sẽ kéo thanh hệ
 * thống hiện trở lại ngay giữa lúc màn kia vẫn toàn màn hình.
 */
let activeRequests = 0;

/** Chỉ Android cần: iOS không có navigation bar để ẩn. */
const isSupported = Platform.OS === "android";

/**
 * Áp lại trạng thái ẩn mỗi lần app trở lại foreground.
 *
 * Phía native cũng tự áp lại ở `onHostResume`, nhưng cờ `isEnabled` của nó bị
 * xoá khi Activity bị hủy (`onHostDestroy`) trong khi bộ đếm bên JS vẫn còn —
 * ca này gặp khi bật "Don't keep activities" hoặc app bị thu hồi Activity lúc
 * chạy nền. Không có nhịp áp lại ở đây thì lượt quay lại kế tiếp mở fullscreen
 * mà thanh hệ thống vẫn hiện, vì bộ đếm > 0 nên `enableImmersiveMode` bỏ qua.
 *
 * Gọi thẳng `nativeModule.enable()` chứ không qua bộ đếm: lệnh này idempotent,
 * và mọi thay đổi bộ đếm phải đến từ cặp enable/disable của màn hình.
 */
if (isSupported) {
  AppState.addEventListener("change", (state) => {
    if (state === "active" && activeRequests > 0) nativeModule?.enable();
  });
}

export const enableImmersiveMode = () => {
  if (!isSupported) return;

  activeRequests += 1;
  if (activeRequests === 1) nativeModule?.enable();
};

export const disableImmersiveMode = () => {
  if (!isSupported) return;
  if (activeRequests === 0) return;

  activeRequests -= 1;
  if (activeRequests === 0) nativeModule?.disable();
};

/**
 * Ép hiện lại thanh hệ thống và xoá bộ đếm. Dùng ở cleanup lúc rời hẳn màn
 * camera, để một lượt unmount bất thường không làm app kẹt ở trạng thái ẩn.
 */
export const resetImmersiveMode = () => {
  if (!isSupported) return;

  activeRequests = 0;
  nativeModule?.disable();
};
