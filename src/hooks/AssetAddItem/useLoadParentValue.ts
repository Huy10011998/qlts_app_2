import { useEffect, useState } from "react";
import { log, warn } from "../../utils/Logger";
import type { Field } from "../../types/model.d";
import {
  buildParentValuePayload,
  collectParentAssignments,
  loadParentReferenceItems,
  resolveReferenceLabel,
  syncResolvedReferenceField,
} from "./loadParentValueHelpers";
import { primeParentValueCache } from "../parentValue/useParentValuePairs";

interface UseLoadParentValueParams {
  idRoot?: number | string;
  nameClassRoot?: string;
  nameClass?: string;
  fieldActive: Field[];
  getParentValue: (nameClassRoot: string, payload: any) => Promise<any>;
  setReferenceData: any;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

export const useLoadParentValue = ({
  idRoot,
  nameClassRoot,
  nameClass,
  fieldActive,
  getParentValue,
  setReferenceData,
  setFormData,
}: UseLoadParentValueParams) => {
  /* Tên các cột do parent-value điền. Nơi gọi cần biết để KHÔNG loại chúng khỏi
     payload insert: mục 4 của tài liệu BE yêu cầu bản ghi con phải mang đủ bộ
     cặp này (ví dụ ID_Complex/ID_Building/ID_Unit/ID_Room), kể cả khi metadata
     khai cột đó là isReadOnly. */
  const [parentFieldNames, setParentFieldNames] = useState<string[]>([]);

  useEffect(() => {
    if (!idRoot || !nameClassRoot || !nameClass) return;

    let isMounted = true;

    const fetchData = async () => {
      try {
        const payload = buildParentValuePayload(idRoot, nameClassRoot, nameClass);

        const res = await getParentValue(nameClassRoot, payload);
        if (!isMounted || !res?.data) return;

        const { parentsFields, parentsValues } = res.data;
        if (!Array.isArray(parentsFields)) return;

        /* Danh sách con và badge đếm dùng cùng bộ cặp này — nhồi vào cache để
           chúng không phải gọi lại API. */
        primeParentValueCache(nameClassRoot, idRoot, nameClass, {
          parentsFields,
          parentsValues: Array.isArray(parentsValues) ? parentsValues : [],
        });

        log("[useLoadParentValue] parent payload:", payload);
        log("[useLoadParentValue] parent response:", {
          parentsFields,
          parentsValues,
        });

        const { nextFormValues, referenceFieldsToLoad } = collectParentAssignments({
          parentsFields,
          parentsValues,
          fieldActive,
          idRoot,
          nameClassRoot,
        });

        setFormData((prev) => ({
          ...prev,
          ...nextFormValues,
        }));

        setParentFieldNames(Object.keys(nextFormValues));

        for (const referenceField of referenceFieldsToLoad) {
          const loadedItems = await loadParentReferenceItems({
            field: referenceField.field,
            rawValue: referenceField.rawValue,
            nextFormValues,
            setReferenceData,
          });

          let label = loadedItems.find(
            (item: any) => String(item.value) === String(referenceField.rawValue),
          )?.text;

          if (!label) {
            label = await resolveReferenceLabel(
              referenceField.field.referenceName,
              referenceField.rawValue,
              referenceField.fallbackReferenceName,
            );

            log("[useLoadParentValue] resolved reference label:", {
              fieldName: referenceField.field.name,
              referenceName: referenceField.field.referenceName,
              fallbackReferenceName: referenceField.fallbackReferenceName,
              rawValue: referenceField.rawValue,
              label,
            });
          }

          if (label) {
            syncResolvedReferenceField({
              fieldName: referenceField.field.name,
              rawValue: referenceField.rawValue,
              label,
              setFormData,
              setReferenceData,
            });
          }
        }
      } catch (err) {
        warn("[getParentValue] failed:", err);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [
    fieldActive,
    getParentValue,
    idRoot,
    nameClass,
    nameClassRoot,
    setFormData,
    setReferenceData,
  ]);

  return { parentFieldNames };
};
