import { AppDispatch } from "./index";
import { getPermission } from "../services";
import { setPermissions, clearPermissions } from "./PermissionSlice";
import { isAuthExpiredError } from "../services/data/callApi";
import { isNetworkRequestError } from "../utils/helpers/api";
import { warn, error } from "../utils/Logger";

export const reloadPermissions = () => {
  return async (dispatch: AppDispatch): Promise<boolean> => {
    try {
      const res = await getPermission();
      dispatch(setPermissions(res.data));
      return true;
    } catch (err) {
      if (isNetworkRequestError(err)) {
        warn("Reload permissions failed due to network, keep old permissions");
        return false;
      }

      if (isAuthExpiredError(err)) {
        dispatch(clearPermissions());
      }

      error("Reload permissions failed", err);
      return false;
    }
  };
};
