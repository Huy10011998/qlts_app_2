import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../types/index";
import { HeaderDetails } from "../components/header/HeaderDetails";
import LichCongViecScreen from "../screens/Workflow/Lich/LichCongViecScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Màn gốc của tab: header đỏ không nút quay lại (chưa có chủ đề hướng dẫn riêng). */
const lichHeader = HeaderDetails({ showBackButton: false });

export default function LichStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="LichCongViec"
        component={LichCongViecScreen}
        options={{
          title: "Lịch công việc",
          ...lichHeader,
        }}
      />
    </Stack.Navigator>
  );
}
