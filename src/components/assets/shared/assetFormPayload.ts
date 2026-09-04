import type { Field } from "../../../types/model.d";
import type { ParentGate } from "../../../utils/cascade/parentGate";

/**
 * Field `isReadOnly` đã bị loại khỏi form (`AssetFormGroupedFields`) nên giá trị
 * của nó không do người dùng nhập — nó đến từ default, prefill, hoặc bản gốc lúc
 * sao chép. Gửi lên là gửi dữ liệu người dùng không thấy và không kiểm soát
 * được; web cũng loại field readonly khỏi form thêm/sửa.
 *
 * Tài liệu BE (mục 4b): "isReadOnly = true -> web LOẠI field khỏi form thêm /
 * sửa (vẫn hiện ở lưới và màn chi tiết). App nên làm giống để không gửi lên
 * field máy tự tính." Áp cho cả update (`lstExcludeProperties`) và các nhánh
 * insert.
 */
export const getReadOnlyFieldNames = (fields: Field[]): string[] =>
  (fields ?? [])
    .filter((field) => field?.isReadOnly && field.name)
    .map((field) => field.name);

/**
 * Bỏ field readonly khỏi payload.
 *
 * `keepFields` là các cột BẮT BUỘC phải gửi dù metadata khai readonly, vì chính
 * tài liệu BE yêu cầu chúng có mặt trong entity:
 *
 *   · cột mã tự tăng — mục 4b: web gọi riêng `POST /api/{Class}/tu-dong-tang`
 *     rồi gửi kèm; ví dụ insert ở mục 4 có `"Ma": "BCC0125"`.
 *   · các cột do parent-value điền — mục 4: "gán TẤT CẢ cặp vào entity con", và
 *     ví dụ insert mang đủ `ID_Complex/ID_Building/ID_Unit/ID_Room`. Loại chúng
 *     là bản ghi con mất luôn khoá ngoại tới cha.
 */
export const stripReadOnlyFields = (
  fields: Field[],
  payload: Record<string, any>,
  keepFields: Array<string | undefined | null> = [],
): Record<string, any> => {
  const keep = new Set(
    keepFields.filter((name): name is string => !!name),
  );
  const next = { ...payload };

  getReadOnlyFieldNames(fields).forEach((name) => {
    if (keep.has(name)) return;
    delete next[name];
  });

  return next;
};

/**
 * Chuỗi cấp cha của ô combobox đang mở, để form "thêm nhanh" điền sẵn.
 *
 * Trả `{}` khi thiếu bất kỳ cấp nào — prefill nửa vời là bản ghi mới thuộc sai
 * cha, mà vẫn lưu được và không báo gì. `targetFields` là `fieldActive` của
 * class ĐÍCH: `parentsFields` là tên cột trên class đang nhập, không chắc trùng
 * tên cột ở class được thêm.
 */
export const buildQuickAddPrefill = (
  gate: ParentGate | null | undefined,
  formData: Record<string, any> | null | undefined,
  targetFields?: Field[],
): {
  values: Record<string, number>;
  labels: Record<string, string>;
} => {
  if (!gate?.hasParents || !gate.isReady) return { values: {}, labels: {} };

  const values: Record<string, number> = {};
  const labels: Record<string, string> = {};

  gate.parentFields.forEach((name, index) => {
    if (targetFields && !targetFields.some((field) => field?.name === name)) {
      return;
    }

    values[name] = gate.ids[index];

    const label = formData?.[`${name}_MoTa`];
    if (typeof label === "string" && label !== "") labels[name] = label;
  });

  return { values, labels };
};
