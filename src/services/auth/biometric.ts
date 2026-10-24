import { NativeModules, Platform } from "react-native";
import * as Keychain from "react-native-keychain";
import {
  DEVICE_LOCK_ENABLED_SERVICE,
  FACE_ID_LOGIN_SERVICE,
  FACE_ID_MARKER_PASSWORD,
  FACE_ID_MARKER_USERNAME,
} from "../../constants/AuthStorage";
import { readFaceIdEnabled, writeFaceIdEnabled } from "./faceIdFlag";

// Đăng nhập sinh trắc chung cho 2 nền tảng: iOS là Face ID, Android là vân
// tay / khuôn mặt. Sinh trắc chỉ là cổng mở khoá — token vẫn nằm trong Keychain
// không gắn sinh trắc.
//
// iOS: "marker" `FACE_ID_LOGIN_SERVICE` gắn Face ID chỉ để có hộp hỏi của hệ
// thống.
//
// Android: hỏi thẳng qua module `BiometricGate` (BiometricGateModule.kt), mức
// BIOMETRIC_WEAK nên nhận cả khuôn mặt Class 2 của Samsung/Oppo/Xiaomi — đi qua
// keychain thì Keystore chỉ nhận Class 3, tức gần như chỉ vân tay. Không còn
// marker; marker cũ (bản thử 22–23/10) chỉ còn được xoá khi tắt / đăng xuất.
//
// Android còn cho mở bằng khoá màn hình (mẫu hình / mã PIN / mật khẩu máy),
// bật riêng trong Cài đặt. Bật cả hai thì hộp hỏi nhận cách nào cũng được.

/**
 * Android "fingerprint-face": máy có cả vân tay lẫn khuôn mặt, không biết người
 * dùng cài cái nào — hộp hỏi của hệ thống tự nhận cái đã cài.
 */
export type BiometricKind = "faceid" | "fingerprint" | "face" | "fingerprint-face";

type BiometricGateModule = {
  getBiometricKind(): Promise<Exclude<BiometricKind, "faceid"> | null>;
  authenticate(
    options: Keychain.AuthenticationPrompt & UnlockMethods,
  ): Promise<true>;
};

// Đọc lúc gọi (không giữ hằng lúc nạp file) để test gắn mock được.
const biometricGate = (): BiometricGateModule => NativeModules.BiometricGate;

export const getBiometricKind = async (): Promise<BiometricKind | null> => {
  try {
    if (Platform.OS === "ios") {
      const type = await Keychain.getSupportedBiometryType();
      return type === Keychain.BIOMETRY_TYPE.FACE_ID ? "faceid" : null;
    }
    // Trả `null` cả khi máy có cảm biến mà chưa cài vân tay / khuôn mặt.
    return (await biometricGate().getBiometricKind()) ?? null;
  } catch {
    return null;
  }
};

/**
 * Android có khoá màn hình dùng được để mở app. Chỉ từ Android 11 — bản 9–10
 * hỏng khi ghép vân tay với khoá máy nên thư viện luôn trả `false`.
 */
export const isDeviceLockAvailable = async () => {
  if (Platform.OS !== "android") return false;
  try {
    return await Keychain.isPasscodeAuthAvailable();
  } catch {
    return false;
  }
};

/** Android: các cách mở khoá app. iOS chỉ có Face ID nên không dùng. */
export type UnlockMethods = { biometric: boolean; deviceLock: boolean };

export const NO_UNLOCK_METHODS: UnlockMethods = {
  biometric: false,
  deviceLock: false,
};

const BIOMETRIC_ONLY: UnlockMethods = { biometric: true, deviceLock: false };

export const hasUnlockMethod = (methods: UnlockMethods) =>
  methods.biometric || methods.deviceLock;

/** Tên dùng trong câu báo. iOS giữ nguyên chữ "FaceID" như các bản trước. */
export const biometricName = (kind: BiometricKind | null) => {
  if (kind === "fingerprint") return "vân tay";
  if (kind === "face") return "khuôn mặt";
  if (kind === "fingerprint-face") return "vân tay / khuôn mặt";
  return "FaceID";
};

/** Icon MaterialCommunityIcons. Máy có cả hai thì dùng icon vân tay. */
export const biometricIcon = (kind: BiometricKind | null) =>
  kind === "fingerprint" || kind === "fingerprint-face"
    ? "fingerprint"
    : "face-recognition";

/** Android: tên các cách mở khoá ghép lại, vd "vân tay hoặc khoá màn hình". */
export const unlockMethodName = (
  methods: UnlockMethods,
  kind: BiometricKind | null,
) =>
  [
    methods.biometric ? biometricName(kind) : null,
    methods.deviceLock ? "khoá màn hình" : null,
  ]
    .filter(Boolean)
    .join(" hoặc ");

export const readDeviceLockEnabled = async () => {
  if (Platform.OS !== "android") return false;
  try {
    const credentials = await Keychain.getGenericPassword({
      service: DEVICE_LOCK_ENABLED_SERVICE,
    });
    return !!credentials && credentials.password === "1";
  } catch {
    return false;
  }
};

export const writeDeviceLockEnabled = async (enabled: boolean) => {
  if (Platform.OS !== "android") return;
  if (enabled) {
    await Keychain.setGenericPassword("device-lock", "1", {
      service: DEVICE_LOCK_ENABLED_SERVICE,
    });
  } else {
    await Keychain.resetGenericPassword({
      service: DEVICE_LOCK_ENABLED_SERVICE,
    });
  }
};

/** iOS: ghi marker gắn Face ID (ghi không hỏi, chỉ hỏi lúc đọc). */
export const writeBiometricMarker = () =>
  Keychain.setGenericPassword(FACE_ID_MARKER_USERNAME, FACE_ID_MARKER_PASSWORD, {
    service: FACE_ID_LOGIN_SERVICE,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
    accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
  });

/**
 * Hiện hộp hỏi Face ID / vân tay / khuôn mặt / khoá màn hình của hệ thống.
 * `true` là đã xác thực; huỷ hay lỗi thì ném lỗi (đọc bằng
 * `classifyBiometricError`). iOS: đọc marker, `false` khi mất marker. Android:
 * `methods` là cách hộp hỏi nhận.
 */
export const promptUnlock = async (
  prompt: Keychain.AuthenticationPrompt,
  methods: UnlockMethods = BIOMETRIC_ONLY,
): Promise<boolean> => {
  if (Platform.OS === "android") {
    return biometricGate().authenticate({ ...prompt, ...methods });
  }
  return !!(await Keychain.getGenericPassword({
    service: FACE_ID_LOGIN_SERVICE,
    authenticationPrompt: prompt,
  }));
};

export const resetBiometricMarker = () =>
  Keychain.resetGenericPassword({ service: FACE_ID_LOGIN_SERVICE });

/**
 * Android: cách mở khoá đã bật và còn dùng được. Bật mà máy không còn dùng
 * được (xoá hết vân tay / khuôn mặt, gỡ khoá màn hình) thì tắt luôn, để không
 * kẹt ở màn Đăng nhập chờ một hộp hỏi không bao giờ hiện.
 */
export const getUsableUnlockMethods = async (): Promise<UnlockMethods> => {
  const [biometricOn, deviceLockOn] = await Promise.all([
    readFaceIdEnabled(),
    readDeviceLockEnabled(),
  ]);
  if (!biometricOn && !deviceLockOn) return NO_UNLOCK_METHODS;

  const methods = {
    biometric: biometricOn && !!(await getBiometricKind()),
    deviceLock: deviceLockOn && (await isDeviceLockAvailable()),
  };
  if (biometricOn && !methods.biometric) await writeFaceIdEnabled(false);
  if (deviceLockOn && !methods.deviceLock) await writeDeviceLockEnabled(false);
  return methods;
};

export type BiometricErrorKind = "cancel" | "lockout" | "invalidated" | "other";

// Mã lỗi BiometricPrompt; keychain Android báo lỗi dạng "code: 13, msg: …".
const ANDROID_CANCEL_CODES = [5, 10, 13]; // hệ thống huỷ, người dùng huỷ, nút phụ
const ANDROID_LOCKOUT_CODES = [7, 9]; // sai quá nhiều lần (tạm / tới khi mở khoá máy)
const ANDROID_INVALIDATED_CODES = [11, 12, 14]; // chưa cài sinh trắc, không có cảm biến, không có khoá màn hình

export const classifyBiometricError = (err: any): BiometricErrorKind => {
  const code = err?.code;
  const message = String(err?.message ?? "");
  const normalizedMessage = message.toLowerCase();

  if (
    code === -128 ||
    code === "-128" ||
    normalizedMessage.includes("cancel") ||
    message.includes("UserCancel") ||
    err?.name === "LAErrorUserCancel"
  ) {
    return "cancel";
  }

  if (Platform.OS !== "android") return "other";

  const androidCode = Number(/code:\s*(-?\d+)/.exec(message)?.[1]);
  if (ANDROID_CANCEL_CODES.includes(androidCode)) return "cancel";
  if (ANDROID_LOCKOUT_CODES.includes(androidCode)) return "lockout";
  if (
    ANDROID_INVALIDATED_CODES.includes(androidCode) ||
    normalizedMessage.includes("invalidated")
  ) {
    return "invalidated";
  }
  return "other";
};
