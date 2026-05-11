import { Item } from "../../../types/Index";
import { removeVietnameseTones } from "../../../utils/Helper";
import { ASSET_MENU_BRAND_RED } from "./assetMenuTheme";

export const getAssetMenuItemTheme = (item: Item, expanded: boolean) => {
  if (item.isReport) {
    return {
      icon: "bar-chart",
      lib: "material" as const,
      bg: "#FFF0F6",
      color: "#E64980",
    };
  }

  if (item.contentName_Mobile) {
    return {
      icon: "book",
      lib: "material" as const,
      bg: "#EEF2FF",
      color: "#3B5BDB",
    };
  }

  if (expanded) {
    return {
      icon: "folder-open",
      lib: "ionicons" as const,
      bg: "#FFF5F5",
      color: ASSET_MENU_BRAND_RED,
    };
  }

  return {
    icon: "folder",
    lib: "ionicons" as const,
    bg: "#FFF8F0",
    color: "#E67700",
  };
};

export function buildAssetMenuTree(items: Item[]) {
  const map: Record<string | number, Item> = {};
  const roots: Item[] = [];

  items.forEach((item) => {
    map[item.id] = { ...item, children: [] };
  });

  items.forEach((item) => {
    if (item.parent === null) {
      roots.push(map[item.id]);
      return;
    }

    if (map[item.parent]) {
      map[item.parent].children.push(map[item.id]);
    }
  });

  return roots;
}

export function filterAssetMenuTree(data: Item[], searchText: string) {
  if (!searchText.trim()) {
    return {
      filteredData: data,
      autoExpanded: [] as (string | number)[],
    };
  }

  const keyword = removeVietnameseTones(searchText.toLowerCase());
  const expandedSet = new Set<string | number>();

  const filterTree = (nodes: Item[]): Item[] =>
    nodes
      .map((node) => {
        const match = removeVietnameseTones(node.label.toLowerCase()).includes(
          keyword,
        );
        const children = node.children?.length ? filterTree(node.children) : [];

        if (children.length > 0) {
          expandedSet.add(node.id);
        }

        if (match || children.length > 0) {
          return { ...node, children };
        }

        return null;
      })
      .filter(Boolean) as Item[];

  return {
    filteredData: filterTree(data),
    autoExpanded: Array.from(expandedSet),
  };
}
