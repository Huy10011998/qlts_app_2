import { useCallback, useMemo, useRef, useState } from "react";

/**
 * Ba kiểu "trống" của form coi là một: ô chưa có key là `undefined`, xoá trắng
 * là `""`, BE trả `null`. Không gộp thì chạm vào ô rồi xoá đi cũng thành "đã
 * sửa".
 */
const normalizeFormValue = (value: unknown) =>
  value === undefined || value === null || value === "" ? null : value;

const isSameFormValue = (a: unknown, b: unknown) => {
  const left = normalizeFormValue(a);
  const right = normalizeFormValue(b);

  if (left === right) return true;
  if (left === null || right === null) return false;

  if (typeof left === "object" || typeof right === "object") {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  // Số nạp từ BE là `5`, gõ lại vào ô thì thành chuỗi `"5"` — vẫn là một giá trị.
  return String(left) === String(right);
};

/**
 * Form có khác mốc hay không.
 *
 * Bỏ qua các key `_MoTa`: đó là nhãn hiển thị đi kèm giá trị, có lúc tải về sau
 * (tra nhãn reference bất đồng bộ) mà người dùng không đụng gì. Giá trị thật
 * đổi thì key gốc đã đổi theo, nên bỏ nhãn không làm sót thay đổi nào.
 */
export const hasAssetFormChanges = (
  baseline: Record<string, any>,
  current: Record<string, any>,
) => {
  const keys = new Set([...Object.keys(baseline), ...Object.keys(current)]);

  for (const key of keys) {
    if (key.endsWith("_MoTa")) continue;
    if (!isSameFormValue(baseline[key], current[key])) return true;
  }

  return false;
};

/**
 * Form tài sản đang có thay đổi chưa lưu hay không — dùng cho hộp thoại "Bỏ
 * thay đổi?" khi rời màn.
 *
 * Mốc so sánh chụp NGAY TRƯỚC lần sửa đầu tiên của người dùng, chứ không chụp
 * lúc mở màn: form thêm mới/sao chép còn tự điền thêm một lúc sau khi hiện (mã
 * tự tăng, giá trị mặc định, bộ cặp cấp cha, nhãn reference đều về bất đồng
 * bộ), không có thời điểm "tải xong" nào chắc chắn để chụp. Người dùng chỉ sửa
 * được khi đã thấy form, nên trạng thái ngay trước cú chạm đầu tiên chính là
 * form họ thấy lúc tải xong.
 *
 * Nơi gọi phải gọi `markUserEdit` ở mọi đường sửa do NGƯỜI DÙNG (ô nhập, picker,
 * chọn ảnh) và KHÔNG gọi ở đường code tự điền, không thì mở form rồi thoát
 * ngay cũng bị hỏi.
 */
export function useAssetFormDirty(formData: Record<string, any>) {
  const [baseline, setBaseline] = useState<Record<string, any> | null>(null);
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const markUserEdit = useCallback(() => {
    // Chụp ngoài updater: updater có thể chạy ở lượt render sau, lúc ref đã là
    // form SAU khi sửa.
    const snapshot = formDataRef.current;
    setBaseline((prev) => prev ?? snapshot);
  }, []);

  const isDirty = useMemo(
    () => baseline !== null && hasAssetFormChanges(baseline, formData),
    [baseline, formData],
  );

  return { isDirty, markUserEdit };
}
