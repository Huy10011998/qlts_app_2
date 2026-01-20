import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HeaderDetails } from "../components/header/HeaderDetails";
import QrScannerScreen from "../screens/QrScanner/QrScannerScreen";
import QrDetailsScreen from "../screens/QrScanner/QrDetailsScreen";
import QrReviewScreen from "../screens/QrScanner/QrReviewScreen";
import AssetAddRelatedItem from "../components/assets/AssetAddRelatedItem";

const Stack = createNativeStackNavigator();

export default function ScanStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Scan"
        component={QrScannerScreen}
        options={{
          headerShown: false,
          title: "",
          ...HeaderDetails({ showBackButton: false }),
        }}
      />

      <Stack.Screen
        name="QrDetails"
        component={QrDetailsScreen}
        options={{
          title: "Thông tin",
          ...HeaderDetails({
            showBackButton: true,
          }),
        }}
      />

      <Stack.Screen
        name="QrReview"
        component={QrReviewScreen}
        options={{
          title: "Danh sách",
          ...HeaderDetails({
            showBackButton: true,
          }),
        }}
      />

      <Stack.Screen
        name="AssetAddRelatedItem"
        component={AssetAddRelatedItem}
        options={{
          title: "Thêm mới",
          ...HeaderDetails({
            showBackButton: true,
          }),
        }}
      />
    </Stack.Navigator>
  );
}
