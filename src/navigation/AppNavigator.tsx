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
import XacNhanViTriTuLanhScreen from "../screens/NoiDia/XacNhanViTriTuLanhScreen";
import XacNhanViTriTuLanhResultScreen from "../screens/NoiDia/XacNhanViTriTuLanhResultScreen";
import XacNhanViTriTuLanhLichSuScreen from "../screens/NoiDia/XacNhanViTriTuLanhLichSuScreen";
import TrungChuyenTuLanhScreen from "../screens/NoiDia/TrungChuyenTuLanhScreen";
import TrungChuyenTuLanhLichSuScreen from "../screens/NoiDia/TrungChuyenTuLanhLichSuScreen";
import TrungChuyenTuLanhChonTuScreen from "../screens/NoiDia/TrungChuyenTuLanhChonTuScreen";
import TrungChuyenTuLanhChonNhaPhanPhoiScreen from "../screens/NoiDia/TrungChuyenTuLanhChonNhaPhanPhoiScreen";
import TrungChuyenTuLanhChonKhachHangScreen from "../screens/NoiDia/TrungChuyenTuLanhChonKhachHangScreen";
import TrungChuyenTuLanhXacNhanScreen from "../screens/NoiDia/TrungChuyenTuLanhXacNhanScreen";
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
      {/* NỘI ĐỊA — XÁC NHẬN VỊ TRÍ TỦ LẠNH */}
      <Stack.Screen
        name="XacNhanViTriTuLanhForm"
        component={XacNhanViTriTuLanhScreen}
        options={{
          headerShown: true,
          title: "Xác nhận vị trí",
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="XacNhanViTriTuLanhResult"
        component={XacNhanViTriTuLanhResultScreen}
        options={{
          headerShown: true,
          title: "Kết quả xác nhận",
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="XacNhanViTriTuLanhLichSu"
        component={XacNhanViTriTuLanhLichSuScreen}
        options={{
          headerShown: true,
          title: "Lịch sử xác nhận",
          ...headerWithBack,
        }}
      />

      {/* NỘI ĐỊA — TRUNG CHUYỂN TỦ LẠNH */}
      <Stack.Screen
        name="TrungChuyenTuLanh"
        component={TrungChuyenTuLanhScreen}
        options={{
          headerShown: true,
          title: "Trung chuyển tủ lạnh",
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="TrungChuyenTuLanhLichSu"
        component={TrungChuyenTuLanhLichSuScreen}
        options={{
          headerShown: true,
          title: "Lịch sử trung chuyển",
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="TrungChuyenTuLanhChonTu"
        component={TrungChuyenTuLanhChonTuScreen}
      />
      <Stack.Screen
        name="TrungChuyenTuLanhChonNhaPhanPhoi"
        component={TrungChuyenTuLanhChonNhaPhanPhoiScreen}
        options={{
          headerShown: true,
          title: "Chọn nhà phân phối",
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="TrungChuyenTuLanhChonKhachHang"
        component={TrungChuyenTuLanhChonKhachHangScreen}
        options={{
          headerShown: true,
          title: "Chọn khách hàng",
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="TrungChuyenTuLanhXacNhan"
        component={TrungChuyenTuLanhXacNhanScreen}
        options={{
          headerShown: true,
          title: "Xác nhận trung chuyển",
          ...headerWithBack,
        }}
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
