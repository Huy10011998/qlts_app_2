import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import QrScannerScreen from "../screens/QrScanner/QrScannerScreen";

const Stack = createNativeStackNavigator();

export default function ScanStack() {
  // Chỉ có màn quét. `QrDetails`/`QrReview` nằm ở stack gốc: `navigate` từ đây
  // không thấy trong stack này nên đi lên stack gốc, màn mở ra phủ cả thanh tab
  // — giống chi tiết tài sản thường và nhánh quét mở từ header.
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Scan"
        component={QrScannerScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
