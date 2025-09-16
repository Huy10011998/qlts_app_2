import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HeaderDetails } from "../components/header/HeaderDetails";
import AssetScreen from "../screens/Assets/AssetScreen";
import HomeScreen from "../screens/Home/HomeScreen";
import AssetListScreen from "../screens/Assets/AssetListScreen";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../types";
import HeaderHome from "../components/header/HeaderHome";
import AssetDetailsScreen from "../screens/Assets/AssetDetailsScreen";
import AssetRelaterListScreen from "../screens/Assets/AssetRelatedListScreen";
import AssetRelatedDeTailsHistoryScreen from "../screens/Assets/AssetRelatedDeTailsHistoryScreen";
import AssetRelatedDetailsScreen from "../screens/Assets/AssetRelatedDetailsScreen";
import { capitalizeFirstLetter } from "../utils/helper";

const Stack = createNativeStackNavigator<RootStackParamList>();

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
          ...HeaderDetails({ showBackButton: true }),
        }}
      />
      <Stack.Screen
        name="AssetList"
        component={AssetListScreen}
        options={({
          route,
        }: {
          route: RouteProp<RootStackParamList, "AssetList">;
        }) => ({
          title: capitalizeFirstLetter(route.params.titleHeader) || "Tài sản",
          ...HeaderDetails({ showBackButton: true }),
        })}
      />
      <Stack.Screen
        name="AssetDetails"
        component={AssetDetailsScreen}
        options={({
          route,
        }: {
          route: RouteProp<RootStackParamList, "AssetDetails">;
        }) => ({
          title: capitalizeFirstLetter(route.params.titleHeader) || "Chi tiết",
          ...HeaderDetails({ showBackButton: true }),
        })}
      />
      <Stack.Screen
        name="AssetRelatedList"
        component={AssetRelaterListScreen}
        options={({
          route,
        }: {
          route: RouteProp<RootStackParamList, "AssetRelatedList">;
        }) => ({
          title: capitalizeFirstLetter(route.params.titleHeader) || "Linh kiện",
          ...HeaderDetails({ showBackButton: true }),
        })}
      />
      <Stack.Screen
        name="AssetRelatedDetails"
        component={AssetRelatedDetailsScreen}
        options={({}: {
          route: RouteProp<RootStackParamList, "AssetRelatedDetails">;
        }) => ({
          title: "Chi tiết",
          ...HeaderDetails({ showBackButton: true }),
        })}
      />
      <Stack.Screen
        name="AssetHistoryDetail"
        component={AssetRelatedDeTailsHistoryScreen}
        options={{
          title: "Chi tiết lịch sử",
          ...HeaderDetails({ showBackButton: true }),
        }}
      />
    </Stack.Navigator>
  );
}
