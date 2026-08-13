import { PermissionsAndroid, Platform } from "react-native";

import { warn } from "../Logger";

export type Coordinates = {
  /** Thập phân, dấu chấm — đúng dạng API nội địa nhận ("10.762622"). */
  lat: string;
  lng: string;
  /**
   * Bán kính sai số do thiết bị báo, đơn vị mét. `undefined` khi máy không trả
   * — luồng nào cần độ chính xác đảm bảo thì phải coi đó là "không đạt".
   */
  accuracy?: number;
};

export type CoordinatesOptions = {
  /**
   * Tuổi tối đa của fix được phép tái dùng (ms). Mặc định 30s cho các luồng chỉ
   * ghi kèm toạ độ; luồng ghi mốc toạ độ phải truyền 0 để không nhận fix cũ lấy
   * ở chỗ khác.
   */
  maximumAge?: number;
};

const COORDINATE_PRECISION = 6;
const TIMEOUT_MS = 12000;
const DEFAULT_MAXIMUM_AGE_MS = 30000;

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
        "Ứng dụng cần vị trí thiết bị để ghi nhận toạ độ nơi bạn đang thao tác.",
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
 * bại ở đây chỉ là "không có toạ độ" chứ không được chặn luồng gửi. Luồng nào
 * bắt buộc có toạ độ thì tự chặn khi nhận `null`.
 */
export const getCurrentCoordinates = async (
  options?: CoordinatesOptions,
): Promise<Coordinates | null> => {
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
        (position) => {
          const accuracy = Number(position.coords.accuracy);

          resolve({
            lat: formatCoordinate(position.coords.latitude),
            lng: formatCoordinate(position.coords.longitude),
            accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
          });
        },
        (locationError) => {
          warn("[Location] getCurrentPosition failed", locationError?.message);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: TIMEOUT_MS,
          maximumAge: options?.maximumAge ?? DEFAULT_MAXIMUM_AGE_MS,
        },
      );
    });
  } catch (err) {
    warn("[Location] getCurrentCoordinates failed", err);
    return null;
  }
};
