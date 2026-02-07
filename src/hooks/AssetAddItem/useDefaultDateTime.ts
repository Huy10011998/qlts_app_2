import { useEffect } from "react";
import { TypeProperty } from "../../utils/Enum";
import { formatDMY } from "../../utils/Date";
import { Field } from "../../types/Index";

export function useDefaultDateTime(fieldActive: Field[], setFormData: any) {
  useEffect(() => {
    setFormData((prev: any) => {
      const next = { ...prev };

      fieldActive.forEach((f) => {
        if (
          f.typeProperty === TypeProperty.Date &&
          f.defaultDateNow &&
          !next[f.name]
        ) {
          next[f.name] = formatDMY(new Date());
        }

        if (
          f.typeProperty === TypeProperty.Time &&
          f.defaultTimeNow &&
          !next[f.name]
        ) {
          const now = new Date();
          next[f.name] = `${String(now.getHours()).padStart(2, "0")}:${String(
            now.getMinutes(),
          ).padStart(2, "0")}`;
        }
      });

      return next;
    });
  }, [fieldActive]);
}
