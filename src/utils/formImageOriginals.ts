/**
 * Ảnh gốc của từng field ảnh trong một lần mở form — tức ảnh đầu tiên tải từ BE
 * về, để nút "Hoàn tác về ảnh gốc" luôn trả đúng ảnh đó.
 *
 * Phải để ngoài component: nhóm trường trong form gập lại là các field bị tháo
 * khỏi cây (`{!collapsed && fields.map(...)}`), mọi state/ref bên trong mất sạch.
 * Gập rồi mở lại nhóm mà mốc ảnh gốc mất thì ảnh mới vừa chọn bị hiểu thành ảnh
 * gốc, hoàn tác không còn đường về.
 */
export type FormImageSnapshot = {
  /** Ảnh đang hiện được (data-uri hoặc file trên máy). */
  preview: string;
  /** Giá trị tương ứng trong formData — cái sẽ gửi lên khi lưu. */
  value: any;
};

const originals = new Map<string, FormImageSnapshot | null>();
const touched = new Set<string>();

/** Xóa sạch khi mở một form khác: mốc của bản ghi cũ không còn nghĩa gì. */
export const resetFormImageOriginals = () => {
  originals.clear();
  touched.clear();
};

/**
 * Ghi mốc ảnh gốc. Preview ảnh gốc phải tải từ server nên về muộn, vì vậy còn
 * cập nhật cho tới khi người dùng động vào field lần đầu.
 */
export const trackFormImageOriginal = (
  fieldName: string,
  snapshot: FormImageSnapshot | null,
) => {
  if (touched.has(fieldName)) return;
  originals.set(fieldName, snapshot);
};

export const getFormImageOriginal = (fieldName: string) =>
  originals.get(fieldName) ?? null;

export const markFormImageTouched = (fieldName: string) => {
  touched.add(fieldName);
};

export const clearFormImageTouched = (fieldName: string) => {
  touched.delete(fieldName);
};

export const isFormImageTouched = (fieldName: string) => touched.has(fieldName);
