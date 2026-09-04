import type { Conditions } from "../../types/model.d";
import { SqlOperator, TypeProperty } from "../../utils/Enum";

/**
 * Helper thuần cho API `POST /api/{ClassCha}/parent-value`.
 *
 * Server trả về hai mảng ĐI THEO CẶP theo chỉ số:
 *   { parentsFields: ["ID_Complex","ID_Building","ID_Unit","ID_Room"],
 *     parentsValues: ["3","14","98","8"] }
 *
 * Bộ cặp đó dùng cho ĐÚNG hai việc, và phải là cùng một bộ:
 *   1. lọc danh sách bản ghi CON (mỗi cặp -> 1 condition Equals kiểu Int)
 *   2. prefill khi THÊM MỚI bản ghi con
 *
 * Không được tự bỏ cặp nào: ngoài chuỗi tổ tiên, bộ cặp còn mang điều kiện phân
 * loại. Ví dụ class LinhKien có cha là MayTinh thì kèm cặp
 * `ID_LoaiThietBiCNTT = 7`; bỏ cặp đó là danh sách lẫn cả linh kiện của Server
 * (cha Server thì giá trị là 8).
 */

/**
 * Parse giá trị của một cặp. Trả `null` khi không dùng được -> BỎ cặp đó.
 *
 * GIỮ `-1`: đó là server CỐ Ý chặn (cặp cha-con không được phép hiện dữ liệu).
 * Gửi nguyên `-1` thì get-list trả rỗng và app hiện "Không có dữ liệu" — đúng ý.
 * Bỏ cặp `-1` đi là làm điều kiện rộng ra và hiện dữ liệu đáng ra phải chặn.
 */
export const parseParentIntValue = (raw: unknown): number | null => {
  if (raw == null) return null;
  if (typeof raw === "boolean") return null;

  const value = typeof raw === "number" ? String(raw) : String(raw).trim();

  if (!/^-?\d+$/.test(value)) return null;

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) ? parsed : null;
};

/**
 * Body của parent-value.
 *
 * Gửi CẢ HAI bộ tên key: BE đổi tên 3 field này từ 03/09/2026, nhưng không phải
 * môi trường nào cũng đã deploy bản mới. Key thừa thì System.Text.Json bỏ qua,
 * nên gửi cả hai là an toàn cho cả hai phía; gửi thiếu bộ nào thì bên đó bind ra
 * null và form con mất prefill mà KHÔNG báo lỗi (parent-value không trả 403 và
 * không có message nghiệp vụ).
 *
 * TODO: bỏ 3 key cũ (`idClass`/`nameClass`/`nameReference`) sau khi BE
 * parent-value mới đã lên hết môi trường.
 */
export const buildParentValuePayload = (
  idRoot: number | string,
  nameClassRoot: string,
  nameClass: string,
) => ({
  // Tên mới (spec 03/09/2026)
  ID_ParentClass: idRoot,
  Name_ParentClass: nameClassRoot,
  Name_ReferencesClass: nameClass,
  // Tên cũ — tương thích BE chưa deploy
  idClass: idRoot,
  nameClass: nameClassRoot,
  nameReference: nameClass,
});

/**
 * Đổi bộ cặp thành `Conditions` cho get-list của class con.
 *
 * Giữ cặp i khi `parentsFields[i]` khác rỗng VÀ `parentsValues[i]` parse ra được
 * số nguyên. Bắt buộc phải lọc: server không tự bỏ cặp lỗi và tầng dựng SQL của
 * get-list cũng không chặn, nên cặp có vế rỗng sẽ sinh câu SQL què (dạng
 * `[ID_Room] = `) -> lỗi 500 hoặc danh sách rỗng không rõ lý do.
 */
export const buildParentConditions = (
  parentsFields: unknown,
  parentsValues: unknown,
): Conditions[] => {
  if (!Array.isArray(parentsFields)) return [];

  const values = Array.isArray(parentsValues) ? parentsValues : [];
  const conditions: Conditions[] = [];

  for (let index = 0; index < parentsFields.length; index += 1) {
    const rawField = parentsFields[index];
    const property =
      typeof rawField === "string" ? rawField.trim() : "";

    if (!property) continue;

    const value = parseParentIntValue(values[index]);

    if (value === null) continue;

    conditions.push({
      property,
      operator: SqlOperator.Equals,
      value: String(value),
      type: TypeProperty.Int,
    });
  }

  return conditions;
};

/**
 * Chốt an toàn: bảo đảm điều kiện lọc KHÔNG BAO GIỜ rộng hơn cách làm cũ (chỉ
 * một điều kiện `propertyReference = idRoot`).
 *
 * Bộ cặp của server luôn có khoá ngoại tới cha ở cặp CUỐI, nên bình thường hàm
 * này không thêm gì. Nó chỉ đỡ trường hợp metadata khai thiếu: cặp cuối về với
 * tên field rỗng thì `buildParentConditions` đã bỏ, và nếu không thêm lại thì
 * danh sách sẽ hiện bản ghi con của MỌI bản ghi cha.
 */
export const mergeReferenceCondition = (
  conditions: Conditions[],
  propertyReference?: string,
  idRoot?: number | string,
): Conditions[] => {
  const property = propertyReference?.trim();
  const value = parseParentIntValue(idRoot);

  if (!property || value === null) return conditions;

  const alreadyHas = conditions.some(
    (condition) =>
      condition.property.toLowerCase() === property.toLowerCase(),
  );

  if (alreadyHas) return conditions;

  return [
    ...conditions,
    {
      property,
      operator: SqlOperator.Equals,
      value: String(value),
      type: TypeProperty.Int,
    },
  ];
};

/** Điều kiện lọc kiểu cũ — fallback khi chưa/không lấy được bộ cặp. */
export const buildReferenceOnlyConditions = (
  propertyReference?: string,
  idRoot?: number | string,
): Conditions[] => mergeReferenceCondition([], propertyReference, idRoot);

export const getParentValueCacheKey = (
  nameClassRoot: string,
  idRoot: number | string,
  nameClass: string,
) => `${nameClassRoot}|${idRoot}|${nameClass}`;
