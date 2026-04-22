import { useMemo } from "react";
import { TypeProperty } from "../../utils/Enum";
import { Field } from "../../types/Model.d";

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

    const hasSelectedInBase = base.some(
      (item) => String(item.value) === String(selectedValue),
    );

    const selectedItem =
      hasSelectedValue && !hasSelectedInBase
        ? [
            {
              value: String(selectedValue),
              text: selectedText || String(selectedValue),
            },
          ]
        : [];

    return [
      { value: "", text: activeEnumField.moTa },
      ...selectedItem,
      ...base,
    ];
  }, [activeEnumField, referenceData, enumData, formData]);
};
