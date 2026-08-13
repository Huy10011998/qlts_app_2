import { splitHighlight } from "../src/utils/helpers/string";

describe("tô đoạn khớp trên nhãn", () => {
  it("không có từ khoá thì trả nguyên nhãn", () => {
    expect(splitHighlight("Tài sản", "")).toEqual([
      { text: "Tài sản", match: false },
    ]);
  });

  it("cắt đúng ba đoạn quanh phần khớp", () => {
    expect(splitHighlight("Hồ sơ dự án", "sơ")).toEqual([
      { text: "Hồ ", match: false },
      { text: "sơ", match: true },
      { text: " dự án", match: false },
    ]);
  });

  // Bộ lọc so khớp sau khi bỏ dấu, nên tô cũng phải bỏ dấu — gõ không dấu vẫn
  // phải tô đúng chữ có dấu trong nhãn gốc.
  it("gõ không dấu vẫn tô đúng chữ có dấu", () => {
    expect(splitHighlight("Tài sản", "tai san")).toEqual([
      { text: "Tài sản", match: true },
    ]);
  });

  it("tô đúng vị trí khi phần khớp nằm sau chữ có dấu", () => {
    expect(splitHighlight("Phương tiện vận tải", "van tai")).toEqual([
      { text: "Phương tiện ", match: false },
      { text: "vận tải", match: true },
    ]);
  });

  it("không khớp thì không tô gì", () => {
    expect(splitHighlight("Tài sản", "xyz")).toEqual([
      { text: "Tài sản", match: false },
    ]);
  });

  it("khớp chữ đ và chữ hoa", () => {
    expect(splitHighlight("Đơn vị", "don")).toEqual([
      { text: "Đơn", match: true },
      { text: " vị", match: false },
    ]);
  });
});
