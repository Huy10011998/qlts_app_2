import { formatAmLich, getAmLich, getNgayLe } from "../src/screens/Workflow/Lich/amLich";

const am = (y: number, m: number, d: number) => formatAmLich(getAmLich(new Date(y, m - 1, d)));

describe("đổi sang âm lịch", () => {
  it("mùng 1 Tết các năm gần đây", () => {
    expect(am(2025, 1, 29)).toBe("1/1");
    expect(am(2026, 2, 17)).toBe("1/1");
    expect(am(2027, 2, 6)).toBe("1/1");
    expect(getAmLich(new Date(2026, 1, 17)).year).toBe(2026);
  });

  it("ngày trước Tết vẫn thuộc năm âm cũ", () => {
    const giaoThua = getAmLich(new Date(2026, 1, 16));
    expect(giaoThua.month).toBe(12);
    expect(giaoThua.year).toBe(2025);
  });

  it("tháng 6 nhuận năm Ất Tỵ 2025", () => {
    expect(am(2025, 7, 25)).toBe("1/6 nhuận");
    expect(am(2025, 6, 25)).toBe("1/6");
  });

  it("Trung thu 2026 rơi vào 25/9", () => {
    expect(am(2026, 9, 25)).toBe("15/8");
  });});

describe("ngày lễ", () => {
  it("lễ dương lịch cố định", () => {
    expect(getNgayLe(new Date(2026, 8, 2))).toBe("Quốc khánh");
    expect(getNgayLe(new Date(2026, 3, 30))).toBe("Giải phóng miền Nam");
    expect(getNgayLe(new Date(2026, 4, 1))).toBe("Quốc tế Lao động");
    expect(getNgayLe(new Date(2027, 0, 1))).toBe("Tết Dương lịch");
  });

  it("Tết âm lịch và Giỗ Tổ theo âm lịch", () => {
    expect(getNgayLe(new Date(2026, 1, 16))).toBe("Giao thừa");
    expect(getNgayLe(new Date(2026, 1, 17))).toBe("Mùng 1 Tết");
    expect(getNgayLe(new Date(2026, 1, 19))).toBe("Mùng 3 Tết");
    expect(getNgayLe(new Date(2026, 1, 20))).toBeNull();
    expect(getNgayLe(new Date(2025, 3, 7))).toBe("Giỗ Tổ Hùng Vương");
  });

  it("ngày thường không có lễ", () => {
    expect(getNgayLe(new Date(2026, 9, 28))).toBeNull();
  });
});
