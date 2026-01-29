import React from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { Provider } from "react-redux";
import { store } from "./src/store/Index";
import AppBootstrap from "./src/app/AppBootstrap";

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar
        translucent={false}
        backgroundColor="#FF3333"
        barStyle="light-content"
      />

      <Provider store={store}>
        <AuthProvider>
          <AppBootstrap />
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </Provider>
    </SafeAreaProvider>
  );
}
