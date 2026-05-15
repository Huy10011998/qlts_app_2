import { RouteProp, NavigatorScreenParams } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

// =====================================================
// COMMON TYPES
// =====================================================
export type AssetField = string;
export type AssetItem = Record<string, any>;

export type PropertyClass = {
  isTuDongTang?: boolean;
  propertyTuDongTang?: string;
  formatTuDongTang?: string;
  prentTuDongTang?: string;
  prefix?: string;
};

// chỉnh mode thành optional
export type OptionalParams = {
  propertyReference?: string;
  nameClass?: string;
  nameClassRoot?: string;
  id?: string;
  field?: AssetField;
  name?: string;
  idRoot?: string;
  logID?: number;
  id_previous?: string;
  item?: AssetItem;
  mode?: string;
  activeTab?: string;
  titleHeader?: string;
  propertyClass?: PropertyClass;
  itemData?: AssetItem;
  returnTo?: "assetList" | "assetRelatedList";
};

// =====================================================
// QR TAB (NESTED NAVIGATOR)
// =====================================================
export type ScanTabParamList = {
  QrScanner: undefined;

  QrDetails: {
    id: string;
    titleHeader?: string;
    nameClass?: string;
    field?: AssetField;
    propertyClass?: PropertyClass;
    itemData?: AssetItem;
  };
};

export type HomeTabParamList = {
  AssetRelatedList: {
    idRoot: string;
    nameClass: string;
    propertyReference: string;
    nameClassRoot?: string;
    titleHeader?: string;
  };

  AssetList: {
    nameClass?: string;
    titleHeader?: string;
    idRoot?: string;
    propertyReference?: string;
    isBuildTree?: boolean;
  };
};

export type CameraRouteItem = {
  iD_Camera: number;
  iD_Camera_MoTa: string;
  iD_Camera_Ma: string;
};

export type ShareholdersMeetingParams = {
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
  meetingVenue: string;
  totalShareholders: number;
};

export type ShareholdersMeetingScannerParams = {
  meetingId: number;
  scanMode: "attendance" | "voting";
  votingOpinionId?: number;
  votingOpinionTitle?: string;
  votingChoice?: "agree" | "disagree" | "noOpinion";
};

export type TabsParamList = {
  HomeTab: undefined;
  ScanTab: NavigatorScreenParams<ScanTabParamList>;
  SettingTab: undefined;
};

// =====================================================
// ROOT STACK PARAM LIST
// =====================================================
export type RootStackParamList = {
  /** ================= AUTH ================= */
  Login: undefined;

  /** ================= ROOT ================= */
  Tabs: NavigatorScreenParams<TabsParamList> | undefined;
  Home: undefined;
  HomeTab: NavigatorScreenParams<HomeTabParamList>;
  /** ================= SETTINGS ================= */
  Settings: undefined;
  Profile: undefined;

  /** ================= ASSET ================= */
  Asset: undefined;
  Camera: undefined;
  CameraList: {
    zoneId: number;
    zoneName: string;
    cameras: CameraRouteItem[];
  };
  CameraListGrid: {
    zoneName?: string;
    cameras?: CameraRouteItem[];
  };

  AssetList: {
    nameClass?: string;
    titleHeader?: string;
    idRoot?: string;
    propertyReference?: string;
    isBuildTree?: boolean;
  };

  AssetDetails: {
    id: string;
    nameClass?: string;
    titleHeader?: string;
    field?: AssetField;
    propertyClass?: PropertyClass;
  };

  /** ================= ASSET HISTORY ================= */
  AssetListHistory: {
    id: string;
    nameClass: string;
    titleHeader?: string;
  };

  AssetHistoryDetail: {
    id: string;
    id_previous: string | null;
    nameClass: string;
    field?: AssetField;
  };

  /** ================= ASSET RELATED ================= */
  AssetRelatedList: {
    nameClass: string;
    propertyReference: string;
    idRoot: string;
    nameClassRoot?: string;
    titleHeader?: string; // ✅ FIX
  };

  AssetRelatedDetails: {
    id: string;
    nameClass: string;
    titleHeader?: string;
    field?: AssetField;
    propertyClass?: PropertyClass;
    idRoot?: string;
    propertyReference?: string;
    nameClassRoot?: string;
  };

  AssetAddRelatedItem: {
    idRoot?: string;
    nameClass: string;
    field: AssetField;
    propertyClass?: PropertyClass;
    nameClassRoot?: string;
  };

  /** ================= QR (NESTED) ================= */
  ScanTab: NavigatorScreenParams<ScanTabParamList>;

  QrReview: {
    nameClass: string;
    propertyReference: string;
    idRoot: string;
    nameClassRoot?: string;
    titleHeader?: string;
  };

  /** ================= CRUD ================= */
  AssetAddItem: {
    field: string;
    nameClass?: string;
    propertyClass?: PropertyClass;
    idRoot?: string;
  };

  AssetEditItem: {
    item: AssetItem;
    field: string;
    nameClass?: string;
  };

  AssetCloneItem: {
    item: AssetItem;
    field: string;
    nameClass?: string;
    propertyClass?: PropertyClass;
    returnTo?: "assetList" | "assetRelatedList";
    idRoot?: string;
    propertyReference?: string;
    nameClassRoot?: string;
    titleHeader?: string;
  };

  /** ================= SHAREHOLDERS MEETING ================= */
  ShareholdersMeeting: ShareholdersMeetingParams;
  ShareholdersMeetingScanner: ShareholdersMeetingScannerParams;
};

// =====================================================
// GENERIC NAVIGATION HELPERS
// =====================================================
export type StackNavigation<T extends keyof RootStackParamList> =
  NativeStackNavigationProp<RootStackParamList, T>;

export type StackRoute<T extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  T
>;

// =====================================================
// SCREEN-SPECIFIC TYPES
// =====================================================
export type HomeNavigationProp = StackNavigation<"Home">;

export type AssetListNavigationProp = StackNavigation<"AssetList">;
export type AssetListRouteProp = StackRoute<"AssetList">;

export type AssetDetailsNavigationProp = StackNavigation<"AssetDetails">;
export type AssetDetailsRouteProp = StackRoute<"AssetDetails">;

export type AssetListHistoryNavigationProp =
  StackNavigation<"AssetListHistory">;
export type AssetListHistoryRouteProp = StackRoute<"AssetListHistory">;

export type AssetHistoryDetailNavigationProp =
  StackNavigation<"AssetHistoryDetail">;
export type AssetHistoryDetailRouteProp = StackRoute<"AssetHistoryDetail">;

export type AssetAddItemNavigationProp = StackNavigation<"AssetAddItem">;

export type AssetAddRelatedItemNavigationProp =
  StackNavigation<"AssetAddRelatedItem">;

export type AssetEditItemNavigationProp = StackNavigation<"AssetEditItem">;

export type AssetCloneItemNavigationProp = StackNavigation<"AssetCloneItem">;

/** ================= QR ================= */
export type ScanTabNavigationProp = NativeStackNavigationProp<ScanTabParamList>;

export type QrDetailsRouteProp = RouteProp<ScanTabParamList, "QrDetails">;

export type QrReviewNavigationProp = StackNavigation<"QrReview">;
export type QrReviewRouteProp = StackRoute<"QrReview">;

type MeetingRoute = RouteProp<RootStackParamList, "ShareholdersMeeting">;
export type ShareholdersMeetingRouteProp = MeetingRoute;
