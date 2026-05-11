import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { normalizeClassName } from "../../utils/helpers/string";

const FULL_PERMISSION_KEY = "Group.1";

export const usePermissionState = () =>
  useSelector((state: RootState) => state.permission);

export const hasFullPermission = (permissions?: string[]) =>
  permissions?.includes(FULL_PERMISSION_KEY) ?? false;

export const hasPermissionKey = (
  permissions: string[] | undefined,
  key: string,
) => permissions?.some((permission) => permission.toLowerCase() === key) ?? false;

export const buildClassPermissionKey = (module: string, action: string) =>
  `Class.${normalizeClassName(module)}.${action}`.toLowerCase();

export const buildViewPermissionKey = (viewName: string) =>
  `View.${viewName}`.toLowerCase();
