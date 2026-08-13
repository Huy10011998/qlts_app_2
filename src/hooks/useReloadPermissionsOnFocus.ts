import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useReloadPermissions } from "./useReloadPermissions";

export function useReloadPermissionsOnFocus() {
  const reload = useReloadPermissions();

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );
}
