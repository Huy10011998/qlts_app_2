import React from "react";
import {
  Alert,
  AppState,
  NativeModules,
  Platform,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Keychain from "react-native-keychain";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import {
  DEVICE_LOCK_ENABLED_SERVICE,
  FACE_ID_LOGIN_SERVICE,
} from "../src/constants/AuthStorage";
// jest.mock bên dưới được babel-jest đẩy lên trên các import này.
import LoginScreen from "../src/screens/Auth/LoginScreen";

const mockReadFaceIdEnabled = jest.fn();
const mockReadStoredAuthTokens = jest.fn();
const mockReadStoredAuthUsername = jest.fn();
const mockReadStoredLocalNetworkPermission = jest.fn();
const mockRefreshStoredLocalNetworkPermission = jest.fn();
const mockCheckServerReachability = jest.fn();

jest.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    setToken: jest.fn(),
    setRefreshToken: jest.fn(),
    setSessionUnlocked: jest.fn(),
    syncSession: jest.fn(),
    token: null,
  }),
}));

jest.mock("../src/services/auth/faceIdFlag", () => ({
  readFaceIdEnabled: () => mockReadFaceIdEnabled(),
  writeFaceIdEnabled: jest.fn(async () => {}),
}));

jest.mock("../src/context/authStorage", () => ({
  readStoredAuthTokens: () => mockReadStoredAuthTokens(),
  readStoredAuthUsername: () => mockReadStoredAuthUsername(),
  writeStoredAuthUsername: jest.fn(),
}));

jest.mock("../src/services/localNetworkPermission", () => ({
  getLocalNetworkPermissionLabel: (status: string) =>
    status === "granted"
      ? "Đã cấp quyền"
      : status === "denied"
      ? "Chưa cấp quyền"
      : "Chưa xác định",
  readStoredLocalNetworkPermission: () =>
    mockReadStoredLocalNetworkPermission(),
  refreshStoredLocalNetworkPermission: () =>
    mockRefreshStoredLocalNetworkPermission(),
  requestLocalNetworkPermission: jest.fn(async () => "granted"),
}));

jest.mock("../src/services/network/reachability", () => ({
  checkServerReachability: () => mockCheckServerReachability(),
  SERVER_UNAVAILABLE_MESSAGE: "Không kết nối được máy chủ",
}));

jest.mock("../src/services/auth/authApi", () => ({ loginApi: jest.fn() }));

jest.mock("../src/services/data/callApi", () => ({
  hardResetApi: jest.fn(),
  refreshTokenFlow: jest.fn(),
  setRefreshInApi: jest.fn(),
  shouldRefreshAccessToken: jest.fn(() => false),
}));

const getGenericPassword = Keychain.getGenericPassword as jest.Mock;
const getBiometricKind = NativeModules.BiometricGate
  .getBiometricKind as jest.Mock;
const authenticate = NativeModules.BiometricGate.authenticate as jest.Mock;
const isPasscodeAuthAvailable = Keychain.isPasscodeAuthAvailable as jest.Mock;

/** Platform.OS là hằng đọc-chỉ nên phải ghi đè qua defineProperty. */
const setPlatform = (os: "ios" | "android") => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
};

const setup = ({
  faceIdEnabled,
  tokens,
  localNetwork = "granted",
}: {
  faceIdEnabled: boolean;
  tokens: { token: string | null; refreshToken: string | null };
  localNetwork?: "granted" | "denied";
}) => {
  mockReadFaceIdEnabled.mockResolvedValue(faceIdEnabled);
  mockReadStoredAuthTokens.mockResolvedValue(tokens);
  const state = {
    hasShownNotice: true,
    hasRequestedPermission: true,
    status: localNetwork,
  };
  mockReadStoredLocalNetworkPermission.mockResolvedValue(state);
  mockRefreshStoredLocalNetworkPermission.mockResolvedValue(state);
};

const render = async () => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <ThemeProvider>
          <LoginScreen />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });

  return tree!;
};

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat()
    .filter((child) => typeof child === "string");

/* Nút Face ID chỉ có icon (không có chữ), tìm theo nhãn trợ năng. Luôn hiện
   trên iOS; chưa bật Face ID thì mờ đi chứ không ẩn. */
const faceIdButton = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(
    (node) =>
      typeof node.type !== "string" &&
      node.props.accessibilityLabel === "Đăng nhập bằng Face ID",
  )[0];

const isDimmed = (tree: ReactTestRenderer.ReactTestRenderer) =>
  (StyleSheet.flatten(faceIdButton(tree)?.props.style)?.opacity ?? 1) < 1;

const faceIdPromptCalls = () =>
  getGenericPassword.mock.calls.filter(
    ([options]) =>
      options?.service === FACE_ID_LOGIN_SERVICE &&
      options?.authenticationPrompt,
  );

beforeEach(() => {
  jest.clearAllMocks();
  setPlatform("ios");
  (AppState as any).currentState = "active";
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
  getGenericPassword.mockResolvedValue(false);
  mockReadStoredAuthUsername.mockResolvedValue(null);
  // Chặn ở bước kiểm máy chủ: đủ để biết luồng Face ID đã chạy mà không phải
  // giả lập cả phần khôi phục phiên.
  mockCheckServerReachability.mockResolvedValue({ canReachServer: false });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("LoginScreen – Face ID", () => {
  it("tự hỏi Face ID một lần khi đã bật và còn phiên", async () => {
    setup({
      faceIdEnabled: true,
      tokens: { token: "access", refreshToken: "refresh" },
    });

    const tree = await render();

    expect(mockCheckServerReachability).toHaveBeenCalledTimes(1);
    expect(faceIdButton(tree)).toBeTruthy();
  });

  // Hết phiên (EXPIRED) giữ cờ Face ID nhưng token đã bị xoá.
  it("không tự hỏi khi không còn token", async () => {
    setup({
      faceIdEnabled: true,
      tokens: { token: null, refreshToken: null },
    });

    const tree = await render();

    expect(mockCheckServerReachability).not.toHaveBeenCalled();
    expect(faceIdPromptCalls()).toHaveLength(0);
    // Nút vẫn hiện để người dùng tự bấm.
    expect(faceIdButton(tree)).toBeTruthy();
  });

  // Đăng xuất chủ động: `logout()` xoá luôn cờ Face ID.
  it("nút mờ và không tự hỏi khi chưa bật Face ID", async () => {
    setup({
      faceIdEnabled: false,
      tokens: { token: "access", refreshToken: "refresh" },
    });

    const tree = await render();

    expect(mockCheckServerReachability).not.toHaveBeenCalled();
    expect(faceIdButton(tree)).toBeTruthy();
    expect(isDimmed(tree)).toBe(true);
  });

  it("đợi app active rồi mới hỏi", async () => {
    (AppState as any).currentState = "background";
    const listeners: ((state: string) => void)[] = [];
    (AppState.addEventListener as jest.Mock).mockImplementation(
      (_event: string, listener: (state: string) => void) => {
        listeners.push(listener);
        return { remove: jest.fn() };
      },
    );
    setup({
      faceIdEnabled: true,
      tokens: { token: "access", refreshToken: null },
    });

    await render();
    expect(mockCheckServerReachability).not.toHaveBeenCalled();

    await ReactTestRenderer.act(async () => {
      listeners.forEach((listener) => listener("active"));
    });
    expect(mockCheckServerReachability).toHaveBeenCalledTimes(1);
  });
});

/* Android: nút vân tay cùng ô với nút Face ID, chỉ hiện khi máy có sinh trắc. */
describe("LoginScreen – vân tay Android", () => {
  const fingerprintButton = (tree: ReactTestRenderer.ReactTestRenderer) =>
    tree.root.findAll(
      (node) =>
        typeof node.type !== "string" &&
        node.props.accessibilityLabel === "Đăng nhập bằng vân tay",
    )[0];

  beforeEach(() => {
    setPlatform("android");
    getBiometricKind.mockResolvedValue("fingerprint");
    isPasscodeAuthAvailable.mockResolvedValue(false);
    // Bấm "Dùng mật khẩu": dừng ngay sau hộp hỏi, đủ để xem hộp nhận gì.
    authenticate.mockRejectedValue(new Error("code: 13, msg: Dùng mật khẩu"));
  });

  const buttonLabelled = (
    tree: ReactTestRenderer.ReactTestRenderer,
    label: string,
  ) =>
    tree.root.findAll(
      (node) =>
        typeof node.type !== "string" &&
        node.props.accessibilityLabel === label,
    )[0];

  const press = async (button: ReactTestRenderer.ReactTestInstance) => {
    await ReactTestRenderer.act(async () => {
      await button.props.onPress();
    });
  };

  /** Cờ "Đăng nhập bằng khoá màn hình" đọc từ Keychain; marker thì không có. */
  const setDeviceLockFlag = (on: boolean) =>
    getGenericPassword.mockImplementation(async (options) =>
      on && options?.service === DEVICE_LOCK_ENABLED_SERVICE
        ? { service: DEVICE_LOCK_ENABLED_SERVICE, username: "x", password: "1" }
        : false,
    );

  it("máy chỉ có khoá màn hình vẫn hiện nút, mờ khi chưa bật", async () => {
    getBiometricKind.mockResolvedValue(null);
    isPasscodeAuthAvailable.mockResolvedValue(true);
    setup({
      faceIdEnabled: false,
      tokens: { token: "access", refreshToken: "refresh" },
    });

    const tree = await render();
    const button = buttonLabelled(tree, "Đăng nhập bằng khoá màn hình");

    expect(button).toBeTruthy();
    expect(StyleSheet.flatten(button.props.style)?.opacity).toBeLessThan(1);
    expect(mockCheckServerReachability).not.toHaveBeenCalled();
  });

  it("chỉ bật khoá màn hình thì hộp hỏi chỉ nhận khoá máy", async () => {
    getBiometricKind.mockResolvedValue(null);
    isPasscodeAuthAvailable.mockResolvedValue(true);
    mockCheckServerReachability.mockResolvedValue({ canReachServer: true });
    setup({
      faceIdEnabled: false,
      tokens: { token: "access", refreshToken: "refresh" },
    });
    setDeviceLockFlag(true);

    const tree = await render();
    await press(buttonLabelled(tree, "Đăng nhập bằng khoá màn hình"));

    // Lần 1 tự hỏi lúc mở, lần 2 do bấm nút.
    expect(authenticate).toHaveBeenCalledTimes(2);
    expect(authenticate.mock.calls[1][0]).toMatchObject({
      biometric: false,
      deviceLock: true,
    });
    expect(faceIdPromptCalls()).toHaveLength(0);
  });

  it("bật cả vân tay lẫn khoá màn hình thì hộp hỏi nhận cả hai", async () => {
    isPasscodeAuthAvailable.mockResolvedValue(true);
    mockCheckServerReachability.mockResolvedValue({ canReachServer: true });
    setup({
      faceIdEnabled: true,
      tokens: { token: "access", refreshToken: "refresh" },
    });
    setDeviceLockFlag(true);

    const tree = await render();
    await press(
      buttonLabelled(tree, "Đăng nhập bằng vân tay hoặc khoá màn hình"),
    );

    expect(authenticate.mock.calls[0][0]).toMatchObject({
      biometric: true,
      deviceLock: true,
    });
  });

  it("chỉ bật vân tay thì hộp hỏi chỉ nhận vân tay", async () => {
    isPasscodeAuthAvailable.mockResolvedValue(true);
    mockCheckServerReachability.mockResolvedValue({ canReachServer: true });
    setup({
      faceIdEnabled: true,
      tokens: { token: "access", refreshToken: "refresh" },
    });

    const tree = await render();
    await press(fingerprintButton(tree));

    expect(authenticate.mock.calls[0][0]).toMatchObject({
      biometric: true,
      deviceLock: false,
    });
  });

  it("máy chỉ cài khuôn mặt (Samsung) thì nút là khuôn mặt, hộp hỏi nhận sinh trắc", async () => {
    getBiometricKind.mockResolvedValue("face");
    mockCheckServerReachability.mockResolvedValue({ canReachServer: true });
    setup({
      faceIdEnabled: true,
      tokens: { token: "access", refreshToken: "refresh" },
    });

    const tree = await render();
    const button = buttonLabelled(tree, "Đăng nhập bằng khuôn mặt");
    expect(button).toBeTruthy();

    await press(button);
    expect(authenticate.mock.calls[0][0]).toMatchObject({
      subtitle: "Dùng khuôn mặt để mở ứng dụng",
      biometric: true,
    });
  });

  it("máy có cả vân tay lẫn khuôn mặt thì gọi chung", async () => {
    getBiometricKind.mockResolvedValue("fingerprint-face");
    isPasscodeAuthAvailable.mockResolvedValue(true);
    setup({
      faceIdEnabled: false,
      tokens: { token: "access", refreshToken: "refresh" },
    });

    const tree = await render();

    expect(
      buttonLabelled(
        tree,
        "Đăng nhập bằng vân tay / khuôn mặt hoặc khoá màn hình",
      ),
    ).toBeTruthy();
  });

  it("ẩn nút khi máy không có hoặc chưa cài vân tay", async () => {
    getBiometricKind.mockResolvedValue(null);
    setup({
      faceIdEnabled: true,
      tokens: { token: "access", refreshToken: "refresh" },
    });

    const tree = await render();

    expect(fingerprintButton(tree)).toBeUndefined();
    expect(faceIdButton(tree)).toBeUndefined();
    expect(mockCheckServerReachability).not.toHaveBeenCalled();
  });

  it("nút mờ và không tự hỏi khi chưa bật", async () => {
    setup({
      faceIdEnabled: false,
      tokens: { token: "access", refreshToken: "refresh" },
    });

    const tree = await render();
    const button = fingerprintButton(tree);

    expect(button).toBeTruthy();
    expect(StyleSheet.flatten(button.props.style)?.opacity).toBeLessThan(1);
    expect(mockCheckServerReachability).not.toHaveBeenCalled();
  });

  it("đã bật và còn phiên thì tự hỏi một lần như iOS, huỷ thì bấm icon hỏi lại", async () => {
    mockCheckServerReachability.mockResolvedValue({ canReachServer: true });
    setup({
      faceIdEnabled: true,
      tokens: { token: "access", refreshToken: "refresh" },
    });

    const tree = await render();
    const button = fingerprintButton(tree);

    expect(button).toBeTruthy();
    expect(StyleSheet.flatten(button.props.style)?.opacity ?? 1).toBe(1);
    expect(authenticate).toHaveBeenCalledTimes(1);

    await press(button);
    expect(authenticate).toHaveBeenCalledTimes(2);
  });

  it("không tự hỏi khi không còn token", async () => {
    setup({
      faceIdEnabled: true,
      tokens: { token: null, refreshToken: null },
    });

    await render();

    expect(mockCheckServerReachability).not.toHaveBeenCalled();
    expect(authenticate).not.toHaveBeenCalled();
  });
});

describe("LoginScreen – tài khoản và mạng nội bộ", () => {
  it("điền sẵn tài khoản đã lưu", async () => {
    setup({
      faceIdEnabled: false,
      tokens: { token: null, refreshToken: null },
    });
    mockReadStoredAuthUsername.mockResolvedValue("nguyenvana");

    const tree = await render();
    const [usernameInput] = tree.root.findAllByType(TextInput);

    expect(usernameInput.props.value).toBe("nguyenvana");
  });

  it("vẫn hiện thẻ mạng nội bộ khi đã cấp quyền", async () => {
    setup({
      faceIdEnabled: false,
      tokens: { token: null, refreshToken: null },
    });

    const tree = await render();

    expect(texts(tree)).toContain("Mạng nội bộ");
    expect(texts(tree)).toContain("Đã cấp quyền");
  });

  it("nhắc mạng nội bộ khi chưa cấp quyền", async () => {
    setup({
      faceIdEnabled: false,
      tokens: { token: null, refreshToken: null },
      localNetwork: "denied",
    });

    const tree = await render();

    expect(texts(tree)).toContain("Mạng nội bộ");
    expect(texts(tree)).toContain("Chưa cấp quyền");
  });
});
