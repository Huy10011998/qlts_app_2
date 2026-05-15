import { useEffect } from "react";
import { Field } from "../../types/Index";
import { TypeProperty } from "../../utils/Enum";
import {
  loadReferenceItemsForField,
  ReferenceDataSetter,
} from "./referenceLoaderHelpers";
import {
  resolveReferenceLabel,
  syncResolvedReferenceField,
} from "./loadParentValueHelpers";

interface Props {
  selectedTreeValue: string | null;
  selectedTreeProperty: string | null;
  fieldActive: Field[];
  handleChange: (name: string, value: any) => void;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setReferenceData: ReferenceDataSetter;
}

export function useTreeToForm({
  selectedTreeProperty,
  selectedTreeValue,
  fieldActive,
  handleChange,
  setFormData,
  setReferenceData,
}: Props) {
  useEffect(() => {
    if (!selectedTreeProperty || !selectedTreeValue) return;

    let isMounted = true;
    const props = selectedTreeProperty.split(",");
    const rawValues = selectedTreeValue.split(",");
    const nextFormValues: Record<string, any> = {};

    const syncTreeReferenceLabels = async () => {
      for (let i = 0; i < props.length; i += 1) {
        const fieldName = props[i];
        const field = fieldActive.find((fi) => fi.name === fieldName);
        if (
          !field ||
          field.typeProperty !== TypeProperty.Reference ||
          !field.referenceName
        ) {
          continue;
        }

        const rawValue = rawValues[i];
        if (rawValue == null || rawValue === "") continue;

        const loadedReference = await loadReferenceItemsForField({
          field,
          formData: nextFormValues,
          setReferenceData,
          params: {
            currentIds: [rawValue],
          },
        });

        if (!isMounted) return;

        const loadedItems =
          loadedReference &&
          typeof loadedReference === "object" &&
          "items" in loadedReference
            ? loadedReference.items
            : [];

        let label = loadedItems.find(
          (item: any) => String(item.value) === String(rawValue),
        )?.text;

        if (!label) {
          label = await resolveReferenceLabel(field.referenceName, rawValue);
        }

        if (!isMounted || !label) continue;

        syncResolvedReferenceField({
          fieldName,
          rawValue,
          label,
          setFormData,
          setReferenceData,
        });
      }
    };

    props.forEach((p, i) => {
      const f = fieldActive.find((fi) => fi.name === p);
      if (!f) return;

      const raw = rawValues[i];
      if (raw == null) return;

      const numVal = Number(raw);
      if (!isNaN(numVal) && numVal < 0) return;

      const normalizedValue = !isNaN(numVal) ? String(numVal) : raw;

      nextFormValues[f.name] = normalizedValue;
      handleChange(f.name, normalizedValue);
    });

    syncTreeReferenceLabels();

    return () => {
      isMounted = false;
    };
  }, [
    fieldActive,
    handleChange,
    setFormData,
    setReferenceData,
    selectedTreeProperty,
    selectedTreeValue,
  ]);
}
