import { log } from "../utils/Logger";
import {
  buildClassPermissionKey,
  hasFullPermission,
  hasPermissionKey,
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

  return { can, isFullPermission: isFullAccess, loaded, permissions };
}
