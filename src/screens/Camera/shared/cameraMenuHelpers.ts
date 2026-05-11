import { removeVietnameseTones } from "../../../utils/Helper";

export interface CameraItem {
  id: string;
  parent: string | null;
  label: string;
  children: CameraItem[];
}

export const getCameraItemTheme = (item: CameraItem, expanded: boolean) => {
  if (item.children.length > 0) {
    return expanded
      ? {
          icon: "folder-open",
          lib: "ionicons" as const,
          bg: "#FFF5F5",
          color: "#E31E24",
        }
      : {
          icon: "folder",
          lib: "ionicons" as const,
          bg: "#FFF8F0",
          color: "#E67700",
        };
  }

  return {
    icon: "videocam",
    lib: "material" as const,
    bg: "#EEF2FF",
    color: "#3B5BDB",
  };
};

export const buildCameraTree = (items: any[]): CameraItem[] => {
  const map: Record<number, CameraItem> = {};
  const roots: CameraItem[] = [];

  const distinctItems = Array.from(
    new Map(items.map((item) => [item.iD_VungCamera, item])).values(),
  );

  distinctItems.forEach((item) => {
    map[item.iD_VungCamera] = {
      id: item.iD_VungCamera.toString(),
      parent:
        item.iD_VungCameraParent != null
          ? item.iD_VungCameraParent.toString()
          : null,
      label: item.iD_VungCamera_MoTa,
      children: [],
    };
  });

  distinctItems.forEach((item) => {
    const node = map[item.iD_VungCamera];

    if (item.iD_VungCameraParent == null) {
      roots.push(node);
      return;
    }

    const parent = map[item.iD_VungCameraParent];
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

export const filterCameraTree = (data: CameraItem[], searchText: string) => {
  if (!searchText.trim()) {
    return { filteredTree: data, autoExpand: [] as string[] };
  }

  const keyword = removeVietnameseTones(searchText.toLowerCase());
  const expandedSet = new Set<string>();

  const filterTree = (nodes: CameraItem[]): CameraItem[] =>
    nodes
      .map((node) => {
        const match = removeVietnameseTones(node.label.toLowerCase()).includes(
          keyword,
        );
        const children = filterTree(node.children);

        if (children.length > 0) {
          expandedSet.add(node.id);
        }

        if (match || children.length > 0) {
          return { ...node, children };
        }

        return null;
      })
      .filter(Boolean) as CameraItem[];

  return {
    filteredTree: filterTree(data),
    autoExpand: Array.from(expandedSet),
  };
};

export const getAllZoneIds = (zoneId: number, allZones: any[]): number[] => {
  const result = [zoneId];
  const children = allZones.filter((zone) => zone.iD_VungCameraParent === zoneId);

  children.forEach((child) => {
    result.push(...getAllZoneIds(child.iD_VungCamera, allZones));
  });

  return result;
};
