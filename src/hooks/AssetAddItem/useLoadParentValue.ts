import { useEffect } from "react";
import { TypeProperty } from "../../utils/Enum";
import { fetchReferenceByField } from "../../utils/fetchField/FetchReferenceField";

interface UseLoadParentValueParams {
  idRoot?: number | string;
  nameClassRoot?: string;
  nameClass?: string;
  fieldActive: any[];
  getParentValue: (nameClassRoot: string, payload: any) => Promise<any>;
  setReferenceData: any;
  handleChange: (fieldName: string, value: number) => void;
}

export const useLoadParentValue = ({
  idRoot,
  nameClassRoot,
  nameClass,
  fieldActive,
  getParentValue,
  setReferenceData,
  handleChange,
}: UseLoadParentValueParams) => {
  useEffect(() => {
    if (!idRoot || !nameClassRoot || !nameClass) return;

    let isMounted = true;

    const fetchData = async () => {
      try {
        const payload = {
          idClass: idRoot,
          nameClass: nameClassRoot,
          nameReference: nameClass,
        };

        const res = await getParentValue(nameClassRoot, payload);
        if (!isMounted || !res?.data) return;

        const { parentsFields, parentsValues } = res.data;
        if (!Array.isArray(parentsFields)) return;

        // STEP 1: load reference trước
        for (let i = 0; i < parentsFields.length; i++) {
          const fieldName = parentsFields[i];
          const f = fieldActive.find((fi) => fi.name === fieldName);

          if (f?.typeProperty === TypeProperty.Reference && f.referenceName) {
            await fetchReferenceByField(
              f.referenceName,
              f.name,
              setReferenceData,
            );
          }
        }

        // STEP 2: set value sau khi đã có options
        parentsFields.forEach((fieldName: string, index: number) => {
          const rawValue = parentsValues[index];
          if (rawValue == null) return;

          handleChange(fieldName, Number(rawValue));
        });
      } catch (err) {
        console.warn("[getParentValue] failed:", err);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [idRoot, nameClassRoot, nameClass, fieldActive]);
};
