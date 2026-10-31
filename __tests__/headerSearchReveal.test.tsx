import React, { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import HeaderSearchReveal from "../src/components/ui/HeaderSearchReveal";

let mounts = 0;

/** Đếm số lần ô bị gắn lại: gắn lại là `autoFocus` bật bàn phím lần nữa. */
const Probe = () => {
  useEffect(() => {
    mounts += 1;
  }, []);
  return <Text>ô tìm</Text>;
};

const reveal = (open: boolean) => (
  <HeaderSearchReveal open={open} gap={8}>
    <Probe />
  </HeaderSearchReveal>
);

const hasProbe = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAllByType(Probe).length > 0;

const isClipped = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAll((node) => typeof node.type === "string")
    .some((node) => StyleSheet.flatten(node.props.style)?.overflow === "hidden");

const measure = (tree: ReactTestRenderer.ReactTestRenderer, height: number) => {
  const [node] = tree.root.findAll(
    (candidate) => typeof candidate.props.onLayout === "function",
  );
  ReactTestRenderer.act(() => {
    node.props.onLayout({ nativeEvent: { layout: { height } } });
  });
};

const advance = (ms: number) =>
  ReactTestRenderer.act(() => {
    jest.advanceTimersByTime(ms);
  });

describe("khung trượt ô tìm sau nút kính lúp", () => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  beforeEach(() => {
    jest.useFakeTimers();
    mounts = 0;
  });

  afterEach(() => {
    ReactTestRenderer.act(() => tree.unmount());
    jest.useRealTimers();
  });

  it("đóng thì không vẽ gì", () => {
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(reveal(false));
    });

    expect(tree.toJSON()).toBeNull();
  });

  it("vào màn đã mở sẵn: hiện luôn, không cắt bóng ô", () => {
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(reveal(true));
    });

    expect(hasProbe(tree)).toBe(true);
    expect(isClipped(tree)).toBe(false);
  });

  it("mở trượt xuống, đóng trượt lên rồi mới gỡ — ô không bị gắn lại giữa chừng", () => {
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(reveal(false));
    });
    ReactTestRenderer.act(() => tree.update(reveal(true)));

    // Chưa đo chiều cao: ô đã gắn (bật bàn phím) nhưng còn bị cắt kín.
    expect(hasProbe(tree)).toBe(true);
    expect(isClipped(tree)).toBe(true);

    measure(tree, 56);
    advance(400);
    expect(isClipped(tree)).toBe(false);

    ReactTestRenderer.act(() => tree.update(reveal(false)));
    // Đang trượt lên: ô còn đó, bị cắt dần.
    expect(hasProbe(tree)).toBe(true);
    expect(isClipped(tree)).toBe(true);

    advance(400);
    expect(tree.toJSON()).toBeNull();
    expect(mounts).toBe(1);
  });

  it("bấm đóng giữa lúc đang mở thì trượt ngược lại luôn", () => {
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(reveal(false));
    });
    ReactTestRenderer.act(() => tree.update(reveal(true)));
    measure(tree, 56);
    advance(100);

    ReactTestRenderer.act(() => tree.update(reveal(false)));
    advance(400);

    expect(tree.toJSON()).toBeNull();
  });
});
