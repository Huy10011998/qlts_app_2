import { ComponentType } from "react";
import { RootStackParamList } from "../../types/Index";
import HomeScreen from "../../screens/Home/HomeScreen";
import AssetScreen from "../../screens/Assets/AssetScreen";
import AssetListScreen from "../../screens/Assets/AssetListScreen";
import AssetDetailsScreen from "../../screens/Assets/AssetDetailsScreen";
import AssetRelaterListScreen from "../../screens/Assets/AssetRelatedListScreen";
import AssetRelatedDetailsScreen from "../../screens/Assets/AssetRelatedDetailsScreen";
import AssetRelatedDeTailsHistoryScreen from "../../screens/Assets/AssetRelatedDeTailsHistoryScreen";
import AssetAddItemScreen from "../../screens/Assets/AssetAddItemScreen";
import AssetEditItemScreen from "../../screens/Assets/AssetEditItemScreen";
import AssetCloneItemScreen from "../../screens/Assets/AssetCloneItemScreen";
import AssetAddRelatedItem from "../../components/assets/AssetAddRelatedItem";
import CameraScreen from "../../screens/Camera/CameraScreen";
import CameraListScreen from "../../screens/Camera/CameraListScreen";
import CameraListGridScreen from "../../screens/Camera/CameraListGirdScreen";
import ShareholdersMeetingScreen from "../../screens/ShareholdersMeeting/ShareholdersMeetingScreen";

type HomeStackScreenName = keyof RootStackParamList;

type HomeStackStaticScreen = {
  component: ComponentType<any>;
  name: HomeStackScreenName;
  title: string;
};

type HomeStackRouteTitleScreen = {
  component: ComponentType<any>;
  fallbackTitle: string;
  name: "AssetList" | "AssetDetails" | "AssetRelatedList";
};

export const HOME_SCREEN_COMPONENT = HomeScreen;

export const HOME_STACK_STATIC_SCREENS: HomeStackStaticScreen[] = [
  { name: "Asset", component: AssetScreen, title: "Tài sản" },
  { name: "Camera", component: CameraScreen, title: "Hệ thống Camera" },
  {
    name: "CameraList",
    component: CameraListScreen,
    title: "Danh sách Camera",
  },
  {
    name: "CameraListGrid",
    component: CameraListGridScreen,
    title: "Live View Camera",
  },
  {
    name: "ShareholdersMeeting",
    component: ShareholdersMeetingScreen,
    title: "Đại hội cổ đông",
  },
  {
    name: "AssetRelatedDetails",
    component: AssetRelatedDetailsScreen,
    title: "Chi tiết",
  },
  {
    name: "AssetHistoryDetail",
    component: AssetRelatedDeTailsHistoryScreen,
    title: "Chi tiết lịch sử",
  },
  { name: "AssetAddItem", component: AssetAddItemScreen, title: "Thêm mới" },
  { name: "AssetEditItem", component: AssetEditItemScreen, title: "Chỉnh sửa" },
  {
    name: "AssetCloneItem",
    component: AssetCloneItemScreen,
    title: "Thêm bản sao mới",
  },
  {
    name: "AssetAddRelatedItem",
    component: AssetAddRelatedItem,
    title: "Thêm mới",
  },
];

export const HOME_STACK_ROUTE_TITLE_SCREENS: HomeStackRouteTitleScreen[] = [
  { name: "AssetList", component: AssetListScreen, fallbackTitle: "Tài sản" },
  {
    name: "AssetDetails",
    component: AssetDetailsScreen,
    fallbackTitle: "Chi tiết",
  },
  {
    name: "AssetRelatedList",
    component: AssetRelaterListScreen,
    fallbackTitle: "Danh sách",
  },
];
