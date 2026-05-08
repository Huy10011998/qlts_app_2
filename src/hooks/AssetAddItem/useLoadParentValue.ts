import { useEffect } from "react";
import { TypeProperty } from "../../utils/Enum";
import { fetchReferenceByField } from "../../utils/fetchField/FetchReferenceField";
import { fetchReferenceByFieldWithParent } from "../../utils/cascade/FetchReferenceByFieldWithParent";
import { getDetails, getFieldActive } from "../../services/Index";
import { getMatchedKey } from "../../utils/Helper";
import { log } from "../../utils/Logger";

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
  fallbackReferenceName?: string,
) => {
  const getFieldValue = (detail: Record<string, any>, fieldName: string) => {
    const matchedMoTaKey = getMatchedKey(detail, `${fieldName}_MoTa`);
    const matchedValueKey = getMatchedKey(detail, fieldName);

    return (
      (matchedMoTaKey && detail?.[matchedMoTaKey]) ??
      (matchedValueKey && detail?.[matchedValueKey])
    );
  };

  const buildDisplayLabel = (
    candidate: string,
    refFields: any[],
    detail: Record<string, any>,
  ) => {
    const codeField = refFields.find(
      (field: any) =>
        /(ma|code|sohieu|kyhieu)/i.test(field.name) ||
        /(m[aã]|code|s[oố] hi[eệ]u|k[yý] hi[eệ]u)/i.test(field.moTa ?? ""),
    );

    const nameField = refFields.find(
      (field: any) =>
        /(ten|name|hoten|nguoisudung)/i.test(field.name) ||
        /(t[eê]n|name|ng[uườ]i s[ửu] d[ụu]ng)/i.test(field.moTa ?? ""),
    );

    const codeValue =
      codeField != null ? getFieldValue(detail, codeField.name) : undefined;
    const nameValue =
      nameField != null ? getFieldValue(detail, nameField.name) : undefined;

    if (/^DM_/i.test(candidate)) {
      if (nameValue != null && nameValue !== "") {
        return String(nameValue);
      }
    } else if (
      codeValue != null &&
      codeValue !== "" &&
      nameValue != null &&
      nameValue !== ""
    ) {
      return `${String(codeValue)} - ${String(nameValue)}`;
    } else if (nameValue != null && nameValue !== "") {
      return String(nameValue);
    }

    return "";
  };

  try {
    const referenceCandidates = [
      referenceName,
      fallbackReferenceName,
    ].filter(
      (name, index, arr): name is string =>
        !!name && arr.indexOf(name) === index,
    );

    for (const candidate of referenceCandidates) {
      try {
        const [fieldRes, detailRes] = await Promise.all([
          getFieldActive(candidate),
          getDetails(candidate, String(id)),
        ]);

        const refFields = fieldRes?.data ?? [];
        const detail = detailRes?.data ?? {};

        const composedLabel = buildDisplayLabel(candidate, refFields, detail);
        if (composedLabel) {
          return composedLabel;
        }

        const prioritizedFields = [
          ...refFields.filter((f: any) => f.isShowMobile),
          ...refFields.filter((f: any) => !f.isShowMobile),
        ];

        for (const field of prioritizedFields) {
          const raw = getFieldValue(detail, field.name);

          if (raw != null && raw !== "") {
            return String(raw);
          }
        }

        const fallbackKey = Object.keys(detail).find((key) =>
          /(mota|ten|name|ma|code)/i.test(key),
        );

        if (
          fallbackKey &&
          detail[fallbackKey] != null &&
          detail[fallbackKey] !== ""
        ) {
          return String(detail[fallbackKey]);
        }
      } catch (candidateErr) {
        console.warn(
          `[resolveReferenceLabel] failed for ${candidate}:`,
          candidateErr,
        );
      }
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

        log("[useLoadParentValue] parent payload:", payload);
        log("[useLoadParentValue] parent response:", {
          parentsFields,
          parentsValues,
        });

        const nextFormValues: Record<string, any> = {};
        const fieldsToLoad: Array<{
          fieldName: string;
          rawValue: string | number;
          referenceName: string;
          parentsFields?: string;
          fallbackReferenceName?: string;
        }> = [];

        for (let i = 0; i < parentsFields.length; i++) {
          const fieldName = parentsFields[i];
          const rawValue = parentsValues[i];
          const f = fieldActive.find((fi) => fi.name === fieldName);

          log("[useLoadParentValue] inspect field:", {
            fieldName,
            rawValue,
            referenceName: f?.referenceName,
            hasParentsFields: !!f?.parentsFields,
            fieldMoTa: f?.moTa,
          });

          if (
            f?.typeProperty === TypeProperty.Reference &&
            f.referenceName &&
            rawValue != null &&
            rawValue !== ""
          ) {
            const fallbackReferenceName =
              f.parentsFields &&
              String(rawValue) === String(idRoot) &&
              nameClassRoot
                ? nameClassRoot
                : undefined;

            fieldsToLoad.push({
              fieldName,
              rawValue,
              referenceName: f.referenceName,
              parentsFields: f.parentsFields,
              fallbackReferenceName,
            });
          }

          if (rawValue == null) continue;

          const numericValue = Number(rawValue);
          log("[useLoadParentValue] apply value:", {
            fieldName,
            rawValue,
          });

          nextFormValues[fieldName] = Number.isNaN(numericValue)
            ? rawValue
            : numericValue;
        }

        setFormData((prev) => ({
          ...prev,
          ...nextFormValues,
        }));

        for (const field of fieldsToLoad) {
          const parentValues = field.parentsFields
            ?.split(",")
            .map((p) => nextFormValues[p])
            .filter((v) => v != null && v !== "");

          let loadedItems: any[] = [];

          if (field.parentsFields && parentValues?.length) {
            const result = await fetchReferenceByFieldWithParent(
              field.referenceName,
              field.fieldName,
              parentValues.join(","),
              setReferenceData,
              {
                currentIds: [field.rawValue],
              },
            );
            loadedItems = result?.items ?? [];
          } else {
            const result = await fetchReferenceByField(
              field.referenceName,
              field.fieldName,
              setReferenceData,
              { currentIds: [field.rawValue] },
            );
            loadedItems = result?.items ?? [];
          }

          let label = loadedItems.find(
            (item: any) => String(item.value) === String(field.rawValue),
          )?.text;

          if (!label) {
            label = await resolveReferenceLabel(
              field.referenceName,
              field.rawValue,
              field.fallbackReferenceName,
            );

            log("[useLoadParentValue] resolved reference label:", {
              fieldName: field.fieldName,
              referenceName: field.referenceName,
              fallbackReferenceName: field.fallbackReferenceName,
              rawValue: field.rawValue,
              label,
            });
          }

          if (label) {
            setFormData((prev) => ({
              ...prev,
              [`${field.fieldName}_MoTa`]: label,
            }));

            setReferenceData(
              (
                prev: Record<string, { items: any[]; totalCount: number }>,
              ) => {
                const oldItems = prev[field.fieldName]?.items || [];
                const hasItem = oldItems.some(
                  (item: any) =>
                    String(item.value) === String(field.rawValue),
                );
                const nextItems = hasItem
                  ? oldItems
                  : [{ value: field.rawValue, text: label }, ...oldItems];

                return {
                  ...prev,
                  [field.fieldName]: {
                    items: nextItems,
                    totalCount:
                      prev[field.fieldName]?.totalCount ?? nextItems.length,
                  },
                };
              },
            );
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
