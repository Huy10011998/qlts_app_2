import React from "react";
import { NativeModules, Platform } from "react-native";
import * as Keychain from "react-native-keychain";
import ReactTestRenderer from "react-test-renderer";

import { DEVICE_LOCK_ENABLED_SERVICE } from "../src/constants/AuthStorage";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { canAccessAppNavigator } from "../src/navigation/shared/rootNavigationHelpers";
import { classifyBiometricError } from "../src/services/auth/biometric";
import type { AuthContextType } from "../src/types/context.d";

const mockReadStoredAuthTokens = jest.fn();
const mockReadFaceIdEnabled = jest.fn();
const mockWriteFaceIdEnabled = jest.fn();

jest.mock("../src/context/authStorage", () => ({
  AUTH_TOKEN_KEY: "token",
  AUTH_REFRESH_TOKEN_KEY: "refreshToken",
  readStoredAuthTokens: () => mockReadStoredAuthTokens(),
  clearStoredAuthTokens: jest.fn(async () => {}),
  clearStoredFaceIdData: jest.fn(async () => {}),
  writeStoredAuthValue: jest.fn(async () => {}),
}));

jest.mock("../src/services/auth/faceIdFlag", () => ({
  readFaceIdEnabled: () => mockReadFaceIdEnabled(),
  writeFaceIdEnabled: (value: boolean) => mockWriteFaceIdEnabled(value),
}));

jest.mock("../src/services/data/callApi", () => ({
  hardResetApi: jest.fn(),
  setOnAuthLogout: jest.fn(),
  setTokenInApi: jest.fn(),
  setRefreshInApi: jest.fn(),
  resetAuthState: jest.fn(),
}));

const getBiometricKind = NativeModules.BiometricGate
  .getBiometricKind as jest.Mock;
const hasGenericPassword = Keychain.hasGenericPassword as jest.Mock;
const getGenericPassword = Keychain.getGenericPassword as jest.Mock;
const resetGenericPassword = Keychain.resetGenericPassword as jest.Mock;
const isPasscodeAuthAvailable = Keychain.isPasscodeAuthAvailable as jest.Mock;

/** Cờ "Đăng nhập bằng khoá màn hình" đọc từ Keychain. */
const setDeviceLockFlag = (on: boolean) =>
  getGenericPassword.mockImplementation(async (options) =>
    on && options?.service === DEVICE_LOCK_ENABLED_SERVICE
      ? { service: DEVICE_LOCK_ENABLED_SERVICE, username: "x", password: "1" }
      : false,
  );

/** Platform.OS là hằng đọc-chỉ nên phải ghi đè qua defineProperty. */
const setPlatform = (os: "ios" | "android") => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
};

const bootstrap = async () => {
  let auth: AuthContextType | undefined;
  const Probe = () => {
    auth = useAuth();
    return null;
  };

  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
  });

  return auth!;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => {});
  setPlatform("android");
  mockReadStoredAuthTokens.mockResolvedValue({
    token: "access",
    refreshToken: "refresh",
  });
  mockReadFaceIdEnabled.mockResolvedValue(false);
  getBiometricKind.mockResolvedValue("fingerprint");
  hasGenericPassword.mockResolvedValue(false);
  isPasscodeAuthAvailable.mockResolvedValue(false);
  setDeviceLockFlag(false);
});

afterEach(() => {
  jest.restoreAllMocks();
  setPlatform("ios");
});

describe("Khởi động Android", () => {
  it("chưa bật vân tay thì vào thẳng như trước", async () => {
    const auth = await bootstrap();

    expect(auth.authReady).toBe(true);
    expect(auth.sessionUnlocked).toBe(true);
    expect(canAccessAppNavigator(auth)).toBe(true);
  });

  it("đã bật vân tay thì khoá, chờ màn Đăng nhập hỏi", async () => {
    mockReadFaceIdEnabled.mockResolvedValue(true);

    const auth = await bootstrap();

    expect(auth.authReady).toBe(true);
    expect(auth.sessionUnlocked).toBe(false);
    expect(canAccessAppNavigator(auth)).toBe(false);
  });

  it("khuôn mặt Class 2 (Samsung) đã bật thì cũng khoá, không cần marker", async () => {
    mockReadFaceIdEnabled.mockResolvedValue(true);
    getBiometricKind.mockResolvedValue("face");

    const auth = await bootstrap();

    expect(auth.sessionUnlocked).toBe(false);
    expect(hasGenericPassword).not.toHaveBeenCalled();
    expect(mockWriteFaceIdEnabled).not.toHaveBeenCalled();
  });

  it("bật mà máy đã xoá hết vân tay / khuôn mặt thì tắt cờ và vào thẳng", async () => {
    mockReadFaceIdEnabled.mockResolvedValue(true);
    getBiometricKind.mockResolvedValue(null);

    const auth = await bootstrap();

    expect(auth.sessionUnlocked).toBe(true);
    expect(mockWriteFaceIdEnabled).toHaveBeenCalledWith(false);
  });

  it("chỉ bật khoá màn hình (máy không có vân tay) thì cũng khoá", async () => {
    getBiometricKind.mockResolvedValue(null);
    isPasscodeAuthAvailable.mockResolvedValue(true);
    setDeviceLockFlag(true);

    const auth = await bootstrap();

    expect(auth.sessionUnlocked).toBe(false);
    expect(canAccessAppNavigator(auth)).toBe(false);
  });

  it("bật khoá màn hình mà máy đã gỡ khoá màn hình thì tắt cờ và vào thẳng", async () => {
    setDeviceLockFlag(true);

    const auth = await bootstrap();

    expect(auth.sessionUnlocked).toBe(true);
    expect(resetGenericPassword).toHaveBeenCalledWith({
      service: DEVICE_LOCK_ENABLED_SERVICE,
    });
  });

  it("iOS vẫn luôn chờ Face ID hoặc mật khẩu", async () => {
    setPlatform("ios");

    const auth = await bootstrap();

    expect(auth.sessionUnlocked).toBe(false);
    expect(canAccessAppNavigator(auth)).toBe(false);
  });
});

describe("classifyBiometricError", () => {
  const androidError = (code: number) => ({
    code: "E_CRYPTO_FAILED",
    message: `code: ${code}, msg: lỗi`,
  });

  it("nhận ra huỷ / nút Dùng mật khẩu trên Android", () => {
    expect(classifyBiometricError(androidError(10))).toBe("cancel");
    expect(classifyBiometricError(androidError(13))).toBe("cancel");
    expect(classifyBiometricError(androidError(5))).toBe("cancel");
  });

  it("nhận ra bị khoá do thử sai quá nhiều lần", () => {
    expect(classifyBiometricError(androidError(7))).toBe("lockout");
    expect(classifyBiometricError(androidError(9))).toBe("lockout");
  });

  it("nhận ra máy đã đổi / xoá sinh trắc", () => {
    expect(classifyBiometricError(androidError(11))).toBe("invalidated");
    expect(
      classifyBiometricError({ message: "Key permanently invalidated" }),
    ).toBe("invalidated");
  });

  it("lỗi mạng không bị nhầm thành lỗi sinh trắc", () => {
    expect(
      classifyBiometricError({
        message: "Request failed with status code 401",
        response: { status: 401 },
      }),
    ).toBe("other");
  });

  it("iOS giữ cách nhận ra huỷ như cũ, không đọc mã Android", () => {
    setPlatform("ios");
    expect(classifyBiometricError({ code: -128 })).toBe("cancel");
    expect(classifyBiometricError(androidError(7))).toBe("other");
  });
});
