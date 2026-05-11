import { Dispatch, SetStateAction } from "react";
import { Field } from "../../types/Model.d";
import { fetchReferenceByField } from "../../utils/fetchField/FetchReferenceField";
import { fetchReferenceByFieldWithParent } from "../../utils/cascade/FetchReferenceByFieldWithParent";

export type ReferenceDataSetter = Dispatch<SetStateAction<any>>;

export type ReferenceRequestParams = {
  textSearch?: string;
  pageSize?: number;
  skipSize?: number;
  append?: boolean;
  currentIds?: Array<string | number>;
};

type LoadReferenceItemsArgs = {
  field: Field;
  formData: Record<string, any>;
  setReferenceData: ReferenceDataSetter;
  params?: ReferenceRequestParams;
  requireAllParents?: boolean;
  onMissingParents?: () => void;
};

export const getCurrentReferenceIds = (
  formData: Record<string, any>,
  fieldName: string,
) => {
  const currentValue = formData[fieldName];

  if (currentValue == null || currentValue === "") {
    return [];
  }

  return [currentValue];
};

export const getReferenceParentContext = (
  formData: Record<string, any>,
  parentsFields?: string,
) => {
  const parentFields = parentsFields?.split(",").map((field) => field.trim()) ?? [];
  const parentValues = parentFields
    .map((field) => formData[field])
    .filter((value) => value != null && value !== "");

  return {
    parentFields,
    parentValues,
    hasAllParents:
      parentFields.length > 0 && parentValues.length === parentFields.length,
  };
};

export const buildReferenceFetchParams = ({
  pageSize,
  page = 0,
  textSearch = "",
  append = false,
  currentIds,
}: {
  pageSize: number;
  page?: number;
  textSearch?: string;
  append?: boolean;
  currentIds?: Array<string | number>;
}) => ({
  textSearch,
  pageSize,
  skipSize: page * pageSize,
  append,
  currentIds,
});

export const loadReferenceItemsForField = async ({
  field,
  formData,
  setReferenceData,
  params,
  requireAllParents = false,
  onMissingParents,
}: LoadReferenceItemsArgs) => {
  if (!field.referenceName) return null;

  const { parentFields, parentValues, hasAllParents } = getReferenceParentContext(
    formData,
    field.parentsFields,
  );

  if (requireAllParents && parentFields.length > 0 && !hasAllParents) {
    onMissingParents?.();
    return false;
  }

  if (field.parentsFields && parentValues.length > 0) {
    return fetchReferenceByFieldWithParent(
      field.referenceName,
      field.name,
      parentValues.join(","),
      setReferenceData,
      params,
    );
  }

  return fetchReferenceByField(
    field.referenceName,
    field.name,
    setReferenceData,
    params,
  );
};
