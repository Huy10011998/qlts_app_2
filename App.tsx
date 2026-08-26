import React from "react";
import { StatusBar, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type NavigationState,
} from "@react-navigation/native";
import Orientation from "react-native-orientation-locker";
import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { Provider } from "react-redux";
import { store } from "./src/store/index";
import AppBootstrap from "./src/app/AppBootstrap";
import { useColorScheme } from "./src/hooks/useColorScheme";
import { Colors } from "./src/constants/Colors";
import { C } from "./src/utils/helpers/colors";
import { ThemeProvider } from "./src/context/ThemeContext";
import {
  FontScaleProvider,
  useTextScale,
} from "./src/context/FontScaleContext";
import { ScanModeProvider } from "./src/context/ScanModeContext";
import { navigationRef } from "./src/navigation/navigationService";

const LANDSCAPE_ALLOWED_ROUTES = new Set([
  "CameraList",
  "CameraListGrid",
  "CameraPlayback",
]);

function AppContent() {
  const colorScheme = useColorScheme() ?? "light";
  const { factor: textScaleFactor } = useTextScale();
  const isDark = colorScheme === "dark";
  // navigationRef ở cấp module (navigationService) thay cho useNavigationContainerRef
  // để handler push notification — chạy ngoài cây React — cũng điều hướng được.
  const routeNameRef = React.useRef<string | undefined>(undefined);
  /**
   * State điều hướng mới nhất, giữ để dựng lại sau khi đổi cỡ chữ.
   *
   * Đổi cỡ chữ phải remount cả cây (xem `key` bên dưới); không có ảnh chụp này
   * thì stack dựng lại từ route đầu và người dùng bị đá khỏi màn Cỡ chữ ngay lúc
   * vừa chọn — đúng chỗ họ đang cần nhìn kết quả.
   */
  const navigationStateRef = React.useRef<NavigationState | undefined>(
    undefined,
  );

  const syncOrientationWithRoute = React.useCallback(() => {
    const routeName = navigationRef.getCurrentRoute()?.name;
    const previousRouteName = routeNameRef.current;
    routeNameRef.current = routeName;

    if (
      routeName === previousRouteName &&
      routeName &&
      LANDSCAPE_ALLOWED_ROUTES.has(routeName)
    ) {
      return;
    }

    Orientation.lockToPortrait();
  }, []);

  const handleStateChange = React.useCallback(
    (state?: NavigationState) => {
      navigationStateRef.current = state;
      syncOrientationWithRoute();
    },
    [syncOrientationWithRoute],
  );

  React.useEffect(() => {
    Orientation.lockToPortrait();
  }, []);

  return (
    // Gốc gesture cho cả app: iOS bắt buộc có view này mới nhận cử chỉ của
    // react-native-gesture-handler (thẻ vuốt ở danh sách tài sản). Vài màn
    // (SolarPlant, Camera) tự mount root riêng từ trước; lồng nhau vẫn chạy.
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider>
        <StatusBar
          translucent={false}
          backgroundColor={C.red}
          barStyle="light-content"
          animated
        />

        <Provider store={store}>
          <AuthProvider>
            <AppBootstrap />
            {/*
              Hệ số cỡ chữ là biến module do `installTextScaling` đọc lúc render
              từng Text, nên đổi nó không làm các màn đang mount vẽ lại. Remount
              cả container bằng key — cùng hành vi với việc Android recreate
              Activity khi người dùng đổi cỡ chữ trong Cài đặt hệ thống.

              Key đặt ở container (chứ không ở `RootNavigator`) để `initialState`
              dựng lại đúng stack đang mở: người dùng ở lại màn Cỡ chữ và thấy
              ngay kết quả, thay vì bị trả về Trang chủ.
            */}
            <NavigationContainer
              key={`text-scale-${textScaleFactor}`}
              ref={navigationRef}
              initialState={navigationStateRef.current}
              theme={{
                ...(isDark ? DarkTheme : DefaultTheme),
                dark: isDark,
                colors: {
                  ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
                  primary: Colors[colorScheme].tint,
                  background: Colors[colorScheme].background,
                  card: Colors[colorScheme].card,
                  text: Colors[colorScheme].text,
                  border: Colors[colorScheme].borderColor,
                  notification: C.red,
                },
              }}
              onReady={syncOrientationWithRoute}
              onStateChange={handleStateChange}
            >
              <RootNavigator />
            </NavigationContainer>
          </AuthProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
});

export default function App() {
  return (
    <ThemeProvider>
      <FontScaleProvider>
        <ScanModeProvider>
          <AppContent />
        </ScanModeProvider>
      </FontScaleProvider>
    </ThemeProvider>
  );
}
