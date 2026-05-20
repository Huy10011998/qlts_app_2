import { useCallback } from "react";
import { handleCascadeChange } from "../../utils/cascade/index";
import { Field } from "../../types/index";

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
