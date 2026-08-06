import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import QrScannerScreen from "../screens/QrScanner/QrScannerScreen";
import QrDetailsScreen from "../screens/QrScanner/QrDetailsScreen";
import QrReviewScreen from "../screens/QrScanner/QrReviewScreen";
import { headerWithBack } from "./shared/navigationOptions";

const Stack = createNativeStackNavigator();

export default function ScanStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Scan"
        component={QrScannerScreen}
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="QrDetails"
        component={QrDetailsScreen}
        options={{
          title: "Thông tin",
          ...headerWithBack,
        }}
      />

      <Stack.Screen
        name="QrReview"
        component={QrReviewScreen}
        options={{
          title: "Danh sách",
          ...headerWithBack,
        }}
      />
    </Stack.Navigator>
  );
}
