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

    // so sánh KHÔNG phân biệt hoa thường
    const key = `Class.${normalized}.${action}`.toLowerCase();

    const hasPermission = permissions.some((p) => p.toLowerCase() === key);

    log("CHECK PERMISSION:", {
      module,
      normalized,
      action,
      key,
      has: hasPermission,
    });

    return hasPermission;
  };

  return { can, isFullPermission, loaded, permissions };
}
