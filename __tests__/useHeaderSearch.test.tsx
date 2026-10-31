import React, { useState } from "react";
import { TextInput } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import SearchBar from "../src/components/ui/SearchBar";
import { ThemeProvider } from "../src/context/ThemeContext";
import { useHeaderSearch } from "../src/hooks/useHeaderSearch";
import type { HeaderSearchOption } from "../src/types";

const mockSetOptions = jest.fn();

jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({ setOptions: mockSetOptions }),
}));

/** Nút kính lúp mới nhất màn gửi lên header. */
const lastHeaderSearch = (): HeaderSearchOption | undefined =>
  mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0]
    .headerSearch;

let latestQuery = "";

function Screen({
  initialQuery = "",
  enabled,
}: {
  initialQuery?: string;
  enabled?: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const search = useHeaderSearch({
    query,
    onClear: () => setQuery(""),
    enabled,
  });
  latestQuery = query;

  return search.open ? (
    <SearchBar
      value={query}
      onChangeText={setQuery}
      placeholder="Tìm"
      autoFocus
      onClose={search.close}
    />
  ) : null;
}

const render = async (element: React.ReactElement) => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });

  return tree!;
};

describe("useHeaderSearch", () => {
  beforeEach(() => {
    mockSetOptions.mockClear();
    latestQuery = "";
  });

  it("mặc định chỉ có nút trên header, chưa có ô", async () => {
    const tree = await render(<Screen />);

    expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
    expect(lastHeaderSearch()?.active).toBe(false);
  });

  it("bấm nút thì hiện ô và bật bàn phím; ✕ xoá chữ rồi ẩn ô", async () => {
    const tree = await render(<Screen />);

    await ReactTestRenderer.act(async () => lastHeaderSearch()!.onPress());
    const input = tree.root.findByType(TextInput);
    expect(input.props.autoFocus).toBe(true);
    expect(lastHeaderSearch()?.active).toBe(true);

    await ReactTestRenderer.act(async () => input.props.onChangeText("tài"));
    expect(latestQuery).toBe("tài");

    const closeButton = tree.root.findAll(
      (node) =>
        node.props.accessibilityLabel === "Đóng tìm kiếm" &&
        typeof node.props.onPress === "function",
    )[0];
    await ReactTestRenderer.act(async () => closeButton.props.onPress());

    expect(latestQuery).toBe("");
    expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
    expect(lastHeaderSearch()?.active).toBe(false);
  });

  it("bộ gõ chốt chữ trễ sau khi đóng ô thì vẫn xoá, không lọc ngầm", async () => {
    const tree = await render(<Screen />);

    await ReactTestRenderer.act(async () => lastHeaderSearch()!.onPress());
    const onChangeText = tree.root.findByType(TextInput).props.onChangeText;
    await ReactTestRenderer.act(async () => onChangeText("Hi"));
    await ReactTestRenderer.act(async () => lastHeaderSearch()!.onPress());
    // Telex còn chữ đang ghép: lúc ô mất focus nó gửi lại chữ sau lệnh xoá.
    await ReactTestRenderer.act(async () => onChangeText("Hiệp"));

    expect(latestQuery).toBe("");
    expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
    expect(lastHeaderSearch()?.active).toBe(false);
  });

  it("bấm nút lần nữa cũng xoá chữ và ẩn ô", async () => {
    const tree = await render(<Screen />);

    await ReactTestRenderer.act(async () => lastHeaderSearch()!.onPress());
    await ReactTestRenderer.act(async () =>
      tree.root.findByType(TextInput).props.onChangeText("pccc"),
    );
    await ReactTestRenderer.act(async () => lastHeaderSearch()!.onPress());

    expect(latestQuery).toBe("");
    expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
  });

  it("vào màn đã có sẵn chữ thì mở ô luôn, không lọc ngầm", async () => {
    const tree = await render(<Screen initialQuery="camera" />);

    expect(tree.root.findAllByType(TextInput)).toHaveLength(1);
    expect(lastHeaderSearch()?.active).toBe(true);
  });

  it("enabled false thì không gắn nút", async () => {
    await render(<Screen enabled={false} />);

    expect(lastHeaderSearch()).toBeUndefined();
  });
});
