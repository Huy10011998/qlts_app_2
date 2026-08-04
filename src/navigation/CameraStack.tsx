import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../types/index";
import CameraScreen from "../screens/Camera/CameraScreen";
import { headerWithoutBack } from "./shared/navigationOptions";
import { renderSharedStackScreens } from "./shared/sharedStackScreens";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function CameraStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Camera"
        component={CameraScreen}
        options={{ title: "Hệ thống Camera", ...headerWithoutBack }}
      />

      {/* "Camera" là màn gốc của tab này nên phải loại khỏi danh sách dùng chung,
          nếu không navigator có hai route cùng tên. */}
      {renderSharedStackScreens(Stack, { exclude: ["Camera"] })}
    </Stack.Navigator>
  );
}
