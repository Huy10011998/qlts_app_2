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
let configured = false;

const loadGeolocation = (): GeolocationModule | null => {
  try {
    const geolocation: GeolocationModule = require("@react-native-community/geolocation").default;
    // Android mặc định dùng LocationManager: bật độ chính xác cao là CHỈ GPS —
    // trong nhà chờ hàng chục giây. Dịch vụ vị trí Google (wifi + sóng + GPS)
    // ra toạ độ trong 1–2 giây; máy không có Google thì thư viện tự giữ cách cũ.
    if (!configured && Platform.OS === "android") {
      configured = true;
      geolocation.setRNConfiguration({ locationProvider: "playServices", skipPermissionRequests: true });
    }
    return geolocation;
  } catch (err) {
    warn("[Location] Chưa link được module định vị", err);
    return null;
  }
};

const formatCoordinate = (value: number) =>
  Number(value).toFixed(COORDINATE_PRECISION);

/**
 * Xin cả vị trí chính xác lẫn gần đúng: Android 12+ cho user chọn "Gần đúng" —
 * khi đó chỉ COARSE được cấp; trước đây chỉ hỏi FINE nên bị coi là từ chối.
 */
const requestAndroidPermission = async () => {
  const { ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION } = PermissionsAndroid.PERMISSIONS;
  const result = await PermissionsAndroid.requestMultiple([
    ACCESS_FINE_LOCATION,
    ACCESS_COARSE_LOCATION,
  ]);

  return [ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION].some(
    (permission) => result[permission] === PermissionsAndroid.RESULTS.GRANTED,
  );
};

/**
 * Xin quyền vị trí trước (Android), để luồng mở màn khác ngay sau đó — như
 * camera — không bị hộp thoại xin quyền chen ngang. iOS tự hỏi lúc lấy toạ độ.
 * Trả `false` khi bị từ chối — đừng gọi `getCurrentCoordinates` nữa, nó sẽ hỏi
 * lại lần hai. Không bao giờ ném lỗi.
 */
export const prepareLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== "android") return true;

  try {
    return await requestAndroidPermission();
  } catch (err) {
    warn("[Location] requestPermission failed", err);
    return false;
  }
};

type GeoPosition = { coords: { latitude: number; longitude: number; accuracy?: number | null } };

const toCoordinates = (position: GeoPosition): Coordinates => {
  const accuracy = Number(position.coords.accuracy);
  return {
    lat: formatCoordinate(position.coords.latitude),
    lng: formatCoordinate(position.coords.longitude),
    accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
  };
};

/** Mã lỗi PERMISSION_DENIED của geolocation — không cần chờ thêm. */
const PERMISSION_DENIED = 1;

/**
 * Android (dịch vụ vị trí Google): `getCurrentPosition` của thư viện báo lỗi
 * NGAY khi Google tạm báo "chưa có vị trí" — chuyện thường gặp vài trăm ms đầu,
 * nhất là trong nhà — và không có timeout thật. Nên theo dõi vị trí, lấy toạ
 * độ THẬT đầu tiên, bỏ qua các báo tạm đó; quá TIMEOUT_MS thì thôi.
 */
const watchFirstPosition = (geolocation: GeolocationModule, maximumAge: number) =>
  new Promise<Coordinates | null>((resolve) => {
    let watchId: number | null = null;
    let done = false;
    const finish = (value: Coordinates | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (watchId != null) geolocation.clearWatch(watchId);
      resolve(value);
    };
    const timer = setTimeout(() => {
      warn("[Location] Quá giờ chờ toạ độ");
      finish(null);
    }, TIMEOUT_MS);

    watchId = geolocation.watchPosition(
      (position) => finish(toCoordinates(position)),
      (locationError) => {
        if (locationError?.code === PERMISSION_DENIED) finish(null);
        else warn("[Location] Chưa có toạ độ, chờ tiếp", locationError?.message);
      },
      { enableHighAccuracy: true, maximumAge, interval: 1000, fastestInterval: 500, distanceFilter: 0 },
    );
    // Lỡ kết thúc trước khi có watchId thì dọn lại.
    if (done) geolocation.clearWatch(watchId);
  });

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

    const maximumAge = options?.maximumAge ?? DEFAULT_MAXIMUM_AGE_MS;
    return await (Platform.OS === "android"
      ? watchFirstPosition(geolocation, maximumAge)
      : new Promise<Coordinates | null>((resolve) => {
          geolocation.getCurrentPosition(
            (position) => resolve(toCoordinates(position)),
            (locationError) => {
              warn("[Location] getCurrentPosition failed", locationError?.message);
              resolve(null);
            },
            { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge },
          );
        }));
  } catch (err) {
    warn("[Location] getCurrentCoordinates failed", err);
    return null;
  }
};
