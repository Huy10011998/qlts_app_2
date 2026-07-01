import type { Field } from "../../../types";
import { TypeProperty } from "../../../utils/Enum";

const isEmptyRequiredValue = (field: Field, value: any) => {
  if (value === null || value === undefined) return true;
  if (field.typeProperty === TypeProperty.Bool) return false;
  if (field.typeProperty === TypeProperty.Image && value === "---") return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

export const getRequiredFieldErrors = (
  fields: Field[],
  formData: Record<string, any>,
) =>
  fields.reduce<Record<string, string>>((errors, field) => {
    if (!field.isRequired || field.isReadOnly) return errors;

    if (isEmptyRequiredValue(field, formData[field.name])) {
      errors[field.name] = `Vui lòng nhập ${field.moTa || field.name}`;
    }

    return errors;
  }, {});

export const getRequiredFieldsMessage = (
  fields: Field[],
  errors: Record<string, string>,
) => {
  const errorNames = new Set(Object.keys(errors));
  const missingLabels = fields
    .filter((field) => errorNames.has(field.name))
    .map((field) => field.moTa || field.name);

  if (!missingLabels.length) {
    return "Vui lòng nhập các trường bắt buộc.";
  }

  const visibleLabels = missingLabels.slice(0, 5);
  const remainingCount = missingLabels.length - visibleLabels.length;

  return [
    "Vui lòng nhập các trường bắt buộc:",
    visibleLabels.map((label) => `- ${label}`).join("\n"),
    remainingCount > 0 ? `... và ${remainingCount} trường khác` : "",
  ]
    .filter(Boolean)
    .join("\n");
};
