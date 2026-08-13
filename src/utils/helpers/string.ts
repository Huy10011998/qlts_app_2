export const removeVietnameseTones = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
};

export function capitalizeFirstLetter(str?: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const normalizeClassName = (name?: string) => {
  if (!name) return "";

  if (/_/.test(name) && /[A-Z]/.test(name)) {
    return name.trim();
  }

  if (!/_/.test(name) && /[A-Z]/.test(name)) {
    return name.trim();
  }

  const clean = name.replace(/[_\-\s]+/g, " ");

  if (/^[a-z\s]+$/.test(clean)) {
    return clean
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join("");
  }

  return clean.trim();
};

export const isEffectivelyEmptyCodeValue = (value: unknown) => {
  if (value == null) return true;
  if (typeof value !== "string") return false;

  const normalized = value.trim();
  return normalized === "" || normalized === ":";
};

/**
 * Split a comma-separated string into trimmed parts (e.g. `parentsFields`,
 * multi-select values). Does not drop empty segments — chain `.filter(Boolean)`
 * when the caller needs that.
 */
export const parseCsv = (value: string): string[] =>
  value.split(",").map((part) => part.trim());

export type HighlightSegment = { text: string; match: boolean };

/**
 * Cắt nhãn thành các đoạn để tô phần khớp từ khoá.
 *
 * Bộ lọc so khớp sau khi bỏ dấu (`removeVietnameseTones`), nên tô cũng phải so
 * trên bản bỏ dấu — nếu không, gõ "tai san" sẽ không tô được "Tài sản". Bỏ dấu
 * từng ký tự một và ghi lại vị trí gốc, vì có ký tự bỏ dấu ra độ dài khác nên
 * không thể lấy chỉ số của bản bỏ dấu áp thẳng vào chuỗi gốc.
 */
export const splitHighlight = (
  text: string,
  searchText: string,
): HighlightSegment[] => {
  const keyword = removeVietnameseTones(searchText.trim());
  if (!keyword) return [{ text, match: false }];

  let folded = "";
  const originalIndexes: number[] = [];

  for (let i = 0; i < text.length; i++) {
    const piece = removeVietnameseTones(text[i]);

    for (let k = 0; k < piece.length; k++) {
      folded += piece[k];
      originalIndexes.push(i);
    }
  }

  const at = folded.indexOf(keyword);
  if (at < 0) return [{ text, match: false }];

  const start = originalIndexes[at];
  const end = (originalIndexes[at + keyword.length - 1] ?? start) + 1;

  return [
    { text: text.slice(0, start), match: false },
    { text: text.slice(start, end), match: true },
    { text: text.slice(end), match: false },
  ].filter((segment) => segment.text.length > 0);
};
