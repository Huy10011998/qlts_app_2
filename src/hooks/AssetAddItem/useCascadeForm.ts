import { handleCascadeChange } from "../../utils/cascade/Index";
import { Field } from "../../types/Index";

export function useCascadeForm(
  fieldActive: Field[],
  setFormData: any,
  setReferenceData: any,
) {
  const handleChange = (name: string, value: any) => {
    handleCascadeChange({
      name,
      value,
      fieldActive,
      setFormData,
      setReferenceData,
    });
  };

  return { handleChange };
}
