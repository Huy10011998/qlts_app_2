import {
  getHomeShortcutCardWidth,
  getHomeShortcutPagerHeight,
  HOME_FEATURE_CARD_HEIGHT,
  HOME_FEATURE_GRID_GAP,
} from "../src/screens/Home/HomeScreen.styles";
import {
  chunkHomeShortcutPages,
  getHomeShortcutPageCount,
  getHomeShortcutVisiblePageIndexes,
  HOME_SHORTCUT_COLUMNS,
  HOME_SHORTCUT_PAGE_SIZE,
} from "../src/screens/Home/shared/homeShortcutPages";

// iPhone 14: 390 - 16*2 lề nội dung.
const CONTENT_WIDTH = 358;

const rightEdgeOfCard = (cardWidth: number, index: number) =>
  (index + 1) * cardWidth + index * HOME_FEATURE_GRID_GAP;

describe("bề rộng card hàng Truy cập nhanh", () => {
  it("mỗi trang lấp kín một hàng card, không chừa khoảng trống", () => {
    const cardWidth = getHomeShortcutCardWidth(CONTENT_WIDTH, 6);

    expect(
      rightEdgeOfCard(cardWidth, HOME_SHORTCUT_COLUMNS - 1),
    ).toBeCloseTo(CONTENT_WIDTH);
  });

  it("ghim 1–2 mục thì card giãn ra lấp kín hàng", () => {
    expect(getHomeShortcutCardWidth(CONTENT_WIDTH, 1)).toBeCloseTo(
      CONTENT_WIDTH,
    );
    expect(
      rightEdgeOfCard(getHomeShortcutCardWidth(CONTENT_WIDTH, 2), 1),
    ).toBeCloseTo(CONTENT_WIDTH);
  });

  // Trang cuối còn lẻ vẫn rộng 1/3 như các trang trước, vuốt qua không co giãn.
  it("từ 3 mục trở lên card giữ 1/3 hàng, kể cả khi trang cuối còn lẻ", () => {
    const threeColumns = getHomeShortcutCardWidth(CONTENT_WIDTH, 3);

    expect(getHomeShortcutCardWidth(CONTENT_WIDTH, 4)).toBe(threeColumns);
    expect(getHomeShortcutCardWidth(CONTENT_WIDTH, 7)).toBe(threeColumns);
  });

  it("co theo màn hình hẹp", () => {
    const seWidth = getHomeShortcutCardWidth(375 - 32, 6);
    const proMaxWidth = getHomeShortcutCardWidth(430 - 32, 6);

    expect(seWidth).toBeLessThan(proMaxWidth);
    expect(seWidth).toBeGreaterThan(0);
  });
});

describe("chia trang Truy cập nhanh", () => {
  const makeItems = (count: number) =>
    Array.from({ length: count }, (_, i) => `item-${i}`);

  it("mỗi trang tối đa 3 mục (3 cột × 1 hàng), trang cuối nhận phần còn lại", () => {
    expect(HOME_SHORTCUT_COLUMNS).toBe(3);
    expect(HOME_SHORTCUT_PAGE_SIZE).toBe(3);

    const pages = chunkHomeShortcutPages(makeItems(8));

    expect(pages).toHaveLength(3);
    expect(pages[0]).toHaveLength(HOME_SHORTCUT_PAGE_SIZE);
    expect(pages[1]).toHaveLength(HOME_SHORTCUT_PAGE_SIZE);
    expect(pages[2]).toHaveLength(2);
    expect(pages.flat()).toEqual(makeItems(8));
  });

  it("số trang khớp với số mục đã ghim", () => {
    expect(getHomeShortcutPageCount(0)).toBe(0);
    expect(getHomeShortcutPageCount(1)).toBe(1);
    expect(getHomeShortcutPageCount(3)).toBe(1);
    expect(getHomeShortcutPageCount(4)).toBe(2);
    expect(getHomeShortcutPageCount(13)).toBe(5);
  });

  // Ghim bao nhiêu cũng chỉ một hàng; nhiều mục hơn thì thêm trang chứ không
  // thêm hàng, nên hàng chấm tròn không nhảy khi đổi trang.
  it("lưới luôn cao đúng một hàng", () => {
    const oneRow = HOME_FEATURE_CARD_HEIGHT;

    expect(getHomeShortcutPagerHeight(0)).toBe(0);
    expect(getHomeShortcutPagerHeight(1)).toBe(oneRow);
    expect(getHomeShortcutPagerHeight(3)).toBe(oneRow);
    expect(getHomeShortcutPagerHeight(4)).toBe(oneRow);
    expect(getHomeShortcutPagerHeight(20)).toBe(oneRow);
  });

  it("chấm trang không kéo dài quá 7, cửa sổ trượt theo trang đang xem", () => {
    expect(getHomeShortcutVisiblePageIndexes(0, 0)).toEqual([]);
    expect(getHomeShortcutVisiblePageIndexes(1, 3)).toEqual([0, 1, 2]);

    const middle = getHomeShortcutVisiblePageIndexes(5, 12);
    expect(middle).toHaveLength(7);
    expect(middle).toContain(5);

    const last = getHomeShortcutVisiblePageIndexes(11, 12);
    expect(last).toEqual([5, 6, 7, 8, 9, 10, 11]);
  });
});
