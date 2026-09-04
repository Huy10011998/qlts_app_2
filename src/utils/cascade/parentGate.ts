import type { Field } from "../../types/model.d";
import { parseCsv } from "../helpers/string";

/**
 * Cổng "đủ cấp cha" cho ô chọn danh mục có chuỗi cấp trên
 * (Complex -> Building -> Unit -> Room).
 *
 * Đây là NGUỒN SỰ THẬT DUY NHẤT của luật này. Trước đây luật bị viết lại ở 5
 * chỗ (loader, cascade, Edit, Clone, picker) và mỗi bản một kiểu, dẫn tới bug
 * dưới đây.
 *
 * Vì sao phải chặn cứng: `lstParent` gửi cho `/Common/get-category` bị NỐI
 * THẲNG vào câu SelectSql khai trong `dbo.Config_Table_Category` (REPLACE
 * chuỗi, không phải tham số), nên thiếu một vế là hỏng theo 2 kiểu:
 *
 *   cấu hình 1 cấp   `ID_Complex = N'{{@lstParent}}'`
 *     "1,"    -> lỗi SQL "Conversion failed ... to data type int" (API 500)
 *
 *   cấu hình n cấp   `CONCAT(ID_Complex,',',ID_Building,',',ID_Unit) = N'{{@lstParent}}'`
 *     "3,14," -> KHÔNG lỗi nhưng KHỚP SAI: trả về các dòng có cấp cuối NULL
 *                (CONCAT coi NULL là ''), tức danh mục của "không thuộc cha
 *                nào". User chọn vào là LƯU SAI mà không thấy báo gì.
 *
 * Bug cũ của app còn một biến thể thứ ba: nó `.filter()` bỏ cấp thiếu TRƯỚC khi
 * join, nên không sinh vế rỗng nhưng sinh chuỗi LỆCH VỊ TRÍ — `parentsFields`
 * khai "A,B,C" mà chỉ có B và C thì gửi "<B>,<C>" và server hiểu đó là cấp 1,2.
 * Cùng hậu quả "khớp sai". Vì vậy `lstParent` ở đây join theo ĐÚNG THỨ TỰ KHAI
 * và không bao giờ được filter.
 *
 * QUYẾT ĐỊNH CÓ CHỦ ĐÍCH: app KHÔNG có bước "id đang chọn không nằm trong danh
 * mục -> gán null". Bên web có bước đó nhưng chỉ chạy khi API trả về THÀNH
 * CÔNG. Thêm bước đó vào app mà không chốt đúng điều kiện thì danh mục rỗng
 * (thiếu vế cha, hoặc lỗi 500) sẽ XOÁ TRẮNG giá trị đã lưu của dòng đang SỬA —
 * người dùng bấm Lưu là mất dữ liệu mà không thấy báo gì. Đừng thêm.
 */

export type ParentGate = {
  /** Field có khai `parentsFields` hay không. */
  hasParents: boolean;
  /** Tên các field cha, đúng thứ tự khai trong metadata. */
  parentFields: string[];
  /** ID các cấp cha, cùng thứ tự với `parentFields`. Chỉ có nghĩa khi `isReady`. */
  ids: number[];
  /** Tên các field cha chưa có ID parse ra được số nguyên. */
  missingFields: string[];
  /** `true` khi field không có cấp cha, hoặc MỌI cấp đã parse ra số nguyên. */
  isReady: boolean;
  /** Chuỗi gửi lên `lstParent`: `null` khi chưa đủ vế, `""` khi field không có cấp cha. */
  lstParent: string | null;
};

/**
 * Đổi giá trị cha thành ID gửi lên được, hoặc `null` nếu không dùng được.
 *
 * Chấp nhận `0` (là ID hợp lệ — mấy chỗ code cũ dùng `every(p => formData[p])`
 * nên coi `0` là thiếu cha, sai). Loại số âm: `-1` là cờ server cố ý chặn ở
 * parent-value, không phải ID để đi lọc danh mục.
 */
export const toParentId = (value: unknown): number | null => {
  if (value == null) return null;
  if (typeof value === "boolean") return null;

  const raw = typeof value === "number" ? String(value) : String(value).trim();

  if (!/^\d+$/.test(raw)) return null;

  const parsed = Number(raw);

  return Number.isSafeInteger(parsed) ? parsed : null;
};

/** Tách `parentsFields` ("ID_Complex,ID_Building") thành danh sách tên field. */
export const parseParentFieldNames = (
  parentsFields?: string | null,
): string[] => {
  if (typeof parentsFields !== "string") return [];

  return parseCsv(parentsFields).filter((name) => name.length > 0);
};

/**
 * Hàm thuần, KHÔNG ghi log: nó được gọi cả trong lúc render (để làm xám ô chọn)
 * nên log ở đây là mỗi lần render một dòng. Chỗ chặn API mới log — xem
 * `loadReferenceItemsForField`.
 */
export const getParentGate = (
  field: Pick<Field, "name" | "parentsFields"> | null | undefined,
  formData: Record<string, any> | null | undefined,
): ParentGate => {
  const parentFields = parseParentFieldNames(field?.parentsFields);

  if (parentFields.length === 0) {
    return {
      hasParents: false,
      parentFields: [],
      ids: [],
      missingFields: [],
      isReady: true,
      lstParent: "",
    };
  }

  const ids: number[] = [];
  const missingFields: string[] = [];

  for (const parentField of parentFields) {
    const id = toParentId(formData?.[parentField]);

    if (id === null) {
      missingFields.push(parentField);
      continue;
    }

    ids.push(id);
  }

  const isReady = missingFields.length === 0;

  return {
    hasParents: true,
    parentFields,
    ids,
    missingFields,
    isReady,
    // Join theo ĐÚNG thứ tự khai. Không filter — xem doc-comment đầu file.
    lstParent: isReady ? ids.join(",") : null,
  };
};

/**
 * Câu nhắc người dùng chọn cấp trên. Lấy nhãn (`moTa`) từ `fieldActive` nếu có,
 * không thì dùng luôn tên cột.
 */
export const getParentGateMessage = (
  gate: ParentGate | null | undefined,
  fieldActive?: Field[],
): string => {
  const missing = gate?.missingFields ?? [];

  if (missing.length === 0) return "";

  const labels = missing.map((name) => {
    const found = fieldActive?.find((item) => item.name === name);
    return found?.moTa?.trim() || name;
  });

  return `Vui lòng chọn ${labels.join(", ")} trước`;
};
