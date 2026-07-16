import React, { useCallback, useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { Alert, Linking, Platform } from "react-native";
import { useAuth } from "../context/AuthContext";
import AppNavigator from "./AppNavigator.tsx";
import AuthNavigator from "./AuthNavigator.tsx";
import IsLoading from "../components/ui/IconLoading.tsx";
import { clearPermissions, setPermissions } from "../store/PermissionSlice.ts";
import { RootState } from "../store/index.ts";
import { useSelector } from "react-redux";
import { getPermission } from "../services/index.tsx";
import { useAppDispatch } from "../store/hooks";
import {
  canAccessAppNavigator,
  canLoadRootPermissions,
} from "./shared/rootNavigationHelpers";
import {
  checkServerReachability,
  SERVER_UNAVAILABLE_MESSAGE,
} from "../services/network/reachability";

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
  const hasShownAndroidOfflineRef = useRef(false);
  const [isAndroidOfflineBlocked, setIsAndroidOfflineBlocked] = useState(false);

  const openNetworkDetails = useCallback(async () => {
    try {
      if (Platform.OS === "android") {
        await Linking.sendIntent("android.settings.WIFI_SETTINGS");
        return;
      }
      await Linking.openSettings();
    } catch {
      await Linking.openSettings();
    }
  }, []);

  const checkAndroidBootstrapConnectivity = useCallback(async () => {
    const reachability = await checkServerReachability();

    if (reachability.canReachServer) {
      setIsAndroidOfflineBlocked(false);
      hasShownAndroidOfflineRef.current = false;
      return true;
    }

    setIsAndroidOfflineBlocked(true);
    return false;
  }, []);

  const showAndroidOfflineAlert = useCallback(() => {
    if (hasShownAndroidOfflineRef.current) return;
    hasShownAndroidOfflineRef.current = true;

    Alert.alert("Lỗi", SERVER_UNAVAILABLE_MESSAGE, [
      { text: "Chấp nhận", style: "cancel" },
      {
        text: "Chi tiết",
        onPress: () => {
          openNetworkDetails();
        },
      },
      {
        text: "Thử lại",
        onPress: () => {
          hasShownAndroidOfflineRef.current = false;
          checkAndroidBootstrapConnectivity().then((isReachable) => {
            if (!isReachable) {
              showAndroidOfflineAlert();
            }
          });
        },
      },
    ]);
  }, [checkAndroidBootstrapConnectivity, openNetworkDetails]);

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

  useEffect(() => {
    if (Platform.OS !== "android") return;

    let isMounted = true;

    // Connectivity blocking is only needed while bootstrapping the signed-in
    // app. Once permissions are loaded, replacing AppNavigator with IsLoading
    // would unmount the whole navigation tree (including an open report/map)
    // whenever the device goes offline.
    if (loaded) {
      setIsAndroidOfflineBlocked(false);
      hasShownAndroidOfflineRef.current = false;
      return;
    }

    const syncAndroidOfflineState = async () => {
      if (!authReady || !isAuthenticated) {
        if (isMounted) {
          setIsAndroidOfflineBlocked(false);
          hasShownAndroidOfflineRef.current = false;
        }
        return;
      }

      const isReachable = await checkAndroidBootstrapConnectivity();
      if (!isMounted) return;
      if (isReachable) {
        return;
      }

      showAndroidOfflineAlert();
    };

    syncAndroidOfflineState();

    const unsubscribeNetInfo = NetInfo.addEventListener(async () => {
      if (!isMounted) return;
      if (!authReady || !isAuthenticated) return;
      const isReachable = await checkAndroidBootstrapConnectivity();
      if (isReachable) {
        return;
      }
      showAndroidOfflineAlert();
    });

    return () => {
      isMounted = false;
      unsubscribeNetInfo();
    };
  }, [
    authReady,
    checkAndroidBootstrapConnectivity,
    isAuthenticated,
    loaded,
    showAndroidOfflineAlert,
  ]);

  // ===== LOAD PERMISSIONS =====
  useEffect(() => {
    const canLoadPermissions = canLoadRootPermissions({
      iosAuthenticated,
      isAuthenticated,
    });

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
  if (!authReady || isLoading || isAndroidOfflineBlocked) {
    return <IsLoading />;
  }

  return canAccessAppNavigator({ iosAuthenticated, isAuthenticated }) ? (
    <AppNavigator />
  ) : (
    <AuthNavigator />
  );
}
