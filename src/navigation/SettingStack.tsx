import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SettingScreen from "../screens/Settings/SettingScreen";
import ProfileScreen from "../screens/Profile/ProfileScreen";
import { HeaderDetails } from "../components/header/HeaderDetails";

const Stack = createNativeStackNavigator();

export default function SettingStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Setting"
        component={SettingScreen}
        options={{
          title: "Cài đặt",
          ...HeaderDetails({ showBackButton: false }),
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Hồ sơ cá nhân",
          ...HeaderDetails({ showBackButton: true }),
        }}
      />
    </Stack.Navigator>
  );
}
