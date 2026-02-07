import { useEffect } from "react";
import { Field } from "../../types/Index";

interface Props {
  selectedTreeValue: string | null;
  selectedTreeProperty: string | null;
  fieldActive: Field[];
  handleChange: (name: string, value: any) => void;
  setReferenceData: any;
}

export function useTreeToForm({
  selectedTreeProperty,
  selectedTreeValue,
  fieldActive,
  handleChange,
  setReferenceData,
}: Props) {
  useEffect(() => {
    if (!selectedTreeProperty || !selectedTreeValue) return;

    const props = selectedTreeProperty.split(",");
    const rawValues = selectedTreeValue.split(",");

    props.forEach((p, i) => {
      const f = fieldActive.find((fi) => fi.name === p);
      if (!f) return;

      const raw = rawValues[i];
      if (raw == null) return;

      const numVal = Number(raw);
      if (!isNaN(numVal) && numVal < 0) return;

      handleChange(f.name, String(numVal));
    });

    setReferenceData({});
  }, [selectedTreeProperty, selectedTreeValue, fieldActive]);
}
