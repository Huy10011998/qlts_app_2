import { Dispatch, SetStateAction } from "react";
import type { Field } from "../../types/model.d";
import { fetchReferenceByField } from "../../utils/fetchField/FetchReferenceField";
import { warn } from "../../utils/Logger";
import { fetchReferenceByFieldWithParent } from "../../utils/cascade/FetchReferenceByFieldWithParent";
import { getParentGate, type ParentGate } from "../../utils/cascade/parentGate";

export type ReferenceDataSetter = Dispatch<SetStateAction<any>>;

export type ReferenceRequestParams = {
  textSearch?: string;
  pageSize?: number;
  skipSize?: number;
  append?: boolean;
  currentIds?: Array<string | number>;
};

type LoadReferenceItemsArgs = {
  field: Field;
  formData: Record<string, any>;
  setReferenceData: ReferenceDataSetter;
  params?: ReferenceRequestParams;
  /**
   * Có báo cho người dùng khi thiếu cấp cha hay không. KHÔNG phải cờ bật/tắt
   * validate — thiếu cấp cha thì luôn bị chặn, xem `loadReferenceItemsForField`.
   */
  alertOnMissingParents?: boolean;
  onMissingParents?: (gate: ParentGate) => void;
};

export const getCurrentReferenceIds = (
  formData: Record<string, any>,
  fieldName: string,
) => {
  const currentValue = formData[fieldName];

  if (currentValue == null || currentValue === "") {
    return [];
  }

  return [currentValue];
};

/**
 * Wrapper mỏng quanh `getParentGate` — luật "đủ cấp cha" nằm ở
 * `src/utils/cascade/parentGate.ts`, đây chỉ giữ lại tên export cũ cho call
 * site sẵn có.
 *
 * CỐ Ý không trả ra danh sách giá trị cha đã lọc: bản cũ `.filter()` bỏ cấp
 * thiếu rồi mới `join(",")`, sinh chuỗi `lstParent` LỆCH VỊ TRÍ (khai "A,B,C"
 * mà chỉ có B,C thì gửi "<B>,<C>", server hiểu là cấp 1,2) -> danh mục khớp
 * sai, user chọn vào là lưu sai. Muốn chuỗi thì lấy `gate.lstParent`.
 */
export const getReferenceParentContext = (
  formData: Record<string, any>,
  parentsFields?: string,
) => {
  const gate = getParentGate({ name: "", parentsFields } as any, formData);

  return {
    hasParentsFields: gate.hasParents,
    parentFields: gate.parentFields,
    hasAllParents: gate.hasParents && gate.isReady,
    gate,
  };
};

export const buildReferenceFetchParams = ({
  pageSize,
  page = 0,
  textSearch = "",
  append = false,
  currentIds,
}: {
  pageSize: number;
  page?: number;
  textSearch?: string;
  append?: boolean;
  currentIds?: Array<string | number>;
}) => ({
  textSearch,
  pageSize,
  skipSize: page * pageSize,
  append,
  currentIds,
});

/**
 * Nạp danh mục cho một field reference.
 *
 * CHẶN CỨNG khi thiếu cấp cha, không phụ thuộc `alertOnMissingParents`: chuỗi
 * `lstParent` bị nối thẳng vào câu SelectSql của `dbo.Config_Table_Category`
 * nên thiếu vế là lỗi SQL 500 (cấu hình 1 cấp) hoặc khớp sai dòng có cấp cuối
 * NULL (cấu hình n cấp) — xem `src/utils/cascade/parentGate.ts`.
 *
 * Trả `false` khi bị chặn. Nơi gọi KHÔNG được nhân cơ hội đó để xoá giá trị
 * đang chọn: nhãn hiển thị lấy từ `<field>_MoTa` nên vẫn đúng dù `items` rỗng.
 */
export const loadReferenceItemsForField = async ({
  field,
  formData,
  setReferenceData,
  params,
  alertOnMissingParents = false,
  onMissingParents,
}: LoadReferenceItemsArgs) => {
  if (!field.referenceName) return null;

  const gate = getParentGate(field, formData);

  if (gate.hasParents && !gate.isReady) {
    /* Log để dò được ca "ô chọn bị khoá mà đáng ra phải mở": BE trả giá trị cha
       không parse ra số (mã, GUID), hoặc trả null rồi mới đắp sau. */
    warn("[loadReferenceItemsForField] thiếu cấp cha, không gọi API:", {
      fieldName: field.name,
      parentFields: gate.parentFields,
      missingFields: gate.missingFields,
      rawValues: gate.parentFields.map((name) => formData?.[name]),
    });

    if (alertOnMissingParents) onMissingParents?.(gate);
    return false;
  }

  if (gate.hasParents) {
    return fetchReferenceByFieldWithParent(
      field.referenceName,
      field.name,
      gate.lstParent!,
      setReferenceData,
      params,
    );
  }

  return fetchReferenceByField(
    field.referenceName,
    field.name,
    setReferenceData,
    params,
  );
};
