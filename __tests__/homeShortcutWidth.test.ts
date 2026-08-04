import {
  getHomeShortcutCardWidth,
  HOME_FEATURE_GRID_GAP,
  HOME_SHORTCUT_VISIBLE_CARDS,
} from "../src/screens/Home/HomeScreen.styles";

// iPhone 14: 390 - 16*2 lề nội dung.
const CONTENT_WIDTH = 358;

const rightEdgeOfCard = (cardWidth: number, index: number) =>
  (index + 1) * cardWidth + index * HOME_FEATURE_GRID_GAP;

describe("bề rộng card hàng Truy cập nhanh", () => {
  it("ghim vừa đúng 4 thì hàng lấp kín, không chừa khoảng trống", () => {
    const cardWidth = getHomeShortcutCardWidth(
      CONTENT_WIDTH,
      HOME_SHORTCUT_VISIBLE_CARDS,
    );

    expect(
      rightEdgeOfCard(cardWidth, HOME_SHORTCUT_VISIBLE_CARDS - 1),
    ).toBeCloseTo(CONTENT_WIDTH);
  });

  it("ghim ít hơn 4 vẫn giữ nguyên bề rộng như khi có 4", () => {
    const fourCardWidth = getHomeShortcutCardWidth(CONTENT_WIDTH, 4);

    [1, 2, 3].forEach((itemCount) => {
      expect(getHomeShortcutCardWidth(CONTENT_WIDTH, itemCount)).toBeCloseTo(
        fourCardWidth,
      );
    });
  });

  // Đây là điểm yếu của cuộn ngang: không thấy gì bên phải thì user không biết
  // là còn nữa. Card thứ 5 phải hở ra một phần đủ nhìn.
  it("ghim quá 4 thì card thu nhỏ để card thứ 5 hở ra", () => {
    const fourCardWidth = getHomeShortcutCardWidth(CONTENT_WIDTH, 4);
    const cardWidth = getHomeShortcutCardWidth(CONTENT_WIDTH, 5);

    expect(cardWidth).toBeLessThan(fourCardWidth);

    const fifthCardStart = 4 * (cardWidth + HOME_FEATURE_GRID_GAP);
    const peek = CONTENT_WIDTH - fifthCardStart;

    expect(peek).toBeGreaterThanOrEqual(12);
    expect(peek).toBeLessThan(cardWidth);
  });

  it("giữ nguyên bề rộng khi ghim thêm nữa, chỉ dài thêm ra", () => {
    const fiveCardWidth = getHomeShortcutCardWidth(CONTENT_WIDTH, 5);

    [6, 9, 20].forEach((itemCount) => {
      expect(getHomeShortcutCardWidth(CONTENT_WIDTH, itemCount)).toBeCloseTo(
        fiveCardWidth,
      );
    });
  });

  it("co theo màn hình hẹp", () => {
    const seWidth = getHomeShortcutCardWidth(375 - 32, 4);
    const proMaxWidth = getHomeShortcutCardWidth(430 - 32, 4);

    expect(seWidth).toBeLessThan(proMaxWidth);
    expect(seWidth).toBeGreaterThan(0);
  });
});
