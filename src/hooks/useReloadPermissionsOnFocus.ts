import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useAppDispatch } from "../store/Hooks";
import { reloadPermissions } from "../store/PermissionActions";

export function useReloadPermissionsOnFocus() {
  const dispatch = useAppDispatch();

  useFocusEffect(
    useCallback(() => {
      dispatch(reloadPermissions());
    }, [dispatch]),
  );
}
