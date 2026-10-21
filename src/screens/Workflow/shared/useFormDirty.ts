import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Rỗng / null / undefined là một — ô chưa nhập và ô xoá trắng không tính là đổi.
 * Số BE trả (5) và chuỗi gõ lại vào ô ("5") cũng là một.
 */
const normalizeFormValue = (value: unknown) => {
  if (value === undefined || value === "") return null;
  return typeof value === "number" ? String(value) : value;
};

/**
 * Chuỗi so sánh của phần form động: chỉ lấy đúng các field của form. Các khoá phụ
 * (tên hiển thị `X_MoTa` của ô tham chiếu...) tự điền sau vài nhịp nên bỏ qua,
 * kẻo vừa mở form đã thành "có thay đổi".
 */
export const snapshotFormValues = (fieldNames: string[], data: Record<string, any>) =>
  JSON.stringify(fieldNames.map((name) => normalizeFormValue(data?.[name])));

/**
 * Form "có thay đổi chưa lưu" = người dùng đã chạm vào ít nhất một ô VÀ giá trị
 * hiện tại khác lúc chạm lần đầu (sửa rồi trả lại như cũ thì hết "dirty").
 *
 * Mốc so sánh lấy lúc chạm lần đầu chứ không lúc mở màn: form động còn tự điền
 * default / bản ghi đang sửa qua vài nhịp effect sau khi hiện — lấy mốc sớm thì
 * mốc lệch giá trị thật. Gọi `markTouched()` TRƯỚC khi đổi state của ô.
 *
 * `snapshot`: chuỗi gom mọi giá trị form (JSON.stringify), tính lại mỗi render.
 */
export function useFormDirty(snapshot: string) {
  const latestRef = useRef(snapshot);
  const [baseline, setBaseline] = useState<string | null>(null);

  useEffect(() => {
    latestRef.current = snapshot;
  }, [snapshot]);

  const markTouched = useCallback(() => {
    // Đọc ngoài updater: lúc này ref còn giữ giá trị TRƯỚC lần đổi sắp tới.
    const current = latestRef.current;
    setBaseline((prev) => prev ?? current);
  }, []);

  /** Vừa lưu xong lên server: giá trị hiện tại thành mốc mới. */
  const markSaved = useCallback(() => {
    setBaseline(latestRef.current);
  }, []);

  return {
    isDirty: baseline !== null && baseline !== snapshot,
    markTouched,
    markSaved,
  };
}
