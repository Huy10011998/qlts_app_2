import { Platform } from "react-native";

type RootNavigatorAccessParams = {
  iosAuthenticated: boolean;
  isAuthenticated: boolean;
};

export const canLoadRootPermissions = ({
  iosAuthenticated,
  isAuthenticated,
}: RootNavigatorAccessParams) =>
  isAuthenticated && (Platform.OS !== "ios" || iosAuthenticated);

export const canAccessAppNavigator = ({
  iosAuthenticated,
  isAuthenticated,
}: RootNavigatorAccessParams) => {
  if (!isAuthenticated) return false;
  if (Platform.OS !== "ios") return true;
  return iosAuthenticated;
};
