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

export default function RootNavigator() {
  const { isAuthenticated, isLoading, iosAuthenticated, authReady } = useAuth();
  const dispatch = useAppDispatch();
  const { loaded } = useSelector((state: RootState) => state.permission);

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch(clearPermissions());
      return;
    }

    let cancelled = false;

    const fetchPermissions = async () => {
      try {
        const res = await getPermission();

        if (!cancelled) {
          dispatch(setPermissions(res.data));
        }
      } catch (err: any) {
        // offline → giữ permissions
        if (!err?.response) return;

        // chỉ clear khi auth thực sự lỗi
        dispatch(clearPermissions());
      }
    };

    //  chỉ fetch khi:
    // - chưa load
    // - HOẶC vừa login lại
    if (!loaded) {
      fetchPermissions();
    }

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (!authReady || isLoading) {
    return <IsLoading />;
  }

  if (Platform.OS === "android") {
    return isAuthenticated ? <AppNavigator /> : <AuthNavigator />;
  }

  if (Platform.OS === "ios") {
    if (!isAuthenticated) return <AuthNavigator />;
    if (!iosAuthenticated) return <AuthNavigator />;
    return <AppNavigator />;
  }

  return null;
}
