import { PermissionsAndroid, Platform } from "react-native";

import { warn } from "../Logger";

export type Coordinates = {
  /** Thập phân, dấu chấm — đúng dạng API nội địa nhận ("10.762622"). */
  lat: string;
  lng: string;
};

const COORDINATE_PRECISION = 6;
const TIMEOUT_MS = 12000;

type GeolocationModule = typeof import("@react-native-community/geolocation").default;

/**
 * Nạp thư viện định vị ngay lúc gọi, không phải lúc import file này.
 *
 * `@react-native-community/geolocation` dựng NativeEventEmitter ở top-level, nên
 * chỉ cần `import` là nó ném lỗi "doesn't seem to be linked" khi app chưa build
 * lại phần native — đỏ nguyên màn dù chức năng chỉ cần toạ độ để ghi kèm. Nạp
 * trễ thì máy chưa build lại vẫn dùng được, chỉ là không có toạ độ.
 */
const loadGeolocation = (): GeolocationModule | null => {
  try {
    return require("@react-native-community/geolocation").default;
  } catch (err) {
    warn("[Location] Chưa link được module định vị", err);
    return null;
  }
};

const formatCoordinate = (value: number) =>
  Number(value).toFixed(COORDINATE_PRECISION);

const requestAndroidPermission = async () => {
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: "Quyền truy cập vị trí",
      message:
        "Ứng dụng cần vị trí thiết bị để ghi nhận toạ độ nơi chụp ảnh xác nhận.",
      buttonPositive: "Đồng ý",
      buttonNegative: "Từ chối",
    },
  );

  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

/**
 * Toạ độ hiện tại của thiết bị, hoặc `null` nếu không lấy được.
 *
 * Cố tình KHÔNG bao giờ ném lỗi: theo nghiệp vụ xác nhận vị trí, user tắt định
 * vị hay từ chối quyền thì vẫn gửi được (API nhận LAT/LNG rỗng), nên mọi thất
 * bại ở đây chỉ là "không có toạ độ" chứ không được chặn luồng gửi.
 */
export const getCurrentCoordinates = async (): Promise<Coordinates | null> => {
  try {
    const geolocation = loadGeolocation();
    if (!geolocation) return null;

    if (Platform.OS === "android") {
      const hasPermission = await requestAndroidPermission();
      if (!hasPermission) return null;
    } else {
      geolocation.requestAuthorization();
    }

    return await new Promise<Coordinates | null>((resolve) => {
      geolocation.getCurrentPosition(
        (position) =>
          resolve({
            lat: formatCoordinate(position.coords.latitude),
            lng: formatCoordinate(position.coords.longitude),
          }),
        (locationError) => {
          warn("[Location] getCurrentPosition failed", locationError?.message);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: TIMEOUT_MS,
          maximumAge: 30000,
        },
      );
    });
  } catch (err) {
    warn("[Location] getCurrentCoordinates failed", err);
    return null;
  }
};
