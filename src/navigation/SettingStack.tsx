import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SettingScreen from "../screens/Settings/SettingScreen";

const Stack = createNativeStackNavigator();

export default function SettingStack() {
  return (
    <Stack.Navigator>
      {/* SettingScreen tự render header đỏ + avatar + wave riêng */}
      <Stack.Screen
        name="Setting"
        component={SettingScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
