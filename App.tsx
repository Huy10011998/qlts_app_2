import React from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";
import Orientation from "react-native-orientation-locker";
import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { Provider } from "react-redux";
import { store } from "./src/store/index";
import AppBootstrap from "./src/app/AppBootstrap";
import { configureTextScalingDefaults } from "./src/utils/helpers/textScaling";
import { useColorScheme } from "./src/hooks/useColorScheme";
import { Colors } from "./src/constants/Colors";
import { ThemeProvider } from "./src/context/ThemeContext";

const LANDSCAPE_ALLOWED_ROUTES = new Set(["CameraList", "CameraListGrid"]);

configureTextScalingDefaults();

function AppContent() {
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const navigationRef = useNavigationContainerRef();
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
  }, [navigationRef]);

  React.useEffect(() => {
    Orientation.lockToPortrait();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        translucent={false}
        backgroundColor="#E31E24"
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
                notification: "#E31E24",
              },
            }}
            onReady={syncOrientationWithRoute}
            onStateChange={syncOrientationWithRoute}
          >
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </Provider>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
