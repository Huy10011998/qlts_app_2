import { useSelector } from "react-redux";
import { RootState } from "../../store";
import {
  normalizeClassName,
  removeVietnameseTones,
} from "../../utils/helpers/string";

const FULL_PERMISSION_KEY = "Group.1";

export const usePermissionState = () =>
  useSelector((state: RootState) => state.permission);

export const hasFullPermission = (permissions?: string[]) =>
  permissions?.includes(FULL_PERMISSION_KEY) ?? false;

export const hasPermissionKey = (
  permissions: string[] | undefined,
  key: string
) =>
  permissions?.some((permission) => permission.toLowerCase() === key) ?? false;

export const buildClassPermissionKey = (module: string, action: string) =>
  `Class.${normalizeClassName(module)}.${action}`.toLowerCase();

export const buildViewPermissionKey = (viewName: string) =>
  `View.${viewName}`.toLowerCase();

export const hasViewPermission = (
  permissions: string[] | undefined,
  viewName: string,
  isFullPermission?: boolean
) => {
  if (isFullPermission) return true;
  if (!permissions?.length) return false;

  return hasPermissionKey(permissions, buildViewPermissionKey(viewName));
};

const normalizePermissionPart = (value: string) =>
  removeVietnameseTones(normalizeClassName(value)).replace(/\s+/g, "");

const normalizePermissionKey = (value: string) =>
  removeVietnameseTones(value).replace(/\s+/g, "").toLowerCase();

export type ReportPermissionItem = {
  children?: ReportPermissionItem[];
  contentName_Mobile?: string | null;
  id?: string | number;
  isReport?: boolean;
  label?: string;
  [key: string]: any;
};

export const buildReportPermissionKeys = (reportName: string) => {
  const normalizedName = normalizePermissionPart(reportName);

  return [
    `Class.${normalizedName}.Report`,
    `Report.${normalizedName}`,
    `Report.${normalizedName}.Check`,
    `Report.${normalizedName}.Report`,
  ].map((key) => key.toLowerCase());
};

export const hasReportPermission = (
  permissions: string[] | undefined,
  reportNames: string[],
  isFullPermission?: boolean
) => {
  if (isFullPermission) return true;
  if (!permissions?.length) return false;

  const permissionSet = new Set(permissions.map(normalizePermissionKey));

  return reportNames.some((reportName) =>
    buildReportPermissionKeys(reportName).some((key) =>
      permissionSet.has(normalizePermissionKey(key))
    )
  );
};

export const getReportPermissionCandidates = (item: ReportPermissionItem) =>
  [
    String(item.id ?? ""),
    item.contentName_Mobile,
    item.contentName,
    item.name,
    item.nameReport,
    item.reportName,
    item.code,
    item.ma,
    item.label,
  ]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

export const canAccessReportItem = (
  item: ReportPermissionItem,
  permissions?: string[],
  isFullPermission?: boolean
) =>
  hasReportPermission(
    permissions,
    getReportPermissionCandidates(item),
    isFullPermission
  );

export const filterReportPermissionTree = <T extends ReportPermissionItem>(
  items: T[],
  permissions?: string[],
  isFullPermission?: boolean
): T[] => {
  const filterTree = (nodes: T[]): T[] =>
    nodes
      .map((node) => {
        const children = node.children?.length
          ? filterTree(node.children as T[])
          : [];

        if (node.isReport) {
          return canAccessReportItem(node, permissions, isFullPermission)
            ? ({ ...node, children: [] } as T)
            : null;
        }

        if (children.length > 0) {
          return { ...node, children } as T;
        }

        return node.contentName_Mobile
          ? ({ ...node, children: [] } as T)
          : null;
      })
      .filter(Boolean) as T[];

  return filterTree(items);
};
