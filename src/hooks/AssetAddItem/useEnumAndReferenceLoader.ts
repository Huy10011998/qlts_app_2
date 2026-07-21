import { useEffect } from "react";
import { TypeProperty } from "../../utils/Enum";
import { fetchEnumByField } from "../../utils/fetchField/FetchEnumField";
import { fetchReferenceByField } from "../../utils/fetchField/FetchReferenceField";
import type { Field, ReferenceDataMap } from "../../types/index";

export function useEnumAndReferenceLoader(
  fieldActive: Field[],
  setEnumData: any,
  setReferenceData: any,
  referenceData: ReferenceDataMap,
) {
  useEffect(() => {
    fieldActive.forEach((f) => {
      if (f.typeProperty === TypeProperty.Enum && f.enumName) {
        fetchEnumByField(f.enumName, f.name, setEnumData);
      }

      if (
        f.typeProperty === TypeProperty.Reference &&
        f.referenceName &&
        !f.parentsFields &&
        !referenceData[f.name]
      ) {
        fetchReferenceByField(f.referenceName, f.name, setReferenceData, {
          pageSize: 20,
          skipSize: 0,
        });
      }
    });
  }, [fieldActive, referenceData, setEnumData, setReferenceData]);
}
