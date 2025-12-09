import { useSelector } from "react-redux";
import { RootState } from "../store";
import { normalizeClassName } from "../utils/Helper";

export function usePermission() {
  const permissions = useSelector(
    (state: RootState) => state.permission.permissions
  );

  const isFullPermission = () =>
    permissions?.length === 1 && permissions.includes("Group.1");

  const can = (module: string, action: string) => {
    if (isFullPermission()) return true;
    if (!permissions || permissions.length === 0) return false;

    const normalized = normalizeClassName(module);
    return permissions.includes(`Class.${normalized}.${action}`);
  };

  return { can, isFullPermission };
}
