import { useCallback } from "react";
import { handleCascadeChange } from "../../utils/cascade/Index";
import { Field } from "../../types/Index";

export function useCascadeForm(
  fieldActive: Field[],
  setFormData: any,
  setReferenceData: any,
) {
  const handleChange = useCallback(
    (name: string, value: any) => {
      handleCascadeChange({
        name,
        value,
        fieldActive,
        setFormData,
        setReferenceData,
      });
    },
    [fieldActive, setFormData, setReferenceData],
  );

  return { handleChange };
}
