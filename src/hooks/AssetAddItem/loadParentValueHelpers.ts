import { Field } from "../../types/Model.d";
import { TypeProperty } from "../../utils/Enum";
import { getDetails, getFieldActive } from "../../services/Index";
import { getMatchedKey } from "../../utils/Helper";
import { log } from "../../utils/Logger";
import {
  loadReferenceItemsForField,
  ReferenceDataSetter,
} from "./referenceLoaderHelpers";

type ParentReferenceField = {
  field: Field;
  rawValue: string | number;
  fallbackReferenceName?: string;
};

export const buildParentValuePayload = (
  idRoot: number | string,
  nameClassRoot: string,
  nameClass: string,
) => ({
  idClass: idRoot,
  nameClass: nameClassRoot,
  nameReference: nameClass,
});

const getDetailFieldValue = (detail: Record<string, any>, fieldName: string) => {
  const matchedMoTaKey = getMatchedKey(detail, `${fieldName}_MoTa`);
  const matchedValueKey = getMatchedKey(detail, fieldName);

  return (
    (matchedMoTaKey && detail?.[matchedMoTaKey]) ??
    (matchedValueKey && detail?.[matchedValueKey])
  );
};

const buildDisplayLabel = (
  referenceName: string,
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
    codeField != null ? getDetailFieldValue(detail, codeField.name) : undefined;
  const nameValue =
    nameField != null ? getDetailFieldValue(detail, nameField.name) : undefined;

  if (/^DM_/i.test(referenceName)) {
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

export const resolveReferenceLabel = async (
  referenceName: string,
  id: string | number,
  fallbackReferenceName?: string,
) => {
  const referenceCandidates = [referenceName, fallbackReferenceName].filter(
    (name, index, arr): name is string => !!name && arr.indexOf(name) === index,
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
        ...refFields.filter((field: any) => field.isShowMobile),
        ...refFields.filter((field: any) => !field.isShowMobile),
      ];

      for (const field of prioritizedFields) {
        const rawValue = getDetailFieldValue(detail, field.name);

        if (rawValue != null && rawValue !== "") {
          return String(rawValue);
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

  return "";
};

export const collectParentAssignments = ({
  parentsFields,
  parentsValues,
  fieldActive,
  idRoot,
  nameClassRoot,
}: {
  parentsFields: string[];
  parentsValues: Array<string | number | null | undefined>;
  fieldActive: Field[];
  idRoot: number | string;
  nameClassRoot?: string;
}) => {
  const nextFormValues: Record<string, any> = {};
  const referenceFieldsToLoad: ParentReferenceField[] = [];

  for (let index = 0; index < parentsFields.length; index += 1) {
    const fieldName = parentsFields[index];
    const rawValue = parentsValues[index];
    const field = fieldActive.find((item) => item.name === fieldName);

    log("[useLoadParentValue] inspect field:", {
      fieldName,
      rawValue,
      referenceName: field?.referenceName,
      hasParentsFields: !!field?.parentsFields,
      fieldMoTa: field?.moTa,
    });

    if (rawValue != null) {
      const numericValue = Number(rawValue);

      log("[useLoadParentValue] apply value:", {
        fieldName,
        rawValue,
      });

      nextFormValues[fieldName] = Number.isNaN(numericValue)
        ? rawValue
        : numericValue;
    }

    if (
      field?.typeProperty === TypeProperty.Reference &&
      field.referenceName &&
      rawValue != null &&
      rawValue !== ""
    ) {
      referenceFieldsToLoad.push({
        field,
        rawValue,
        fallbackReferenceName:
          field.parentsFields &&
          String(rawValue) === String(idRoot) &&
          nameClassRoot
            ? nameClassRoot
            : undefined,
      });
    }
  }

  return {
    nextFormValues,
    referenceFieldsToLoad,
  };
};

export const syncResolvedReferenceField = ({
  fieldName,
  rawValue,
  label,
  setFormData,
  setReferenceData,
}: {
  fieldName: string;
  rawValue: string | number;
  label: string;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setReferenceData: ReferenceDataSetter;
}) => {
  setFormData((prev) => ({
    ...prev,
    [`${fieldName}_MoTa`]: label,
  }));

  setReferenceData(
    (prev: Record<string, { items: any[]; totalCount: number }>) => {
      const oldItems = prev[fieldName]?.items || [];
      const hasItem = oldItems.some(
        (item: any) => String(item.value) === String(rawValue),
      );
      const nextItems = hasItem
        ? oldItems
        : [{ value: rawValue, text: label }, ...oldItems];

      return {
        ...prev,
        [fieldName]: {
          items: nextItems,
          totalCount: prev[fieldName]?.totalCount ?? nextItems.length,
        },
      };
    },
  );
};

export const loadParentReferenceItems = async ({
  field,
  rawValue,
  nextFormValues,
  setReferenceData,
}: {
  field: Field;
  rawValue: string | number;
  nextFormValues: Record<string, any>;
  setReferenceData: ReferenceDataSetter;
}) => {
  const result = await loadReferenceItemsForField({
    field,
    formData: nextFormValues,
    setReferenceData,
    params: {
      currentIds: [rawValue],
    },
  });

  if (!result || typeof result !== "object") {
    return [];
  }

  return result.items ?? [];
};
