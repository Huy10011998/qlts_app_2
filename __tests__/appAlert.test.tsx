import React from "react";
import { Alert, Text } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import { AppAlert, AppAlertHost } from "../src/components/ui/AppAlert";

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

const mountHost = async () => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <AppAlertHost />
      </ThemeProvider>,
    );
  });

  mounted.push(tree!);
  return tree!;
};

const textsOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .flatMap((node) => node.props.children)
    .filter((child): child is string => typeof child === "string");

/** Cho hiệu ứng mở/đóng chạy xong. */
const flush = async () => {
  await ReactTestRenderer.act(async () => {
    jest.runAllTimers();
  });
};

const show = async (...args: Parameters<typeof AppAlert.alert>) => {
  await ReactTestRenderer.act(async () => {
    AppAlert.alert(...args);
  });
  await flush();
};

/**
 * Nút của hộp, theo thứ tự hiển thị. Tìm theo props vì `findAllByType` không bắt
 * được `Pressable` (bọc memo/forwardRef); một nút khớp ở nhiều tầng nên lọc trùng
 * theo `onPress`.
 */
const buttonsOf = (tree: ReactTestRenderer.ReactTestRenderer) => {
  const seen = new Set<unknown>();

  return tree.root
    .findAll(
      (node) =>
        node.props.accessibilityRole === "button" &&
        typeof node.props.onPress === "function",
    )
    .filter((node) => {
      if (seen.has(node.props.onPress)) return false;
      seen.add(node.props.onPress);
      return true;
    });
};

const buttonLabels = (tree: ReactTestRenderer.ReactTestRenderer) =>
  buttonsOf(tree).map((node) => node.findByType(Text).props.children);

const press = async (tree: ReactTestRenderer.ReactTestRenderer, label: string) => {
  const button = buttonsOf(tree).find(
    (node) => node.findByType(Text).props.children === label,
  );

  if (!button) throw new Error(`Không thấy nút "${label}"`);

  await ReactTestRenderer.act(async () => {
    button.props.onPress();
  });
  await flush();
};

const pressBackdrop = async (tree: ReactTestRenderer.ReactTestRenderer) => {
  const [backdrop] = tree.root.findAll(
    (node) => node.props.accessible === false && "onPress" in node.props,
  );

  await ReactTestRenderer.act(async () => {
    backdrop?.props.onPress?.();
  });
  await flush();
};

describe("AppAlert", () => {
  let nativeAlert: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    nativeAlert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    // Tháo host để listener cấp module không lọt sang ca sau.
    ReactTestRenderer.act(() => {
      mounted.splice(0).forEach((tree) => tree.unmount());
    });
    nativeAlert.mockRestore();
    jest.useRealTimers();
  });

  // jest và lúc app chưa dựng xong cây: không được nuốt mất thông báo.
  it("chưa có host thì dùng hộp gốc", () => {
    AppAlert.alert("Lỗi", "Không thể tải ảnh!");

    expect(nativeAlert).toHaveBeenCalledWith(
      "Lỗi",
      "Không thể tải ảnh!",
      undefined,
      undefined,
    );
  });

  it("có host thì tự vẽ, không bật hộp gốc; bấm OK là đóng", async () => {
    const tree = await mountHost();

    await show("Lỗi kết nối", "Không thể kết nối đến máy chủ.");

    expect(nativeAlert).not.toHaveBeenCalled();
    expect(textsOf(tree)).toEqual(
      expect.arrayContaining([
        "Lỗi kết nối",
        "Không thể kết nối đến máy chủ.",
        "OK",
      ]),
    );

    await press(tree, "OK");

    expect(tree.toJSON()).toBeNull();
  });

  it("đóng hộp rồi mới gọi onPress, và onPress mở được hộp tiếp theo", async () => {
    const tree = await mountHost();
    const onDelete = jest.fn(() => {
      AppAlert.alert("Đã xoá");
    });

    await show("Xoá tệp?", "Không hoàn tác được.", [
      { text: "Huỷ", style: "cancel" },
      { text: "Xoá", style: "destructive", onPress: onDelete },
    ]);

    // Hai nút ngắn nằm ngang, Huỷ bên trái.
    expect(buttonLabels(tree)).toEqual(["Huỷ", "Xoá"]);

    await press(tree, "Xoá");

    expect(onDelete).toHaveBeenCalledTimes(1);
    await flush();
    expect(textsOf(tree)).toContain("Đã xoá");
    expect(textsOf(tree)).not.toContain("Xoá tệp?");
  });

  it("hộp đến sau xếp hàng chờ hộp trước đóng", async () => {
    const tree = await mountHost();

    await show("Thứ nhất");
    await show("Thứ hai");

    expect(textsOf(tree)).toContain("Thứ nhất");
    expect(textsOf(tree)).not.toContain("Thứ hai");

    await press(tree, "OK");

    expect(textsOf(tree)).toContain("Thứ hai");
  });

  it("từ ba nút trở lên xếp dọc, Huỷ dưới cùng", async () => {
    const tree = await mountHost();

    await show("Lỗi", "Không kết nối được máy chủ.", [
      { text: "Chấp nhận", style: "cancel" },
      { text: "Chi tiết" },
      { text: "Thử lại" },
    ]);

    expect(buttonLabels(tree)).toEqual(["Chi tiết", "Thử lại", "Chấp nhận"]);
  });

  it("chạm nền ngoài chỉ đóng khi cancelable", async () => {
    const tree = await mountHost();
    const onDismiss = jest.fn();

    await show("Giữ lại", undefined, undefined);
    await pressBackdrop(tree);
    expect(textsOf(tree)).toContain("Giữ lại");
    await press(tree, "OK");

    await show("Có bản mới", undefined, [{ text: "Để sau" }], {
      cancelable: true,
      onDismiss,
    });
    await pressBackdrop(tree);

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(tree.toJSON()).toBeNull();
  });
});
