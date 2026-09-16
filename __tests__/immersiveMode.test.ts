import { AppState, NativeModules, Platform } from "react-native";
import type { AppStateStatus } from "react-native";

type AppStateHandler = (state: AppStateStatus) => void;

const enable = jest.fn();
const disable = jest.fn();

/**
 * Module đọc NativeModules và Platform ngay lúc import (bộ đếm + listener nằm ở
 * cấp module), nên mỗi ca test phải nạp lại sau khi đã dựng mock.
 */
const loadModule = () => {
  let handler: AppStateHandler = () => {};
  let api!: typeof import("../src/services/immersive/immersiveMode");

  jest.isolateModules(() => {
    (Platform as { OS: string }).OS = "android";
    NativeModules.ImmersiveMode = { enable, disable };
    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_type, listener: AppStateHandler) => {
        handler = listener;
        return { remove: jest.fn() } as never;
      });

    api = require("../src/services/immersive/immersiveMode");
  });

  return { ...api, emitAppState: (state: AppStateStatus) => handler(state) };
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("immersiveMode", () => {
  it("chỉ gọi native ở lượt bật đầu và lượt tắt cuối", () => {
    const { enableImmersiveMode, disableImmersiveMode } = loadModule();

    enableImmersiveMode();
    enableImmersiveMode();
    expect(enable).toHaveBeenCalledTimes(1);

    // Màn lồng trong đóng trước: thanh hệ thống phải còn ẩn cho màn ngoài.
    disableImmersiveMode();
    expect(disable).not.toHaveBeenCalled();

    disableImmersiveMode();
    expect(disable).toHaveBeenCalledTimes(1);
  });

  it("bỏ qua lượt tắt thừa để bộ đếm không âm", () => {
    const { enableImmersiveMode, disableImmersiveMode } = loadModule();

    disableImmersiveMode();
    expect(disable).not.toHaveBeenCalled();

    enableImmersiveMode();
    expect(enable).toHaveBeenCalledTimes(1);
  });

  it("reset ép hiện lại thanh hệ thống và xoá bộ đếm", () => {
    const { enableImmersiveMode, resetImmersiveMode } = loadModule();

    enableImmersiveMode();
    enableImmersiveMode();
    resetImmersiveMode();
    expect(disable).toHaveBeenCalledTimes(1);

    // Bộ đếm đã về 0 nên lượt bật kế tiếp lại bắn xuống native.
    enableImmersiveMode();
    expect(enable).toHaveBeenCalledTimes(2);
  });

  it("áp lại trạng thái ẩn khi app trở lại foreground", () => {
    const { enableImmersiveMode, emitAppState } = loadModule();

    enableImmersiveMode();
    emitAppState("background");
    expect(enable).toHaveBeenCalledTimes(1);

    // Activity có thể đã bị hủy lúc chạy nền: phải áp lại chứ không dựa vào
    // bộ đếm (vẫn > 0 nên enableImmersiveMode sẽ không gọi native nữa).
    emitAppState("active");
    expect(enable).toHaveBeenCalledTimes(2);
  });

  it("không áp lại khi không còn màn nào yêu cầu ẩn", () => {
    const { enableImmersiveMode, disableImmersiveMode, emitAppState } =
      loadModule();

    enableImmersiveMode();
    disableImmersiveMode();
    emitAppState("active");
    expect(enable).toHaveBeenCalledTimes(1);
  });

  it("không đụng tới native trên iOS", () => {
    let api!: typeof import("../src/services/immersive/immersiveMode");
    jest.isolateModules(() => {
      (Platform as { OS: string }).OS = "ios";
      NativeModules.ImmersiveMode = { enable, disable };
      api = require("../src/services/immersive/immersiveMode");
    });

    api.enableImmersiveMode();
    api.resetImmersiveMode();
    expect(enable).not.toHaveBeenCalled();
    expect(disable).not.toHaveBeenCalled();
  });
});
