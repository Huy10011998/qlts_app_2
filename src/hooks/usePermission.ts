import { log } from "../utils/Logger";
import {
  buildClassPermissionKey,
  hasFullPermission,
  hasPermissionKey,
  hasReportPermission,
  hasViewPermission,
  usePermissionState,
} from "./shared/permissionHelpers";

export function usePermission() {
  const { permissions, loaded } = usePermissionState();

  const isFullAccess = () => hasFullPermission(permissions);

  const can = (module: string, action: string) => {
    if (!loaded) return false;
    if (isFullAccess()) return true;
    if (!permissions || permissions.length === 0) return false;

    const key = buildClassPermissionKey(module, action);
    const hasPermission = hasPermissionKey(permissions, key);

    log("CHECK PERMISSION:", {
      module,
      action,
      key,
      has: hasPermission,
    });

    return hasPermission;
  };

  const canReport = (reportNames: string[]) => {
    if (!loaded) return false;
    return hasReportPermission(permissions, reportNames, isFullAccess());
  };

  const canView = (viewName: string) => {
    if (!loaded) return false;
    return hasViewPermission(permissions, viewName, isFullAccess());
  };

  /**
   * Mã quyền đúng nguyên chuỗi BE trả, không ghép tiền tố `View.` / `Class.` —
   * vd nhóm Dashboard Tài sản trả thẳng `Dashboard.TaiSan.MayMoc`.
   */
  const hasPermission = (permissionKey: string) => {
    if (!loaded) return false;
    if (isFullAccess()) return true;
    return hasPermissionKey(permissions, permissionKey.toLowerCase());
  };

  return {
    can,
    canReport,
    canView,
    hasPermission,
    isFullPermission: isFullAccess,
    loaded,
    permissions,
  };
}
