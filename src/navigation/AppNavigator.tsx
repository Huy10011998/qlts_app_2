import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types/index";
import Tabs from "./Tabs";
import ReportScreen from "../screens/Home/ReportScreen";
import SolarPlantScreen from "../screens/Home/SolarPlantScreen";
import VehicleJourneyScreen from "../screens/Home/VehicleJourneyScreen";
import VehicleTrackingScreen from "../screens/Home/VehicleTrackingScreen";
import VehicleJourneyMapScreen from "../screens/Home/VehicleJourneyMapScreen";
import VehicleTrackingMapScreen from "../screens/Home/VehicleTrackingMapScreen";
import VehicleCurrentLocationScreen from "../screens/Home/VehicleCurrentLocationScreen";
import CameraListScreen from "../screens/Camera/CameraListScreen";
import CameraListGridScreen from "../screens/Camera/CameraListGirdScreen";
import CameraPlaybackScreen from "../screens/Camera/CameraPlaybackScreen";
import ShareholdersMeetingScannerScreen from "../screens/ShareholdersMeeting/ShareholdersMeetingScannerScreen";
import ShareholdersMeetingScreen from "../screens/ShareholdersMeeting/ShareholdersMeetingScreen";
import CameraScreen from "../screens/Camera/CameraScreen";
import { getScreenTitle, headerWithBack } from "./shared/navigationOptions";
import AssetScreen from "../screens/Assets/AssetScreen";
import AssetListScreen from "../screens/Assets/AssetListScreen";
import AssetDetailsScreen from "../screens/Assets/AssetDetailsScreen";
import AssetRelatedListScreen from "../screens/Assets/AssetRelatedListScreen";
import AssetRelatedDetailsScreen from "../screens/Assets/AssetRelatedDetailsScreen";
import AssetRelatedDeTailsHistoryScreen from "../screens/Assets/AssetRelatedDeTailsHistoryScreen";
import AssetAddItemScreen from "../screens/Assets/AssetAddItemScreen";
import AssetEditItemScreen from "../screens/Assets/AssetEditItemScreen";
import AssetCloneItemScreen from "../screens/Assets/AssetCloneItemScreen";
import AssetAddRelatedItem from "../components/assets/AssetAddRelatedItem";
import AppearanceScreen from "../screens/Settings/AppearanceScreen";
import ProfileScreen from "../screens/Profile/ProfileScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen
        name="CameraList"
        component={CameraListScreen}
        options={{
          headerShown: true,
          title: "Danh sách Camera",
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="CameraListGrid"
        component={CameraListGridScreen}
        options={{
          headerShown: true,
          title: "Live View Camera",
          ...headerWithBack,
        }}
      />
      <Stack.Screen name="CameraPlayback" component={CameraPlaybackScreen} />
      <Stack.Screen
        name="ShareholdersMeetingScanner"
        component={ShareholdersMeetingScannerScreen}
      />
      <Stack.Screen
        name="Asset"
        component={AssetScreen}
        options={({ route }) => ({
          headerShown: true,
          title: getScreenTitle(route.params?.titleHeader, "Tài sản"),
          ...headerWithBack,
        })}
      />
      <Stack.Screen
        name="AssetList"
        component={AssetListScreen}
        options={({ route }) => ({
          headerShown: true,
          title: getScreenTitle(route.params?.titleHeader, "Tài sản"),
          ...headerWithBack,
        })}
      />
      <Stack.Screen
        name="AssetDetails"
        component={AssetDetailsScreen}
        options={({ route }) => ({
          headerShown: true,
          title: getScreenTitle(route.params?.titleHeader, "Chi tiết"),
          ...headerWithBack,
        })}
      />
      <Stack.Screen
        name="AssetRelatedList"
        component={AssetRelatedListScreen}
        options={({ route }) => ({
          headerShown: true,
          title: getScreenTitle(route.params?.titleHeader, "Danh sách"),
          ...headerWithBack,
        })}
      />
      <Stack.Screen
        name="AssetRelatedDetails"
        component={AssetRelatedDetailsScreen}
        options={({ route }) => ({
          headerShown: true,
          title: getScreenTitle(route.params?.titleHeader, "Chi tiết"),
          ...headerWithBack,
        })}
      />
      <Stack.Screen
        name="AssetHistoryDetail"
        component={AssetRelatedDeTailsHistoryScreen}
        options={{
          headerShown: true,
          title: "Chi tiết lịch sử",
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="Camera"
        component={CameraScreen}
        options={{
          headerShown: true,
          title: "Hệ thống Camera",
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="ShareholdersMeeting"
        component={ShareholdersMeetingScreen}
        options={{
          headerShown: true,
          title: "Đại hội cổ đông",
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="Report"
        component={ReportScreen}
        options={({ route }) => ({
          headerShown: true,
          title: getScreenTitle(route.params?.titleHeader, "Báo cáo"),
          ...headerWithBack,
        })}
      />
      <Stack.Screen
        name="SolarPlant"
        component={SolarPlantScreen}
        options={{
          headerShown: true,
          title: "CHOLIMEX FOOD - VĨNH LỘC",
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="VehicleJourney"
        component={VehicleJourneyScreen}
        options={{
          headerShown: true,
          title: "Hành trình phương tiện",
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="VehicleTracking"
        component={VehicleTrackingScreen}
        options={{
          headerShown: true,
          title: "Dừng đỗ phương tiện",
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="VehicleJourneyMap"
        component={VehicleJourneyMapScreen}
        options={({ route }) => ({
          headerShown: true,
          title: getScreenTitle(route.params?.titleHeader, "Bản đồ hành trình"),
          ...headerWithBack,
        })}
      />
      <Stack.Screen
        name="VehicleTrackingMap"
        component={VehicleTrackingMapScreen}
        options={({ route }) => ({
          headerShown: true,
          title: getScreenTitle(route.params?.titleHeader, "Bản đồ dừng đỗ"),
          ...headerWithBack,
        })}
      />
      <Stack.Screen
        name="VehicleCurrentLocation"
        component={VehicleCurrentLocationScreen}
        options={{
          headerShown: true,
          title: "Vị trí hiện tại phương tiện",
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="AssetAddItem"
        component={AssetAddItemScreen}
        options={({ route }) => ({
          headerShown: true,
          title: getScreenTitle(route.params?.titleHeader, "Thêm mới"),
          ...headerWithBack,
        })}
      />
      <Stack.Screen
        name="AssetEditItem"
        component={AssetEditItemScreen}
        options={{
          headerShown: true,
          title: "Chỉnh sửa",
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="AssetCloneItem"
        component={AssetCloneItemScreen}
        options={({ route }) => ({
          headerShown: true,
          title: getScreenTitle(route.params?.titleHeader, "Thêm bản sao mới"),
          ...headerWithBack,
        })}
      />
      <Stack.Screen
        name="AssetAddRelatedItem"
        component={AssetAddRelatedItem}
        options={({ route }) => ({
          headerShown: true,
          title: getScreenTitle(route.params?.titleHeader, "Thêm mới"),
          ...headerWithBack,
        })}
      />
      <Stack.Screen
        name="Appearance"
        component={AppearanceScreen}
        options={{
          title: "Hiển thị",
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Hồ sơ cá nhân",
          ...headerWithBack,
        }}
      />
    </Stack.Navigator>
  );
}
