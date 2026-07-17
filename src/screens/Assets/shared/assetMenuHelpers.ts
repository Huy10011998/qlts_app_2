import type { Item } from "../../../types/index";
import { removeVietnameseTones } from "../../../utils/Helper";
import { normalizeIconImageUri } from "../../../utils/iconImage";
import { ASSET_MENU_BRAND_RED } from "./assetMenuTheme";
import { C } from "../../../utils/helpers/colors";

export const isEnabledAssetMenuFlag = (value: Item["isViewWeb"]) =>
  value === true || value === 1 || value === "1" || value === "true";

export const getAssetMenuMobileRoute = (item: Item) => {
  if (!isEnabledAssetMenuFlag(item.isViewWeb)) return null;

  const configuredView = item.viewWebMobile?.trim();
  return configuredView || null;
};

export const getAssetMenuItemTheme = (item: Item, expanded: boolean) => {
  const iconImageUri = normalizeIconImageUri(item.iconMobile);

  if (iconImageUri) {
    return {
      icon: "image-outline",
      iconImageUri,
      lib: "ionicons" as const,
      bg: C.indigoSurface,
      color: "#3B5BDB",
    };
  }

  if (item.isReport) {
    return {
      icon: "bar-chart",
      lib: "material" as const,
      bg: C.pinkSurface,
      color: "#E64980",
    };
  }

  if (item.contentName_Mobile) {
    return {
      icon: "book",
      lib: "material" as const,
      bg: C.indigoSurface,
      color: "#3B5BDB",
    };
  }

  if (expanded) {
    return {
      icon: "folder-open",
      lib: "ionicons" as const,
      bg: C.redSurface,
      color: ASSET_MENU_BRAND_RED,
    };
  }

  return {
    icon: "folder",
    lib: "ionicons" as const,
    bg: C.orangeSurface,
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

export function filterMobileAssetMenuTree(data: Item[]) {
  const filterTree = (nodes: Item[]): Item[] =>
    nodes
      .map((node) => {
        const children = node.children?.length ? filterTree(node.children) : [];
        const isWebOnly = isEnabledAssetMenuFlag(node.isViewWeb);
        const hasMobileWebView = Boolean(getAssetMenuMobileRoute(node));
        const isActionable = Boolean(node.contentName_Mobile || node.isReport);

        if (
          (isWebOnly && hasMobileWebView) ||
          (!isWebOnly && (isActionable || children.length > 0))
        ) {
          return { ...node, children };
        }

        return null;
      })
      .filter(Boolean) as Item[];

  return filterTree(data);
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
          keyword
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
