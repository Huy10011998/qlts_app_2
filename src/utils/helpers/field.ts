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

export const getDepth = (field: any, all: any[]): number => {
  if (!field.parentsFields) return 0;

  const parents = field.parentsFields.split(",");

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
