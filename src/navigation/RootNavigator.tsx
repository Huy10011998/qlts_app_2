import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/Auth/LoginScreen";
import HomeTabs from "./HomeTab";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { token } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Home" component={HomeTabs} />
    </Stack.Navigator>
  );
}
