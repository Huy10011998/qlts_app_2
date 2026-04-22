import React, { useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";
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
  const {
    isAuthenticated,
    isLoading,
    iosAuthenticated,
    authReady,
    logoutReason,
    clearLogoutReason,
  } = useAuth();

  const dispatch = useAppDispatch();
  const { loaded } = useSelector((state: RootState) => state.permission);

  // 🚫 chống spam alert
  const hasShownExpiredRef = useRef(false);

  // ===== HANDLE TOKEN EXPIRED =====
  useEffect(() => {
    if (logoutReason === "EXPIRED" && !hasShownExpiredRef.current) {
      hasShownExpiredRef.current = true;

      Alert.alert(
        "Phiên đăng nhập đã hết",
        "Vui lòng đăng nhập lại.",
        [
          {
            text: "OK",
            onPress: () => {
              clearLogoutReason();
              hasShownExpiredRef.current = false;
            },
          },
        ],
        { cancelable: false },
      );
    }
  }, [logoutReason, clearLogoutReason]);

  // ===== LOAD PERMISSIONS =====
  useEffect(() => {
    const canLoadPermissions =
      isAuthenticated && (Platform.OS !== "ios" || iosAuthenticated);

    // ❌ không đủ điều kiện → clear
    if (!canLoadPermissions) {
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
        // offline → giữ nguyên
        if (!err?.response) return;

        // auth lỗi thật → clear
        dispatch(clearPermissions());
      }
    };

    // chỉ fetch khi chưa load
    if (!loaded) {
      fetchPermissions();
    }

    return () => {
      cancelled = true;
    };
  }, [dispatch, iosAuthenticated, isAuthenticated, loaded]);

  // ===== LOADING STATE =====
  if (!authReady || isLoading) {
    return <IsLoading />;
  }

  // ===== ANDROID =====
  if (Platform.OS === "android") {
    return isAuthenticated ? <AppNavigator /> : <AuthNavigator />;
  }

  // ===== IOS =====
  if (Platform.OS === "ios") {
    if (!isAuthenticated) return <AuthNavigator />;
    if (!iosAuthenticated) return <AuthNavigator />;
    return <AppNavigator />;
  }

  return null;
}
