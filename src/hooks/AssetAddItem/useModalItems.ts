import { useMemo } from "react";
import { TypeProperty } from "../../utils/Enum";
import type { Field } from "../../types/model.d";

export type ModalItem = {
  value: string;
  text: string;
};

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
        ? String(selectedValue)
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : [String(selectedValue ?? "")];

    const selectedTexts =
      activeEnumField.isMulti && selectedText
        ? String(selectedText).split(",").map((text) => text.trim())
        : [];

    const selectedItem = hasSelectedValue
      ? selectedValues
          .filter(
            (value) =>
              value !== "" &&
              !base.some((item) => String(item.value) === String(value)),
          )
          .map((value, index) => ({
            value,
            text: selectedTexts[index] || value,
          }))
      : [];

    return [
      { value: "", text: activeEnumField.moTa },
      ...selectedItem,
      ...base,
    ];
  }, [activeEnumField, referenceData, enumData, formData]);
};
