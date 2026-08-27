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

const DANH_GIA_MODE = {
  state: "action" as const,
  kind: "child:danhgia",
  label: "Đánh giá",
  icon: "clipboard-outline",
};

/**
 * Vòng đời chế độ quét — đúng thứ tự người dùng làm quen với máy quét:
 * lần 1 ra màn chi tiết, lần 2 hỏi làm gì, từ lần 3 chạy thẳng.
 */
describe("vòng đời chế độ quét", () => {
  it("máy chưa quét bao giờ thì lần đầu đi quy trình cũ", async () => {
    const result = await mountProvider();

    expect(result().mode).toEqual({ state: "firstTime" });
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it("quét xong lần đầu thì lần sau chuyển sang hỏi", async () => {
    const result = await mountProvider();

    await ReactTestRenderer.act(async () => {
      result().markScanned();
    });

    expect(result().mode).toEqual({ state: "ask" });
    expect(JSON.parse(mockStore[SCAN_MODE_KEY])).toEqual({ state: "ask" });
  });

  // Đã chốt việc rồi mà quét tiếp lại bị kéo về "hỏi" thì đúng cái phiền vòng lặp
  // này sinh ra để bỏ.
  it("đã chốt việc thì quét thêm không kéo ngược về hỏi", async () => {
    mockStore[SCAN_MODE_KEY] = JSON.stringify(DANH_GIA_MODE);
    const result = await mountProvider();

    await ReactTestRenderer.act(async () => {
      result().markScanned();
    });

    expect(result().mode).toEqual(DANH_GIA_MODE);
  });

  it("chốt việc thì nhớ cả nhãn và icon, vì không có bảng nào để tra lại", async () => {
    const result = await mountProvider();

    await ReactTestRenderer.act(async () => {
      result().setMode(DANH_GIA_MODE);
    });

    expect(result().mode).toEqual(DANH_GIA_MODE);
    expect(result().modeKind).toBe("child:danhgia");
    expect(JSON.parse(mockStore[SCAN_MODE_KEY])).toEqual(DANH_GIA_MODE);
  });

  it("chưa chốt việc thì không có loại việc nào để khớp", async () => {
    const result = await mountProvider();

    expect(result().modeKind).toBeNull();
  });

  it("nhớ mãi qua các lần mở app", async () => {
    mockStore[SCAN_MODE_KEY] = JSON.stringify(DANH_GIA_MODE);

    expect((await mountProvider())().mode).toEqual(DANH_GIA_MODE);
  });
});

describe("đọc lựa chọn đã lưu từ bản cũ", () => {
  // Công tắc "Đánh giá nhanh" đang bật = người này đã quen máy quét. Đưa về `ask`
  // để chọn lại việc, chứ không bắt làm lại từ bước "lần đầu".
  it("công tắc đánh giá nhanh đang bật thành trạng thái hỏi việc", async () => {
    mockStore[LEGACY_KEY] = "true";

    const result = await mountProvider();

    expect(result().mode).toEqual({ state: "ask" });
    // Khoá cũ phải dọn, không thì lần sau lại chuyển đổi lần nữa và ghi đè lựa
    // chọn người dùng vừa đổi.
    expect(mockStore[LEGACY_KEY]).toBeUndefined();
  });

  it("công tắc cũ đang tắt thì coi như chưa quét lần nào", async () => {
    mockStore[LEGACY_KEY] = "false";

    const result = await mountProvider();

    expect(result().mode).toEqual({ state: "firstTime" });
    expect(mockStore[LEGACY_KEY]).toBeUndefined();
  });

  // Bản trước lưu chế độ dưới dạng chuỗi phẳng, và tên loại việc hồi đó do app tự
  // đặt nên nay không còn khớp. Giữ lại được ý "đã chốt một việc" → hỏi lại.
  it("chế độ dạng chuỗi của bản trước thành trạng thái hỏi việc", async () => {
    mockStore[SCAN_MODE_KEY] = "danhGia";

    expect((await mountProvider())().mode).toEqual({ state: "ask" });
  });

  it("chuỗi view của bản trước vẫn là chỉ xem thông tin", async () => {
    mockStore[SCAN_MODE_KEY] = "view";

    expect((await mountProvider())().mode).toEqual({ state: "view" });
  });

  it("dữ liệu hỏng thì về lần đầu, không vỡ", async () => {
    mockStore[SCAN_MODE_KEY] = "{khong-phai-json";

    expect((await mountProvider())().mode).toEqual({ state: "firstTime" });
  });

  it("JSON đúng dạng nhưng thiếu nhãn thì bỏ, không hiện pill rỗng", async () => {
    mockStore[SCAN_MODE_KEY] = JSON.stringify({
      state: "action",
      kind: "child:danhgia",
    });

    expect((await mountProvider())().mode).toEqual({ state: "firstTime" });
  });
});
