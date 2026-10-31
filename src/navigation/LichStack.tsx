import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../types/index";
import LichCongViecScreen from "../screens/Workflow/Lich/LichCongViecScreen";
import { headerTabRoot } from "./shared/navigationOptions";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function LichStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="LichCongViec"
        component={LichCongViecScreen}
        options={{
          title: "Lịch công việc",
          // Màn gốc của tab: logo + chuông, nhãn trên tiêu đề là ngày hôm nay.
          ...headerTabRoot("lich-thong-bao", "today"),
        }}
      />
    </Stack.Navigator>
  );
}
