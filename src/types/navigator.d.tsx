import { RouteProp, NavigatorScreenParams } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Login: undefined;
  Tabs: undefined;
  Asset: undefined;
  Home: undefined;
  Settings: undefined;
  Profile: undefined;

  AssetList: {
    nameClass: string;
    titleHeader: string;
    idRoot?: string;
    propertyReference?: string;
    isBuildTree?: boolean;
    onMenuPress?: () => void;
  };

  HomeTab: {
    screen: "QrDetails";
    params: RootStackParamList["QrDetails"];
  };

  AssetDetails: {
    id: string;
    field?: any;
    nameClass?: string;
    titleHeader?: string;
    isBuildTree?: boolean;
    onMenuPress?: () => void;
  };

  QrDetails: {
    id: string;
    titleHeader?: string;
    nameClass?: string;
    field?: any;
    toggleMenu?: () => void;
  };

  RelaterList: { name: string };

  AssetRelatedList: {
    nameClass: string;
    titleHeader: string;
    propertyReference: string;
    idRoot: string;
  };

  RelatedDeTailsHistory: {
    id: number;
    id_previous: number;
    nameClass: string;
    field: any;
  };

  AssetHistoryDetail: {
    id: string;
    id_previous: string;
    field: any;
    nameClass: string;
  };

  AssetRelatedDetails: {
    id: string;
    field: any;
    nameClass: string;
    titleHeader?: string;
  };

  QrScanner: undefined;
};

export type OptionalParams = {
  propertyReference?: string;
  nameClass?: string;
  id?: number;
  field?: any;
  name?: string;
  idRoot?: number;
  logID?: number;
  id_previous?: number;
};

// Navigation Props
export type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

export type TabsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Tabs"
>;

export type AssetScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Asset"
>;

export type SettingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Profile"
>;

export type AssetListScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "AssetList"
>;

export type AssetListScreenRouteProp = RouteProp<
  RootStackParamList,
  "AssetList"
>;

export type AssetDetailsNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "AssetDetails"
>;

export type QrScannerNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "QrScanner"
>;

export type DeTailsTabNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "AssetDetails"
>;

export type DeTailsTabRouteProp = RouteProp<RootStackParamList, "AssetDetails">;

export type DetailsHistoryRouteProp = RouteProp<
  RootStackParamList,
  "RelatedDeTailsHistory"
>;

export type DetaiHistoryNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "AssetHistoryDetail"
>;
