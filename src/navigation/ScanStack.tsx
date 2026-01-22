import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HeaderDetails } from "../components/header/HeaderDetails";
import QrScannerScreen from "../screens/QrScanner/QrScannerScreen";
import QrDetailsScreen from "../screens/QrScanner/QrDetailsScreen";
import QrReviewScreen from "../screens/QrScanner/QrReviewScreen";
import AssetAddRelatedItem from "../components/assets/AssetAddRelatedItem";
import AssetRelatedDetailsScreen from "../screens/Assets/AssetRelatedDetailsScreen";
import AssetAddItemScreen from "../screens/Assets/AssetAddItemScreen";
import AssetEditItemScreen from "../screens/Assets/AssetEditItemScreen";
import AssetCloneItemScreen from "../screens/Assets/AssetCloneItemScreen";

const Stack = createNativeStackNavigator();
const headerWithBack = HeaderDetails({ showBackButton: true });

export default function ScanStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Scan"
        component={QrScannerScreen}
        options={{
          headerShown: false,
          title: "",
          ...headerWithBack,
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

      <Stack.Screen
        name="AssetAddRelatedItem"
        component={AssetAddRelatedItem}
        options={{
          title: "Thêm mới",
          ...headerWithBack,
        }}
      />

      <Stack.Screen
        name="AssetRelatedDetails"
        component={AssetRelatedDetailsScreen}
        options={{
          title: "Chi tiết",
          ...headerWithBack,
        }}
      />

      <Stack.Screen
        name="AssetAddItem"
        component={AssetAddItemScreen}
        options={{
          title: "Thêm mới",
          ...headerWithBack,
        }}
      />

      <Stack.Screen
        name="AssetEditItem"
        component={AssetEditItemScreen}
        options={{
          title: "Chỉnh sửa",
          ...headerWithBack,
        }}
      />

      <Stack.Screen
        name="AssetCloneItem"
        component={AssetCloneItemScreen}
        options={{
          title: "Thêm bản sao mới",
          ...headerWithBack,
        }}
      />
    </Stack.Navigator>
  );
}
