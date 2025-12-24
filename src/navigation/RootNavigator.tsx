import React from "react";
import { Platform } from "react-native";
import { useAuth } from "../context/AuthContext";
import AppNavigator from "./AppNavigator.tsx";
import AuthNavigator from "./AuthNavigator.tsx";
import IsLoading from "../components/ui/IconLoading.tsx";

export default function RootNavigator() {
  const { token, isLoading, iosAuthenticated } = useAuth();

  if (isLoading) {
    return <IsLoading />;
  }

  // Android: token là đủ
  if (Platform.OS === "android") {
    return token ? <AppNavigator /> : <AuthNavigator />;
  }

  // iOS: phải FaceID thành công
  return iosAuthenticated ? <AppNavigator /> : <AuthNavigator />;
}
