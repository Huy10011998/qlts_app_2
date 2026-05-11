import { useEffect } from "react";
import { log } from "../../utils/Logger";
import {
  buildParentValuePayload,
  collectParentAssignments,
  loadParentReferenceItems,
  resolveReferenceLabel,
  syncResolvedReferenceField,
} from "./loadParentValueHelpers";

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
        const payload = buildParentValuePayload(idRoot, nameClassRoot, nameClass);

        const res = await getParentValue(nameClassRoot, payload);
        if (!isMounted || !res?.data) return;

        const { parentsFields, parentsValues } = res.data;
        if (!Array.isArray(parentsFields)) return;

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
        console.warn("[getParentValue] failed:", err);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [idRoot, nameClassRoot, nameClass, fieldActive]);
};
