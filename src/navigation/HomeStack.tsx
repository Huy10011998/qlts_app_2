import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { RootStackParamList } from "../types/Index";
import { capitalizeFirstLetter } from "../utils/Helper";

// Headers
import HeaderHome from "../components/header/HeaderHome";
import { HeaderDetails } from "../components/header/HeaderDetails";

// Screens
import HomeScreen from "../screens/Home/HomeScreen";

import AssetScreen from "../screens/Assets/AssetScreen";
import AssetListScreen from "../screens/Assets/AssetListScreen";
import AssetDetailsScreen from "../screens/Assets/AssetDetailsScreen";

import AssetRelaterListScreen from "../screens/Assets/AssetRelatedListScreen";
import AssetRelatedDetailsScreen from "../screens/Assets/AssetRelatedDetailsScreen";
import AssetRelatedDeTailsHistoryScreen from "../screens/Assets/AssetRelatedDeTailsHistoryScreen";

import AssetAddItemScreen from "../screens/Assets/AssetAddItemScreen";
import AssetEditItemScreen from "../screens/Assets/AssetEditItemScreen";
import AssetCloneItemScreen from "../screens/Assets/AssetCloneItemScreen";
import AssetAddRelatedItem from "../components/assets/AssetAddRelatedItem";

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Common header config
 */
const headerWithBack = HeaderDetails({ showBackButton: true });

export default function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          header: () => <HeaderHome />,
        }}
      />

      <Stack.Screen
        name="Asset"
        component={AssetScreen}
        options={{
          title: "Tài sản",
          ...headerWithBack,
        }}
      />

      <Stack.Screen
        name="AssetList"
        component={AssetListScreen}
        options={({ route }) => {
          const title = route.params?.titleHeader
            ? capitalizeFirstLetter(route.params.titleHeader)
            : "Tài sản";

          return {
            title,
            ...headerWithBack,
          };
        }}
      />

      <Stack.Screen
        name="AssetDetails"
        component={AssetDetailsScreen}
        options={({ route }) => {
          const title = route.params?.titleHeader
            ? capitalizeFirstLetter(route.params.titleHeader)
            : "Chi tiết";

          return {
            title,
            ...headerWithBack,
          };
        }}
      />

      <Stack.Screen
        name="AssetRelatedList"
        component={AssetRelaterListScreen}
        options={({ route }) => {
          const title = route.params?.titleHeader
            ? capitalizeFirstLetter(route.params.titleHeader)
            : "Linh kiện";

          return {
            title,
            ...headerWithBack,
          };
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
        name="AssetHistoryDetail"
        component={AssetRelatedDeTailsHistoryScreen}
        options={{
          title: "Chi tiết lịch sử",
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

      <Stack.Screen
        name="AssetAddRelatedItem"
        component={AssetAddRelatedItem}
        options={{
          title: "Thêm mới",
          ...headerWithBack,
        }}
      />
    </Stack.Navigator>
  );
}
