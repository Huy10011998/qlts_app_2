import { AppDispatch } from "./index";
import { getPermission } from "../services/Index";
import { setPermissions, clearPermissions } from "./PermissionSlice";

export const reloadPermissions = () => {
  return async (dispatch: AppDispatch) => {
    try {
      const res = await getPermission();
      dispatch(setPermissions(res.data));
    } catch (err) {
      console.error("Reload permissions failed", err);
      dispatch(clearPermissions());
    }
  };
};
