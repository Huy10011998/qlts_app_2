import { Field } from "../../types/Index";
import { log } from "../Logger";

export const ParseFieldActive = (field: any): Field[] => {
  try {
    if (!field) return [];

    let parsed = typeof field === "string" ? JSON.parse(field) : field;
    if (typeof parsed === "string") parsed = JSON.parse(parsed);

    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    log("Lỗi parse field:", e);
    return [];
  }
};
