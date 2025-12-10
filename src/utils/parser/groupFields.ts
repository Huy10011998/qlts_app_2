import { Field } from "../../types/Index";

export const GroupFields = (fields: Field[]) => {
  return fields.reduce<Record<string, Field[]>>((acc, f) => {
    const group = f.groupLayout?.trim() || "Thông tin chung";
    (acc[group] ??= []).push(f);
    return acc;
  }, {});
};
