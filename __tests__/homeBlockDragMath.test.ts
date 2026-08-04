import {
  buildBlockOffsets,
  getBlockShift,
  resolveDropIndex,
} from "../src/screens/Home/shared/homeBlockDragMath";

// Năm khối cao thấp khác nhau, y như Trang chủ thật: lưới số liệu cao, hàng
// shortcut thấp.
const HEIGHTS = [240, 130, 200, 180, 260];
const OFFSETS = buildBlockOffsets(HEIGHTS);

describe("buildBlockOffsets", () => {
  it("dồn chiều cao thành mép trên của từng khối", () => {
    expect(OFFSETS).toEqual([0, 240, 370, 570, 750]);
    expect(buildBlockOffsets([])).toEqual([]);
  });
});

describe("resolveDropIndex", () => {
  const resolve = (fromIndex: number, translateY: number) =>
    resolveDropIndex({
      offsets: OFFSETS,
      heights: HEIGHTS,
      fromIndex,
      translateY,
    });

  it("chưa qua điểm giữa khối kế tiếp thì giữ nguyên chỗ", () => {
    // Khối 0 tâm ở 120; điểm giữa khối 1 là 305 → cần kéo hơn 185pt.
    expect(resolve(0, 0)).toBe(0);
    expect(resolve(0, 180)).toBe(0);
    expect(resolve(0, 190)).toBe(1);
  });

  it("kéo lên tính theo điểm giữa khối phía trên", () => {
    // Khối 4 tâm ở 880; điểm giữa khối 3 là 660 → -220 là vừa đủ.
    expect(resolve(4, -215)).toBe(4);
    expect(resolve(4, -225)).toBe(3);
  });

  it("kéo dài thì nhảy qua nhiều khối, không vượt khỏi hai đầu danh sách", () => {
    expect(resolve(0, 600)).toBe(3);
    expect(resolve(0, 10000)).toBe(4);
    expect(resolve(4, -10000)).toBe(0);
  });
});

describe("getBlockShift", () => {
  it("kéo xuống thì các khối bị vượt qua dồn lên đúng chiều cao khối đang kéo", () => {
    const shift = (index: number) =>
      getBlockShift({ index, fromIndex: 0, toIndex: 2, movedHeight: 240 });

    expect(shift(0)).toBe(0);
    expect(shift(1)).toBe(-240);
    expect(shift(2)).toBe(-240);
    // Ngoài đoạn bị ảnh hưởng thì đứng yên.
    expect(shift(3)).toBe(0);
  });

  it("kéo lên thì các khối bị vượt qua dồn xuống", () => {
    const shift = (index: number) =>
      getBlockShift({ index, fromIndex: 3, toIndex: 1, movedHeight: 180 });

    expect(shift(0)).toBe(0);
    expect(shift(1)).toBe(180);
    expect(shift(2)).toBe(180);
    expect(shift(3)).toBe(0);
  });

  it("thả lại đúng chỗ cũ thì không khối nào phải dịch", () => {
    HEIGHTS.forEach((_height, index) => {
      expect(
        getBlockShift({ index, fromIndex: 2, toIndex: 2, movedHeight: 200 })
      ).toBe(0);
    });
  });
});
