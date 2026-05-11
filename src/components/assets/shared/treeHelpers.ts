import { TreeNode } from "../../../types/Index";
import { SqlOperator, TypeProperty } from "../../../utils/Enum";

export type AssetFilterCondition = {
  property: string;
  operator: SqlOperator;
  value: string;
  type: TypeProperty;
};

type TreeNodeWithParent = TreeNode & {
  parentNode?: TreeNodeWithParent | null;
};

export function buildTree(data: TreeNode[]): TreeNode[] {
  const map: Record<number, TreeNodeWithParent> = {};
  const roots: TreeNode[] = [];

  data.forEach((item) => {
    map[item.index] = { ...item, children: [], parentNode: null };
  });

  data.forEach((item) => {
    if (item.parent === null) {
      roots.push(map[item.index]);
      return;
    }

    const parent = map[item.parent];
    if (!parent) return;

    map[item.index].parentNode = parent;
    parent.children?.push(map[item.index]);
  });

  return roots;
}

export function getConditionsFromNode(node: TreeNode): AssetFilterCondition[] {
  const conditions: AssetFilterCondition[] = [];
  const seen = new Set<string>();
  let current: TreeNodeWithParent | null = node as TreeNodeWithParent;

  while (current) {
    if (current.property && current.value) {
      const props = current.property.split(",");
      const values = current.value.split(",");

      props.forEach((prop, index) => {
        const rawValue = values[index] ? values[index].trim() : "";
        const intValue = Number.parseInt(rawValue, 10);
        const key = `${prop.trim()}-${rawValue}`;

        if (seen.has(key)) return;
        seen.add(key);

        if (!Number.isNaN(intValue)) {
          conditions.push({
            property: prop.trim(),
            operator:
              intValue >= 0 ? SqlOperator.Equals : SqlOperator.NotEquals,
            value: String(Math.abs(intValue)),
            type: TypeProperty.Int,
          });
          return;
        }

        conditions.push({
          property: prop.trim(),
          operator: SqlOperator.Equals,
          value: rawValue,
          type: TypeProperty.String,
        });
      });
    }

    current = current.parentNode ?? null;
  }

  return conditions;
}
