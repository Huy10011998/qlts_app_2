import React, { useEffect } from "react";
import { Platform } from "react-native";
import { useAuth } from "../context/AuthContext";
import AppNavigator from "./AppNavigator.tsx";
import AuthNavigator from "./AuthNavigator.tsx";
import IsLoading from "../components/ui/IconLoading.tsx";
import { clearPermissions, setPermissions } from "../store/PermissionSlice.ts";
import { RootState } from "../store/index.ts";
import { useSelector } from "react-redux";
import { getPermission } from "../services/Index.tsx";
import { useAppDispatch } from "../store/Hooks.ts";
import { log } from "../utils/Logger.ts";

export default function RootNavigator() {
  const { token, isLoading, iosAuthenticated, authReady } = useAuth();
  const dispatch = useAppDispatch();

  const { loaded } = useSelector((state: RootState) => state.permission);

  useEffect(() => {
    if (!token) {
      dispatch(clearPermissions());
      return;
    }

    if (loaded) return; // chặn gọi dư

    let cancelled = false;

    const fetchPermissions = async () => {
      try {
        const res = await getPermission();
        if (!cancelled) {
          dispatch(setPermissions(res.data));
        }
      } catch (err) {
        log("Get permission failed", err);
        dispatch(clearPermissions());
      }
    };

    fetchPermissions();

    return () => {
      cancelled = true;
    };
  }, [token, loaded]);

  if (!authReady || isLoading) {
    return <IsLoading />;
  }

  // Android: token là đủ
  if (Platform.OS === "android") {
    return token ? <AppNavigator /> : <AuthNavigator />;
  }

  // iOS: phải FaceID thành công
  if (Platform.OS === "ios") {
    if (!token) return <AuthNavigator />;
    if (!iosAuthenticated) return <AuthNavigator />;
    return <AppNavigator />;
  }
}
