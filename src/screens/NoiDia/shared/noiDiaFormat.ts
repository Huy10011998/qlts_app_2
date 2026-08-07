/** Ô trống trong các bảng vị trí — giữ đúng số dòng thay vì bỏ dòng đi. */
export const EMPTY_VALUE = "—";

const pad = (value: number) => String(value).padStart(2, "0");

const parseDate = (raw?: string | null) => {
  if (!raw) return null;

  const parsed = new Date(raw);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** "2026-08-06T14:35:00" → "06/08/2026 14:35" */
export const formatNoiDiaDateTime = (raw?: string | null) => {
  const date = parseDate(raw);
  if (!date) return EMPTY_VALUE;

  return `${pad(date.getDate())}/${pad(
    date.getMonth() + 1,
  )}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** Giá trị hiển thị: null / rỗng / "--" của BE đều quy về một dấu gạch. */
export const displayValue = (raw?: string | number | null) => {
  const text = raw === null || raw === undefined ? "" : String(raw).trim();

  return !text || text === "--" ? EMPTY_VALUE : text;
};

/**
 * Đường dẫn thumbnail 40x40 suy ra từ `filePath` gốc: thêm "_resize" vào TÊN
 * FOLDER cuối và vào TÊN FILE.
 *
 *   NoiDia_TuLanh\3158\6f1c.jpg → NoiDia_TuLanh\3158_resize\6f1c_resize.jpg
 *
 * Giữ nguyên dấu phân cách BE gửi lên (thường là "\") vì chuỗi này được gửi
 * ngược lại cho `preview-attach-property`.
 */
export const toThumbnailPath = (filePath?: string | null) => {
  if (!filePath) return "";

  const separatorIndex = Math.max(
    filePath.lastIndexOf("\\"),
    filePath.lastIndexOf("/"),
  );

  if (separatorIndex < 0) return filePath;

  const separator = filePath[separatorIndex];
  const folders = filePath.slice(0, separatorIndex);
  const fileName = filePath.slice(separatorIndex + 1);

  const folderSeparatorIndex = Math.max(
    folders.lastIndexOf("\\"),
    folders.lastIndexOf("/"),
  );
  const parentFolders =
    folderSeparatorIndex < 0 ? "" : folders.slice(0, folderSeparatorIndex + 1);
  const lastFolder = folders.slice(folderSeparatorIndex + 1);

  const dotIndex = fileName.lastIndexOf(".");
  const name = dotIndex < 0 ? fileName : fileName.slice(0, dotIndex);
  const extension = dotIndex < 0 ? "" : fileName.slice(dotIndex);

  return `${parentFolders}${lastFolder}_resize${separator}${name}_resize${extension}`;
};

/** Mime type suy từ đuôi file, cho chuỗi data URI của ảnh preview. */
export const getImageMimeType = (filePath?: string | null) =>
  /\.png$/i.test(filePath ?? "") ? "image/png" : "image/jpeg";
