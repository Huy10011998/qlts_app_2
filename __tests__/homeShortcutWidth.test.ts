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
    const cardWidth = getHomeShortcutCardWidth(CONTENT_WIDTH);

    expect(
      rightEdgeOfCard(cardWidth, HOME_SHORTCUT_COLUMNS - 1),
    ).toBeCloseTo(CONTENT_WIDTH);
  });

  it("co theo màn hình hẹp", () => {
    const seWidth = getHomeShortcutCardWidth(375 - 32);
    const proMaxWidth = getHomeShortcutCardWidth(430 - 32);

    expect(seWidth).toBeLessThan(proMaxWidth);
    expect(seWidth).toBeGreaterThan(0);
  });
});

describe("chia trang Truy cập nhanh", () => {
  const makeItems = (count: number) =>
    Array.from({ length: count }, (_, i) => `item-${i}`);

  it("mỗi trang tối đa 6 mục (3 cột × 2 hàng), trang cuối nhận phần còn lại", () => {
    expect(HOME_SHORTCUT_COLUMNS).toBe(3);
    expect(HOME_SHORTCUT_PAGE_SIZE).toBe(6);

    const pages = chunkHomeShortcutPages(makeItems(8));

    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(HOME_SHORTCUT_PAGE_SIZE);
    expect(pages[1]).toHaveLength(2);
    expect(pages.flat()).toEqual(makeItems(8));
  });

  it("số trang khớp với số mục đã ghim", () => {
    expect(getHomeShortcutPageCount(0)).toBe(0);
    expect(getHomeShortcutPageCount(1)).toBe(1);
    expect(getHomeShortcutPageCount(6)).toBe(1);
    expect(getHomeShortcutPageCount(7)).toBe(2);
    expect(getHomeShortcutPageCount(13)).toBe(3);
  });

  // Ghim chưa đủ một hàng thì không được chừa hàng trống; từ hàng thứ hai trở đi
  // mọi trang cao bằng nhau để hàng chấm tròn không nhảy khi đổi trang.
  it("chiều cao lưới theo số hàng, cao nhất là hai hàng", () => {
    const oneRow = HOME_FEATURE_CARD_HEIGHT;
    const twoRows = HOME_FEATURE_CARD_HEIGHT * 2 + HOME_FEATURE_GRID_GAP;

    expect(getHomeShortcutPagerHeight(0)).toBe(0);
    expect(getHomeShortcutPagerHeight(2)).toBe(oneRow);
    expect(getHomeShortcutPagerHeight(3)).toBe(oneRow);
    expect(getHomeShortcutPagerHeight(4)).toBe(twoRows);
    expect(getHomeShortcutPagerHeight(20)).toBe(twoRows);
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
