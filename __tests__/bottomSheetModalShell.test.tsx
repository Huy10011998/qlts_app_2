import React from "react";
import { AccessibilityInfo, Modal, Text, TouchableOpacity } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import BottomSheetModalShell, {
  SHEET_CLOSE_DURATION,
} from "../src/components/shared/BottomSheetModalShell";

const SHEET_HEIGHT = 320;

const mount = async (props: Record<string, any>) => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  const render = (extra: Record<string, any>) => (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <ThemeProvider>
        <BottomSheetModalShell
          {...({ onClose: () => {}, ...props, ...extra } as any)}
        >
          <Text>Nội dung sheet</Text>
        </BottomSheetModalShell>
      </ThemeProvider>
    </SafeAreaProvider>
  );

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(render({}));
  });

  return {
    get tree() {
      return tree;
    },
    modal: () => tree.root.findByType(Modal),
    byId: (id: string) => tree.root.findByProps({ testID: id }),
    update: async (extra: Record<string, any>) => {
      await ReactTestRenderer.act(async () => {
        tree.update(render(extra));
      });
    },
    advance: async (ms: number) => {
      await ReactTestRenderer.act(async () => {
        jest.advanceTimersByTime(ms);
      });
    },
    unmount: async () => {
      await ReactTestRenderer.act(async () => {
        tree.unmount();
      });
    },
  };
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.restoreAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("BottomSheetModalShell", () => {
  it("tự lo chuyển động, không dùng animationType của Modal", async () => {
    const harness = await mount({ visible: true });

    expect(harness.modal().props.animationType).toBe("none");
    expect(harness.modal().props.transparent).toBe(true);
  });

  // Sheet mount ở trạng thái đã mở phải hiện ngay, không trượt lên gây chớp.
  it("mount lúc đang mở thì hiện ngay", async () => {
    const harness = await mount({ visible: true });
    const surface = harness.byId("sheet-surface");

    expect(harness.modal().props.visible).toBe(true);
    expect(
      surface.props.style.flat(3).find((s: any) => s?.transform)?.transform[0]
        .translateY.__getValue(),
    ).toBe(0);
  });

  it("đóng thì Modal còn render tới khi trượt xong", async () => {
    const harness = await mount({ visible: true });
    const surface = harness.byId("sheet-surface");

    await ReactTestRenderer.act(async () => {
      surface.props.onLayout({
        nativeEvent: { layout: { height: SHEET_HEIGHT } },
      });
    });

    await harness.update({ visible: false });

    // Ngay sau khi tắt: vẫn còn render để animation ra chạy được.
    expect(harness.modal().props.visible).toBe(true);

    await harness.advance(SHEET_CLOSE_DURATION + 50);

    expect(harness.modal().props.visible).toBe(false);
  });

  // Bấm đóng rồi mở lại ngay: callback của lượt đóng cũ không được tắt sheet.
  it("mở lại giữa lúc đang đóng thì không bị tắt", async () => {
    const harness = await mount({ visible: true });

    await harness.update({ visible: false });
    await harness.advance(SHEET_CLOSE_DURATION / 2);
    await harness.update({ visible: true });
    await harness.advance(1000);

    expect(harness.modal().props.visible).toBe(true);
  });

  it("giữ màu nền mờ của nơi gọi, và tách khỏi lớp bố cục", async () => {
    const dimColor = "rgba(1,2,3,0.5)";
    const harness = await mount({
      visible: true,
      overlayStyle: { backgroundColor: dimColor, justifyContent: "flex-end" },
    });
    const dim = harness.byId("sheet-dim");

    expect(
      dim.props.style.flat(3).find((s: any) => s?.backgroundColor)
        ?.backgroundColor,
    ).toBe(dimColor);
    // Nền mờ không được chắn thao tác bấm ra ngoài để đóng.
    expect(dim.props.pointerEvents).toBe("none");
  });

  it("bấm ra ngoài gọi onClose khi được bật", async () => {
    const onClose = jest.fn();
    const harness = await mount({ visible: true, closeOnBackdropPress: true, onClose });

    await ReactTestRenderer.act(async () => {
      harness.tree.root.findAllByType(TouchableOpacity)[0].props.onPress();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("tháo cây giữa lúc animate không nổ", async () => {
    const harness = await mount({ visible: true });

    await harness.update({ visible: false });
    await harness.unmount();
    await harness.advance(1000);

    expect(true).toBe(true);
  });

  // Bật giảm chuyển động: chỉ mờ dần, không trượt.
  it("không trượt khi hệ thống bật giảm chuyển động", async () => {
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(true);

    // Mount lúc đang đóng để cờ trợ năng đọc xong trước khi mở.
    const harness = await mount({ visible: false });
    await harness.update({ visible: true });

    const translateY = harness
      .byId("sheet-surface")
      .props.style.flat(3)
      .find((s: any) => s?.transform)?.transform[0].translateY;

    // outputRange [0, 0] → không có biên độ trượt ở bất kỳ thời điểm nào.
    expect(translateY.__getValue()).toBe(0);
  });
});
