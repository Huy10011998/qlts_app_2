import {
  getHomeBlockListKey,
  HOME_COLLAPSED_BLOCKS_KEY,
  HOME_HIDDEN_BLOCKS_KEY,
  normalizeHomeBlockList,
  setHomeBlockInList,
} from "../src/screens/Home/shared/homeBlockLists";
import type { HomeBlockKey } from "../src/screens/Home/shared/homeBlockOrder";

describe("getHomeBlockListKey", () => {
  it("tách key theo từng user, chuẩn hoá username", () => {
    expect(getHomeBlockListKey(HOME_COLLAPSED_BLOCKS_KEY, "HuyTM")).toBe(
      "@home:collapsedBlocks:user:huytm"
    );
    expect(getHomeBlockListKey(HOME_HIDDEN_BLOCKS_KEY, "  huytm  ")).toBe(
      getHomeBlockListKey(HOME_HIDDEN_BLOCKS_KEY, "HUYTM")
    );
  });

  it("thu gọn và ẩn là hai danh sách riêng, không đè nhau", () => {
    expect(getHomeBlockListKey(HOME_COLLAPSED_BLOCKS_KEY, "huytm")).not.toBe(
      getHomeBlockListKey(HOME_HIDDEN_BLOCKS_KEY, "huytm")
    );
  });

  it("chưa biết user thì dùng key chung", () => {
    expect(getHomeBlockListKey(HOME_HIDDEN_BLOCKS_KEY, null)).toBe(
      HOME_HIDDEN_BLOCKS_KEY
    );
    expect(getHomeBlockListKey(HOME_HIDDEN_BLOCKS_KEY, "   ")).toBe(
      HOME_HIDDEN_BLOCKS_KEY
    );
  });
});

describe("normalizeHomeBlockList", () => {
  it("dữ liệu không dùng được thì coi như danh sách rỗng", () => {
    expect(normalizeHomeBlockList(null)).toEqual([]);
    expect(normalizeHomeBlockList("stats")).toEqual([]);
    expect(normalizeHomeBlockList({ stats: true })).toEqual([]);
  });

  it("bỏ khối lạ, bỏ khối lặp, giữ thứ tự đã lưu", () => {
    expect(
      normalizeHomeBlockList([
        "utilities",
        "recentActivities",
        "utilities",
        42,
        "assetStructure",
      ])
    ).toEqual(["utilities", "assetStructure"]);
  });
});

describe("setHomeBlockInList", () => {
  const list: HomeBlockKey[] = ["assetStructure"];

  it("thêm / bỏ đúng một khối", () => {
    expect(setHomeBlockInList(list, "utilities", true)).toEqual([
      "assetStructure",
      "utilities",
    ]);
    expect(setHomeBlockInList(list, "assetStructure", false)).toEqual([]);
  });

  it("không đổi gì thì trả lại đúng mảng cũ, để khỏi ghi máy vô ích", () => {
    expect(setHomeBlockInList(list, "assetStructure", true)).toBe(list);
    expect(setHomeBlockInList(list, "stats", false)).toBe(list);
  });
});
