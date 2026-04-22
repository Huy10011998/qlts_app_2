import { useEffect } from "react";
import { TypeProperty } from "../../utils/Enum";
import { fetchReferenceByField } from "../../utils/fetchField/FetchReferenceField";
import { getDetails, getFieldActive } from "../../services/Index";
import { getMatchedKey } from "../../utils/Helper";

interface UseLoadParentValueParams {
  idRoot?: number | string;
  nameClassRoot?: string;
  nameClass?: string;
  fieldActive: any[];
  getParentValue: (nameClassRoot: string, payload: any) => Promise<any>;
  setReferenceData: any;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  handleChange: (fieldName: string, value: number) => void;
}

const resolveReferenceLabel = async (
  referenceName: string,
  id: string | number,
) => {
  try {
    const [fieldRes, detailRes] = await Promise.all([
      getFieldActive(referenceName),
      getDetails(referenceName, String(id)),
    ]);

    const refFields = fieldRes?.data ?? [];
    const detail = detailRes?.data ?? {};

    const prioritizedFields = [
      ...refFields.filter((f: any) => f.isShowMobile),
      ...refFields.filter((f: any) => !f.isShowMobile),
    ];

    for (const field of prioritizedFields) {
      const matchedMoTaKey = getMatchedKey(detail, `${field.name}_MoTa`);
      const matchedValueKey = getMatchedKey(detail, field.name);
      const raw =
        (matchedMoTaKey && detail?.[matchedMoTaKey]) ??
        (matchedValueKey && detail?.[matchedValueKey]);

      if (raw != null && raw !== "") {
        return String(raw);
      }
    }

    const fallbackKey = Object.keys(detail).find((key) =>
      /(mota|ten|name|ma|code)/i.test(key),
    );

    if (fallbackKey && detail[fallbackKey] != null && detail[fallbackKey] !== "") {
      return String(detail[fallbackKey]);
    }
  } catch (err) {
    console.warn("[resolveReferenceLabel] failed:", err);
  }

  return "";
};

export const useLoadParentValue = ({
  idRoot,
  nameClassRoot,
  nameClass,
  fieldActive,
  getParentValue,
  setReferenceData,
  setFormData,
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
          const rawValue = parentsValues[i];
          const f = fieldActive.find((fi) => fi.name === fieldName);

          if (
            f?.typeProperty === TypeProperty.Reference &&
            f.referenceName &&
            rawValue != null &&
            rawValue !== ""
          ) {
            await fetchReferenceByField(
              f.referenceName,
              f.name,
              setReferenceData,
              { currentIds: [rawValue] },
            );

            const label = await resolveReferenceLabel(f.referenceName, rawValue);
            if (label) {
              setFormData((prev) => ({
                ...prev,
                [`${fieldName}_MoTa`]: label,
              }));
            }
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
