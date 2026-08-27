import React from "react";
import ReactTestRenderer from "react-test-renderer";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  ScanModeProvider,
  useScanMode,
} from "../src/context/ScanModeContext";

const SCAN_MODE_KEY = "@qlts/scan-mode";
const LEGACY_KEY = "@qlts/quick-review-mode";

let mockStore: Record<string, string> = {};

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async (key: string) => mockStore[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    mockStore[key] = value;
  }),
  removeItem: jest.fn(async (key: string) => {
    delete mockStore[key];
  }),
}));

const mountProvider = async () => {
  let latest: ReturnType<typeof useScanMode> | undefined;

  function Harness() {
    latest = useScanMode();
    return null;
  }

  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(
      <ScanModeProvider>
        <Harness />
      </ScanModeProvider>,
    );
  });

  return () => latest!;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockStore = {};
});

// Chế độ quét thay cho công tắc boolean "Đánh giá nhanh" thời chỉ có một việc.
// Không chuyển đổi thì người đang bật sẽ bị tắt âm thầm sau khi cập nhật app.
describe("chế độ quét", () => {
  it("chuyển công tắc đánh giá nhanh đang bật thành chế độ Đánh giá", async () => {
    mockStore[LEGACY_KEY] = "true";

    const result = await mountProvider();

    expect(result().mode).toBe("danhGia");
    expect(mockStore[SCAN_MODE_KEY]).toBe("danhGia");
    // Khoá cũ phải dọn, không thì lần sau lại chuyển đổi lần nữa và ghi đè lựa
    // chọn người dùng vừa đổi.
    expect(mockStore[LEGACY_KEY]).toBeUndefined();
  });

  it("công tắc cũ đang tắt thì thành xem thông tin", async () => {
    mockStore[LEGACY_KEY] = "false";

    const result = await mountProvider();

    expect(result().mode).toBe("view");
    expect(mockStore[LEGACY_KEY]).toBeUndefined();
  });

  it("chưa từng dùng công tắc nào thì mặc định xem thông tin", async () => {
    const result = await mountProvider();

    expect(result().mode).toBe("view");
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it("chế độ đã lưu thắng khoá cũ còn sót", async () => {
    mockStore[SCAN_MODE_KEY] = "trungChuyenTuLanh";
    mockStore[LEGACY_KEY] = "true";

    const result = await mountProvider();

    expect(result().mode).toBe("trungChuyenTuLanh");
  });

  it("giá trị lưu không hợp lệ thì về xem thông tin, không vỡ", async () => {
    mockStore[SCAN_MODE_KEY] = "traSua";

    const result = await mountProvider();

    expect(result().mode).toBe("view");
  });

  // Loại việc bị rút khỏi bảng (kiểm kê/báo hỏng gỡ ra vì BE chưa có) thì máy nào
  // đang lưu giá trị đó phải về xem thông tin, không được kẹt ở một chế độ mà app
  // không còn hiểu.
  it("chế độ đã bị gỡ khỏi bảng thì về xem thông tin", async () => {
    mockStore[SCAN_MODE_KEY] = "kiemKe";

    const result = await mountProvider();

    expect(result().mode).toBe("view");
  });

  it("đổi chế độ thì ghi xuống storage", async () => {
    const result = await mountProvider();

    await ReactTestRenderer.act(async () => {
      result().setMode("trungChuyenTuLanh");
    });

    expect(result().mode).toBe("trungChuyenTuLanh");
    expect(mockStore[SCAN_MODE_KEY]).toBe("trungChuyenTuLanh");
  });
});
