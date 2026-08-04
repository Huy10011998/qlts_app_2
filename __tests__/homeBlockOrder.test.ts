import {
  DEFAULT_HOME_BLOCK_ORDER,
  HOME_BLOCK_ORDER_KEY,
  getHomeBlockOrderKey,
  moveHomeBlock,
  normalizeHomeBlockOrder,
  type HomeBlockKey,
} from "../src/screens/Home/shared/homeBlockOrder";

describe("getHomeBlockOrderKey", () => {
  it("tách key theo từng user, chuẩn hoá username", () => {
    expect(getHomeBlockOrderKey("HuyTM")).toBe(
      "@home:blockOrder:user:huytm"
    );
    expect(getHomeBlockOrderKey("  huytm  ")).toBe(
      getHomeBlockOrderKey("HUYTM")
    );
  });

  it("chưa biết user thì dùng key chung, không ghi đè của ai", () => {
    expect(getHomeBlockOrderKey(null)).toBe(HOME_BLOCK_ORDER_KEY);
    expect(getHomeBlockOrderKey("   ")).toBe(HOME_BLOCK_ORDER_KEY);
  });
});

describe("normalizeHomeBlockOrder", () => {
  it("dữ liệu không dùng được thì trả về thứ tự mặc định", () => {
    expect(normalizeHomeBlockOrder(null)).toEqual(DEFAULT_HOME_BLOCK_ORDER);
    expect(normalizeHomeBlockOrder("shortcuts")).toEqual(
      DEFAULT_HOME_BLOCK_ORDER
    );
    expect(normalizeHomeBlockOrder([])).toEqual(DEFAULT_HOME_BLOCK_ORDER);
  });

  it("bỏ khối lạ, bỏ khối lặp, giữ nguyên thứ tự user đã sắp", () => {
    expect(
      normalizeHomeBlockOrder([
        "utilities",
        "recentActivities",
        "utilities",
        42,
        "shortcuts",
        "stats",
        "attendance",
        "itStructure",
      ])
    ).toEqual(["utilities", "shortcuts", "stats", "attendance", "itStructure"]);
  });

  it("khối mới của bản app sau chèn vào đúng chỗ mặc định, không dồn xuống cuối", () => {
    // Thứ tự cũ thiếu "itStructure" — mặc định nó đứng ngay sau "shortcuts".
    expect(
      normalizeHomeBlockOrder([
        "utilities",
        "attendance",
        "stats",
        "shortcuts",
      ])
    ).toEqual(["utilities", "attendance", "stats", "shortcuts", "itStructure"]);
    expect(
      normalizeHomeBlockOrder(["stats", "shortcuts", "attendance", "utilities"])
    ).toEqual(["stats", "shortcuts", "itStructure", "attendance", "utilities"]);
  });
});

describe("moveHomeBlock", () => {
  const fullOrder = DEFAULT_HOME_BLOCK_ORDER;

  it("kéo xuống giữa các khối đang hiện", () => {
    expect(
      moveHomeBlock({
        order: fullOrder,
        visibleKeys: fullOrder,
        fromIndex: 0,
        toIndex: 2,
      })
    ).toEqual(["shortcuts", "itStructure", "stats", "attendance", "utilities"]);
  });

  it("kéo lên đầu danh sách", () => {
    expect(
      moveHomeBlock({
        order: fullOrder,
        visibleKeys: fullOrder,
        fromIndex: 4,
        toIndex: 0,
      })
    ).toEqual(["utilities", "stats", "shortcuts", "itStructure", "attendance"]);
  });

  it("khối đang bị ẩn vẫn giữ đúng chỗ tương đối", () => {
    // "itStructure" và "attendance" bị ẩn (thiếu quyền / chưa có dữ liệu).
    const visibleKeys: HomeBlockKey[] = ["stats", "shortcuts", "utilities"];

    expect(
      moveHomeBlock({
        order: fullOrder,
        visibleKeys,
        fromIndex: 2,
        toIndex: 1,
      })
      // "utilities" về ngay sau "stats"; hai khối ẩn vẫn nằm sau "shortcuts".
    ).toEqual(["stats", "utilities", "shortcuts", "itStructure", "attendance"]);
  });

  it("kéo khối đang hiện lên đầu thì chèn trước khối hiện kế tiếp, không nhảy qua khối ẩn", () => {
    const order: HomeBlockKey[] = [
      "itStructure",
      "stats",
      "shortcuts",
      "attendance",
      "utilities",
    ];
    const visibleKeys: HomeBlockKey[] = ["stats", "shortcuts"];

    expect(
      moveHomeBlock({ order, visibleKeys, fromIndex: 1, toIndex: 0 })
    ).toEqual([
      "itStructure",
      "shortcuts",
      "stats",
      "attendance",
      "utilities",
    ]);
  });

  it("giữ nguyên tham chiếu khi không có gì thay đổi", () => {
    expect(
      moveHomeBlock({
        order: fullOrder,
        visibleKeys: fullOrder,
        fromIndex: 1,
        toIndex: 1,
      })
    ).toBe(fullOrder);
    expect(
      moveHomeBlock({
        order: fullOrder,
        visibleKeys: fullOrder,
        fromIndex: 0,
        toIndex: 9,
      })
    ).toBe(fullOrder);
  });
});
