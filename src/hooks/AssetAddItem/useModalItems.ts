import { useMemo } from "react";
import { TypeProperty } from "../../utils/Enum";
import { parseCsv } from "../../utils/helpers/string";
import type { Field } from "../../types/model.d";

export type ModalItem = {
  value: string;
  text: string;
};

const hasDisplayText = (text: unknown) =>
  text !== null && text !== undefined && String(text).trim() !== "";

export const useModalItems = (
  activeEnumField: Field | null,
  referenceData: Record<string, { items: ModalItem[] }>,
  enumData: Record<string, ModalItem[]>,
  formData?: Record<string, any>,
  keyword = "",
): ModalItem[] => {
  const isKeywordSearch = keyword.trim() !== "";

  return useMemo(() => {
    if (!activeEnumField) return [];

    const base =
      activeEnumField.typeProperty === TypeProperty.Reference
        ? referenceData[activeEnumField.name]?.items ?? []
        : enumData[activeEnumField.name] ?? [];

    const selectedValue = formData?.[activeEnumField.name];
    const selectedText = formData?.[`${activeEnumField.name}_MoTa`];
    const hasSelectedValue =
      selectedValue !== null && selectedValue !== undefined && selectedValue !== "";
    const selectedValues =
      activeEnumField.isMulti && hasSelectedValue
        ? parseCsv(String(selectedValue)).filter(Boolean)
        : [String(selectedValue ?? "")];

    const selectedTexts =
      activeEnumField.isMulti && selectedText
        ? parseCsv(String(selectedText))
        : [String(selectedText ?? "").trim()];

    /* Giá trị đang lưu mà trang hiện tại không có thì chèn vào để vẫn thấy nó.
       Đang tìm theo từ khoá thì thôi: chèn vào là hiện cả dòng không khớp từ
       khoá, kể cả dòng người dùng vừa bỏ chọn trong picker. */
    const selectedItem =
      hasSelectedValue && !isKeywordSearch
        ? selectedValues
            // Ghép text theo vị trí gốc trước khi lọc, lọc rồi thì index lệch.
            .map((value, index) => ({ value, text: selectedTexts[index] }))
            .filter(
              (item) =>
                item.value !== "" &&
                hasDisplayText(item.text) &&
                !base.some((baseItem) => String(baseItem.value) === item.value),
            )
        : [];

    return [
      { value: "", text: activeEnumField.moTa },
      ...selectedItem,
      ...base,
    ];
  }, [activeEnumField, referenceData, enumData, formData, isKeywordSearch]);
};
