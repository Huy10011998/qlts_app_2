import { parseCsv } from "./string";

export function getMatchedKey(item: Record<string, any>, name: string) {
  const keys = Object.keys(item);

  let found = keys.find((key) => key.toLowerCase() === name.toLowerCase());
  if (found) return found;

  found = keys.find(
    (key) =>
      key.replace(/_/g, "").toLowerCase() ===
      name.replace(/_/g, "").toLowerCase(),
  );

  return found;
}

/**
 * Thứ tự field trên mobile: cột STT_Mobile của ClassAttributes / FlowAttributes
 * (.NET trả `stT_Mobile`, như `stT_Grid`). STT là thứ tự của web; field chưa
 * khai STT_Mobile thì mới theo STT.
 */
export const getMobileOrder = (field: Record<string, any> | null | undefined) =>
  Number(field?.stT_Mobile ?? field?.stt_Mobile ?? field?.STT_Mobile ?? field?.stt ?? 0);

/** Sắp theo thứ tự mobile; trùng số thì giữ thứ tự server trả. */
export const sortByMobileOrder = <T extends Record<string, any>>(fields: readonly T[]) =>
  fields
    .map((field, index) => ({ field, index }))
    .sort((a, b) => getMobileOrder(a.field) - getMobileOrder(b.field) || a.index - b.index)
    .map(({ field }) => field);

export const getDepth = (field: any, all: any[]): number => {
  if (!field.parentsFields) return 0;

  const parents = parseCsv(field.parentsFields);

  return (
    1 +
    Math.max(
      ...parents.map((parentName: any) => {
        const parentField = all.find((item) => item.name === parentName);
        return parentField ? getDepth(parentField, all) : 0;
      }),
    )
  );
};
