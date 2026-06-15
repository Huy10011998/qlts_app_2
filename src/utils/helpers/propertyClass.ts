import type { PropertyClass, PropertyResponse } from "../../types";

export const mapPropertyResponseToPropertyClass = (
  data?: PropertyResponse,
): PropertyClass | undefined => {
  if (!data) return undefined;

  return {
    isTuDongTang: data.isTuDongTang,
    propertyTuDongTang: data.propertyTuDongTang,
    formatTuDongTang: data.formatTuDongTang,
    prentTuDongTang: data.prentTuDongTang,
    prefix: data.prefix,
  };
};
