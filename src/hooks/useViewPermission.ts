import { useSelector } from "react-redux";
import { RootState } from "../store";

export function useViewPermission() {
  const { permissions, loaded } = useSelector(
    (state: RootState) => state.permission,
  );

  const isFullPermission = () => permissions?.includes("Group.1");

  const canView = (viewName: string) => {
    if (!loaded) return false;
    if (isFullPermission()) return true;
    if (!permissions || permissions.length === 0) return false;

    const key = `View.${viewName}`.toLowerCase();

    return permissions.some((permission) => permission.toLowerCase() === key);
  };

  return { canView, isFullPermission, loaded, permissions };
}
