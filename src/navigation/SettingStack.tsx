import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SettingScreen from "../screens/Settings/SettingScreen";
import ProfileScreen from "../screens/Profile/ProfileScreen";
import { headerWithBack } from "./shared/navigationOptions";

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

      {/* ProfileScreen dùng header chuẩn với back button */}
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Hồ sơ cá nhân",
          ...headerWithBack,
        }}
      />
    </Stack.Navigator>
  );
}
