import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ReactTestRenderer from "react-test-renderer";

import {
  MAX_RECENTS,
  useMenuTreeState,
} from "../src/components/menuTree/useMenuTreeState";

const SCOPE = "asset:2";
const RECENTS_KEY = `@menuTree:recents:${SCOPE}`;
const EXPANDED_KEY = `@menuTree:expanded:${SCOPE}`;

type Recent = { id: number; label: string };

const target = (id: number): Recent => ({ id, label: `Mục ${id}` });

type HookResult = ReturnType<typeof useMenuTreeState<Recent>>;
type SearchState = { hasSearch: boolean; autoExpanded: (string | number)[] };

function Harness({
  search,
  onRender,
}: {
  search?: SearchState;
  onRender: (result: HookResult) => void;
}) {
  onRender(useMenuTreeState<Recent>(SCOPE, search));
  return null;
}

const mount = async (search?: SearchState) => {
  let latest: HookResult;
  let tree: ReactTestRenderer.ReactTestRenderer;
  const onRender = (result: HookResult) => {
    latest = result;
  };

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <Harness search={search} onRender={onRender} />,
    );
  });

  return {
    get result() {
      return latest!;
    },
    /** Đổi từ khoá / thoát tìm kiếm rồi render lại như màn thật. */
    setSearch: async (next?: SearchState) => {
      await ReactTestRenderer.act(async () => {
        tree.update(<Harness search={next} onRender={onRender} />);
      });
    },
  };
};

const act = (fn: () => void) => ReactTestRenderer.act(async () => fn());

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe("ghi nhớ trạng thái cây menu", () => {
  it("mục vừa mở lên đầu và không trùng lặp", async () => {
    const harness = await mount();

    await act(() => harness.result.rememberRecent(target(1)));
    await act(() => harness.result.rememberRecent(target(2)));
    await act(() => harness.result.rememberRecent(target(1)));

    expect(harness.result.recents.map((item) => item.id)).toEqual([1, 2]);
  });

  it("chỉ giữ tối đa MAX_RECENTS mục", async () => {
    const harness = await mount();

    for (let id = 1; id <= MAX_RECENTS + 3; id++) {
      await act(() => harness.result.rememberRecent(target(id)));
    }

    expect(harness.result.recents).toHaveLength(MAX_RECENTS);
    // Mục mới nhất ở đầu, mục cũ nhất bị đẩy ra.
    expect(harness.result.recents[0].id).toBe(MAX_RECENTS + 3);
    expect(harness.result.recents.map((item) => item.id)).not.toContain(1);
  });

  it("đọc lại được trạng thái đã lưu", async () => {
    await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify([target(9)]));
    await AsyncStorage.setItem(EXPANDED_KEY, JSON.stringify([4, 5]));


    const harness = await mount();

    expect(harness.result.recents.map((item) => item.id)).toEqual([9]);
    expect(harness.result.expandedIds).toEqual([4, 5]);
  });

  it("lưu nhóm người dùng tự mở", async () => {
    const harness = await mount();

    await act(() => harness.result.toggleExpanded(1));
    await act(() => harness.result.toggleExpanded(2));
    await act(() => harness.result.toggleExpanded(1));

    expect(harness.result.expandedIds).toEqual([2]);
    expect(await AsyncStorage.getItem(EXPANDED_KEY)).toBe("[2]");
  });

  // Đây là ca dễ sai nhất: tìm kiếm tự mở các nhánh có kết quả, xong xoá từ khoá
  // thì danh sách phải trở về đúng trạng thái trước khi tìm.
  it("xoá từ khoá thì trả về đúng nhóm người dùng đang mở", async () => {
    const harness = await mount({ hasSearch: false, autoExpanded: [] });

    await act(() => harness.result.toggleExpanded(1));
    expect(harness.result.expandedIds).toEqual([1]);

    // Bắt đầu tìm kiếm: hiện các nhánh có kết quả.
    await harness.setSearch({ hasSearch: true, autoExpanded: [7, 8] });
    expect(harness.result.expandedIds).toEqual([7, 8]);

    // Xoá từ khoá.
    await harness.setSearch({ hasSearch: false, autoExpanded: [] });
    expect(harness.result.expandedIds).toEqual([1]);
  });

  it("gập/mở trong lúc tìm kiếm không ghi xuống máy", async () => {
    const harness = await mount({ hasSearch: true, autoExpanded: [7] });

    await act(() => harness.result.toggleExpanded(9));

    expect(harness.result.expandedIds).toEqual([7, 9]);
    // Không có gì được lưu: đó là trạng thái tạm của lần lọc này.
    expect(await AsyncStorage.getItem(EXPANDED_KEY)).toBeNull();
  });

  it("thu tất cả khi đang tìm chỉ thu tạm, không xoá trạng thái đã lưu", async () => {
    await AsyncStorage.setItem(EXPANDED_KEY, JSON.stringify([3]));
    const harness = await mount({ hasSearch: true, autoExpanded: [7] });

    await act(() => harness.result.collapseAll());

    expect(harness.result.expandedIds).toEqual([]);
    expect(await AsyncStorage.getItem(EXPANDED_KEY)).toBe("[3]");
  });

  // Nếu ghi trước khi đọc xong, mảng rỗng ban đầu sẽ xoá mất trạng thái đã lưu.
  it("không ghi đè trước khi đọc xong", async () => {
    await AsyncStorage.setItem(EXPANDED_KEY, JSON.stringify([7]));

    let latest: HookResult;
    let firstRender = true;
    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(
        <Harness
          onRender={(result) => {
            latest = result;

            // Chỉ gọi ở lần render đầu, lúc chưa đọc xong AsyncStorage.
            if (firstRender) {
              firstRender = false;
              result.collapseAll();
            }
          }}
        />,
      );
    });

    expect(await AsyncStorage.getItem(EXPANDED_KEY)).toBe("[7]");
    expect(latest!.expandedIds).toEqual([7]);
  });

  it("dữ liệu lưu bị hỏng thì trả về rỗng, không nổ", async () => {
    await AsyncStorage.setItem(RECENTS_KEY, "{khong-phai-json");

    const harness = await mount();

    expect(harness.result.recents).toEqual([]);
  });
});
