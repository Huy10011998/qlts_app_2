// hooks/usePermission.ts
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { normalizeClassName } from "../utils/Helper";
import { log } from "../utils/Logger";

export function usePermission() {
  const { permissions, loaded } = useSelector(
    (state: RootState) => state.permission,
  );

  const isFullPermission = () => permissions?.includes("Group.1");

  const can = (module: string, action: string) => {
    if (!loaded) return false;
    if (isFullPermission()) return true;
    if (!permissions || permissions.length === 0) return false;

    const normalized = normalizeClassName(module);
    const key = `Class.${normalized}.${action}`;
    log("CHECK PERMISSION:", {
      module,
      normalized,
      action,
      key,
      has: permissions?.includes(key),
    });
    return permissions.includes(`Class.${normalized}.${action}`);
  };

  return { can, isFullPermission, loaded, permissions };
}
