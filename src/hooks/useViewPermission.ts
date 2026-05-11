import {
  buildViewPermissionKey,
  hasFullPermission,
  hasPermissionKey,
  usePermissionState,
} from "./shared/permissionHelpers";

export function useViewPermission() {
  const { permissions, loaded } = usePermissionState();

  const isFullAccess = () => hasFullPermission(permissions);

  const canView = (viewName: string) => {
    if (!loaded) return false;
    if (isFullAccess()) return true;
    if (!permissions || permissions.length === 0) return false;

    const key = buildViewPermissionKey(viewName);

    return hasPermissionKey(permissions, key);
  };

  return { canView, isFullPermission: isFullAccess, loaded, permissions };
}
