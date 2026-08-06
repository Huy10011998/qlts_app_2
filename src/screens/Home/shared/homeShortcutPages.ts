// Truy cập nhanh chia trang giống lưới camera: mỗi trang là một lưới cố định,
// vuốt ngang để đổi trang, chấm tròn ở dưới cho biết đang ở trang nào.
export const HOME_SHORTCUT_COLUMNS = 3;
export const HOME_SHORTCUT_MAX_ROWS = 2;
export const HOME_SHORTCUT_PAGE_SIZE =
  HOME_SHORTCUT_COLUMNS * HOME_SHORTCUT_MAX_ROWS;

// Ghim ít hơn một hàng đầy thì lưới chỉ cao một hàng — không chừa hàng trống.
// Ghim nhiều hơn thì mọi trang cao đúng số hàng tối đa để hàng chấm tròn ở dưới
// không nhảy lên nhảy xuống mỗi lần đổi trang.
export const getHomeShortcutRowCount = (itemCount: number) => {
  if (itemCount <= 0) return 0;

  return Math.min(
    HOME_SHORTCUT_MAX_ROWS,
    Math.ceil(itemCount / HOME_SHORTCUT_COLUMNS),
  );
};

export const getHomeShortcutPageCount = (itemCount: number) =>
  itemCount <= 0 ? 0 : Math.ceil(itemCount / HOME_SHORTCUT_PAGE_SIZE);

export const chunkHomeShortcutPages = <T>(items: T[]): T[][] => {
  const pages: T[][] = [];

  for (
    let start = 0;
    start < items.length;
    start += HOME_SHORTCUT_PAGE_SIZE
  ) {
    pages.push(items.slice(start, start + HOME_SHORTCUT_PAGE_SIZE));
  }

  return pages;
};

// Cùng luật với lưới camera: quá 7 trang thì cửa sổ chấm tròn trượt theo trang
// đang xem, không kéo dài ra vô tận.
const MAX_VISIBLE_DOTS = 7;

export const getHomeShortcutVisiblePageIndexes = (
  page: number,
  totalPages: number,
) => {
  if (totalPages <= MAX_VISIBLE_DOTS) {
    return Array.from({ length: Math.max(totalPages, 0) }, (_, i) => i);
  }

  const half = Math.floor(MAX_VISIBLE_DOTS / 2);
  let start = Math.max(0, page - half);
  let end = start + MAX_VISIBLE_DOTS - 1;

  if (end >= totalPages) {
    end = totalPages - 1;
    start = Math.max(0, end - MAX_VISIBLE_DOTS + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};
