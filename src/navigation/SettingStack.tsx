import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SettingScreen from "../screens/Settings/SettingScreen";

const Stack = createNativeStackNavigator();

export default function SettingStack() {
  return (
    <Stack.Navigator>
      {/* Không dùng header chung của các tab gốc: đầu màn là ảnh nhà máy kèm
          logo, hướng dẫn, chuông, nút nguồn (`SettingPhotoHeader`, kiểu VCB). */}
      <Stack.Screen
        name="Setting"
        component={SettingScreen}
        options={{ title: "Cài đặt", headerShown: false }}
      />
    </Stack.Navigator>
  );
}
