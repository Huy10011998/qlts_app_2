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
): ModalItem[] => {
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

    const selectedItem = hasSelectedValue
      ? selectedValues
          .filter(
            (value, index) =>
              value !== "" &&
              hasDisplayText(selectedTexts[index]) &&
              !base.some((item) => String(item.value) === String(value)),
          )
          .map((value, index) => ({
            value,
            text: selectedTexts[index],
          }))
      : [];

    return [
      { value: "", text: activeEnumField.moTa },
      ...selectedItem,
      ...base,
    ];
  }, [activeEnumField, referenceData, enumData, formData]);
};
