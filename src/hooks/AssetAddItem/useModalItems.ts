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
): ModalItem[] => {
  return useMemo(() => {
    if (!activeEnumField) return [];

    const base =
      activeEnumField.typeProperty === TypeProperty.Reference
        ? referenceData[activeEnumField.name]?.items ?? []
        : enumData[activeEnumField.name] ?? [];

    return [{ value: "", text: activeEnumField.moTa }, ...base];
  }, [activeEnumField, referenceData, enumData]);
};
