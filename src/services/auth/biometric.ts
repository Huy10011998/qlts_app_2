import { Platform } from "react-native";
import * as Keychain from "react-native-keychain";
import {
  FACE_ID_LOGIN_SERVICE,
  FACE_ID_MARKER_PASSWORD,
  FACE_ID_MARKER_USERNAME,
} from "../../constants/AuthStorage";
import { readFaceIdEnabled, writeFaceIdEnabled } from "./faceIdFlag";

// Đăng nhập sinh trắc chung cho 2 nền tảng: iOS là Face ID, Android là vân
// tay / khuôn mặt. Sinh trắc chỉ là cổng mở khoá — token vẫn nằm trong Keychain
// không gắn sinh trắc; "marker" `FACE_ID_LOGIN_SERVICE` gắn sinh trắc chỉ để có
// hộp hỏi của hệ thống.
//
// Android: keychain dùng mức BIOMETRIC_STRONG (Class 3). Khuôn mặt bằng camera
// thường (Samsung/Oppo/Xiaomi…) là Class 1–2 nên Android không cho dùng — đa số
// máy thực tế chỉ có vân tay.

export type BiometricKind = "faceid" | "fingerprint" | "face";

export const getBiometricKind = async (): Promise<BiometricKind | null> => {
  try {
    const type = await Keychain.getSupportedBiometryType();
    if (Platform.OS === "ios") {
      return type === Keychain.BIOMETRY_TYPE.FACE_ID ? "faceid" : null;
    }
    // Trả `null` cả khi máy có cảm biến mà chưa cài vân tay / khuôn mặt.
    if (type === Keychain.BIOMETRY_TYPE.FINGERPRINT) return "fingerprint";
    if (
      type === Keychain.BIOMETRY_TYPE.FACE ||
      type === Keychain.BIOMETRY_TYPE.IRIS
    ) {
      return "face";
    }
    return null;
  } catch {
    return null;
  }
};

/** Tên dùng trong câu báo. iOS giữ nguyên chữ "FaceID" như các bản trước. */
export const biometricName = (kind: BiometricKind | null) => {
  if (kind === "fingerprint") return "vân tay";
  if (kind === "face") return "khuôn mặt";
  return "FaceID";
};

const markerOptions = (): Keychain.SetOptions =>
  Platform.OS === "ios"
    ? {
        service: FACE_ID_LOGIN_SERVICE,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      }
    : {
        service: FACE_ID_LOGIN_SERVICE,
        // Không dùng `…_OR_DEVICE_PASSCODE`: androidx không cho ghép
        // BIOMETRIC_STRONG với mã khoá máy khi có crypto trên Android 9–10.
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
        storage: Keychain.STORAGE_TYPE.AES_GCM,
      };

/**
 * Ghi marker gắn sinh trắc. Android hỏi vân tay ngay lúc ghi (khoá Keystore
 * bắt xác thực cả khi mã hoá) nên phải truyền `prompt`; khoá còn hiệu lực
 * 5 giây sau đó nên lần đọc xác nhận ngay sau không hỏi lại.
 */
export const writeBiometricMarker = (
  prompt?: Keychain.AuthenticationPrompt,
) =>
  Keychain.setGenericPassword(
    FACE_ID_MARKER_USERNAME,
    FACE_ID_MARKER_PASSWORD,
    prompt
      ? { ...markerOptions(), authenticationPrompt: prompt }
      : markerOptions(),
  );

/** Đọc marker — hiện hộp hỏi Face ID / vân tay của hệ thống. */
export const readBiometricMarker = (prompt: Keychain.AuthenticationPrompt) =>
  Keychain.getGenericPassword({
    service: FACE_ID_LOGIN_SERVICE,
    ...(Platform.OS === "android"
      ? { accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY }
      : null),
    authenticationPrompt: prompt,
  });

/** Có marker hay không — đọc im lặng, không hiện hộp hỏi. */
export const hasBiometricMarker = async () => {
  try {
    return await Keychain.hasGenericPassword({
      service: FACE_ID_LOGIN_SERVICE,
    });
  } catch {
    return false;
  }
};

export const resetBiometricMarker = () =>
  Keychain.resetGenericPassword({ service: FACE_ID_LOGIN_SERVICE });

/**
 * Đã bật đăng nhập sinh trắc và còn dùng được không. Cờ bật mà máy không còn
 * sinh trắc (xoá hết vân tay, gỡ khoá màn hình) hoặc mất marker thì tắt cờ luôn,
 * để không kẹt ở màn Đăng nhập chờ một hộp hỏi không bao giờ hiện.
 */
export const isBiometricUnlockUsable = async () => {
  if (!(await readFaceIdEnabled())) return false;
  if ((await getBiometricKind()) && (await hasBiometricMarker())) return true;
  await resetBiometricMarker();
  await writeFaceIdEnabled(false);
  return false;
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
