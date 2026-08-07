import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../types/index";
import CameraScreen from "../screens/Camera/CameraScreen";
import { headerWithoutBack } from "./shared/navigationOptions";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function CameraStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Camera"
        component={CameraScreen}
        options={{ title: "Hệ thống Camera", ...headerWithoutBack }}
      />
    </Stack.Navigator>
  );
}
