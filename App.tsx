import React from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";
import Orientation from "react-native-orientation-locker";
import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { Provider } from "react-redux";
import { store } from "./src/store/index";
import AppBootstrap from "./src/app/AppBootstrap";

const LANDSCAPE_ALLOWED_ROUTES = new Set(["CameraList", "CameraListGrid"]);

export default function App() {
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
      />

      <Provider store={store}>
        <AuthProvider>
          <AppBootstrap />
          <NavigationContainer
            ref={navigationRef}
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
