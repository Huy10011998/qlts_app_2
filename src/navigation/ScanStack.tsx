import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HeaderDetails } from "../components/header/HeaderDetails";
import QrScannerScreen from "../screens/QrScanner/QrScannerScreen";
import QrDetailsScreen from "../screens/QrScanner/QrDetailsScreen";

const Stack = createNativeStackNavigator();

export default function ScanStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Scan"
        component={QrScannerScreen}
        options={{
          title: "",
          ...HeaderDetails({ showBackButton: false }),
        }}
      />

      <Stack.Screen
        name="QrDetails"
        component={QrDetailsScreen}
        options={{
          title: "Thông tin tài sản",
          ...HeaderDetails({
            showBackButton: true,
          }),
        }}
      />
    </Stack.Navigator>
  );
}
