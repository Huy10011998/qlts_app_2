import React from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
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

  React.useEffect(() => {
    Orientation.lockToPortrait();
  }, []);

  return (
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
          <NavigationContainer
            ref={navigationRef}
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
            onStateChange={syncOrientationWithRoute}
          >
            {/*
              Hệ số cỡ chữ là biến module do `installTextScaling` đọc lúc render
              từng Text, nên đổi nó không làm các màn đang mount vẽ lại. Remount
              cây điều hướng bằng key — cùng hành vi với việc Android recreate
              Activity khi người dùng đổi cỡ chữ trong Cài đặt hệ thống.
            */}
            <RootNavigator key={`text-scale-${textScaleFactor}`} />
          </NavigationContainer>
        </AuthProvider>
      </Provider>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <FontScaleProvider>
        <AppContent />
      </FontScaleProvider>
    </ThemeProvider>
  );
}
