import { AppDispatch } from "./index";
import { getPermission } from "../services/Index";
import { setPermissions, clearPermissions } from "./PermissionSlice";

export const reloadPermissions = () => {
  return async (dispatch: AppDispatch): Promise<boolean> => {
    try {
      const res = await getPermission();
      dispatch(setPermissions(res.data));
      return true;
    } catch (err) {
      const status = (err as any)?.response?.status;
      const code = (err as any)?.code;
      const isNetworkError = !status || code === "ECONNABORTED";

      if (isNetworkError) {
        console.warn(
          "Reload permissions failed due to network, keep old permissions",
        );
        return false;
      }

      if (status === 401 || status === 403) {
        dispatch(clearPermissions());
      }

      console.error("Reload permissions failed", err);
      return false;
    }
  };
};
