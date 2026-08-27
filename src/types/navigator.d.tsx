import { RouteProp, NavigatorScreenParams } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type {
  KhachHangItem,
  NhaPhanPhoiItem,
} from "../services/data/noiDiaApi";
import type { FridgeSummary } from "../screens/NoiDia/shared/fridgeLookup";
import type { GuideTopicId } from "../screens/Guide/shared/guideTypes";

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

/**
 * Nơi quay về sau khi lưu ở các màn tạo/sửa bản ghi con.
 *
 * `qrScan` là nhánh của luồng đánh giá nhanh: lưu xong về thẳng máy quét để
 * quét mã kế tiếp, không dừng ở danh sách nào cả.
 */
export type AssetReturnTo =
  | "assetList"
  | "assetRelatedList"
  | "openAssetRelatedList"
  | "qrReview"
  | "qrScan";

// chỉnh mode thành optional
export type OptionalParams = {
  propertyReference?: string;
  nameClass?: string;
  nameClassRoot?: string;
  rootRecordLabel?: string;
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
  returnTo?: AssetReturnTo;
  groupMenuId?: number;
  viewPermission?: string;
  assetTitleHeader?: string;
};

// =====================================================
// QR TAB (NESTED NAVIGATOR)
// =====================================================
export type ScanTabParamList = {
  /** Tên route thật trong `ScanStack` là "Scan" — đừng đổi, đã có nơi navigate tới. */
  Scan: undefined;

  QrDetails: {
    id: string;
    titleHeader?: string;
    nameClass?: string;
    field?: AssetField;
    propertyClass?: PropertyClass;
    itemData?: AssetItem;
    /** Xem chú thích ở `AssetDetails.activeTab`. */
    activeTab?: string;
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
    groupMenuId?: number;
    viewPermission?: string;
    assetTitleHeader?: string;
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
  FeatureTab: undefined;
  ScanTab: NavigatorScreenParams<ScanTabParamList>;
  CameraTab: undefined;
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
  /** Màn danh mục đầy đủ của tab Chức năng. */
  Features: undefined;
  HomeTab: NavigatorScreenParams<HomeTabParamList>;
  /** ================= SETTINGS ================= */
  Settings: undefined;
  Profile: undefined;
  Appearance: undefined;
  /** Chọn trần phóng to cỡ chữ cho toàn ứng dụng. */
  TextSize: undefined;
  /** Tạm dừng / bật lại thông báo camera phát hiện chuyển động. */
  CameraNotification: undefined;
  /** Mục lục tài liệu hướng dẫn sử dụng. */
  Guide: undefined;
  /** Một chủ đề hướng dẫn; mở từ mục lục hoặc từ nút dấu hỏi trên header. */
  GuideTopic: { topicId: GuideTopicId; titleHeader?: string };

  /** ================= ASSET ================= */
  Asset:
    | {
        groupMenuId?: number;
        titleHeader?: string;
        viewPermission?: string;
      }
    | undefined;
  Report:
    | {
        groupMenuId?: number;
        titleHeader?: string;
        viewPermission?: string;
      }
    | undefined;
  VehicleJourney: undefined;
  VehicleJourneyMap: {
    coordinates: Array<{ lat: number; lng: number }>;
    titleHeader?: string;
  };
  VehicleTracking: undefined;
  VehicleCurrentLocation: undefined;
  VehicleTrackingMap: {
    stopPoints: Array<{
      id: number;
      lat: number;
      lng: number;
      stt?: number;
      time?: string;
      address?: string;
      duration?: string;
      seconds?: number;
    }>;
    selectedId?: number;
    titleHeader?: string;
  };
  SolarPlant: undefined;
  Camera: undefined;
  CameraList: {
    zoneId: number;
    zoneName: string;
    cameras: CameraRouteItem[];
  };
  CameraListGrid: {
    zoneName?: string;
    cameras?: CameraRouteItem[];
    /**
     * Số ô của lưới lúc mở màn: 1 | 4 | 9 | 12 | 16 (xem LAYOUT_OPTIONS). Bỏ
     * trống là 16. Người dùng vẫn đổi được bằng nút chọn bố cục.
     */
    layoutCount?: number;
  };
  CameraPlayback: {
    camera: CameraRouteItem;
    zoneName?: string;
  };

  AssetList: {
    nameClass?: string;
    titleHeader?: string;
    idRoot?: string;
    propertyReference?: string;
    isBuildTree?: boolean;
    groupMenuId?: number;
    viewPermission?: string;
    assetTitleHeader?: string;
  };

  AssetDetails: {
    id: string;
    nameClass?: string;
    titleHeader?: string;
    field?: AssetField;
    propertyClass?: PropertyClass;
    /**
     * Tab mở sẵn. Chỉ là giá trị khởi tạo; màn đã mount thì `AssetDetails` đổi tab
     * qua effect rồi xoá param — xem nút "bản ghi gốc" ở AssetRelatedList.
     */
    activeTab?: string;
    groupMenuId?: number;
    viewPermission?: string;
    assetTitleHeader?: string;
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
    /** Bản ghi mà lịch sử này thuộc về — cho pill mã bản ghi trên header. */
    idRoot?: string;
    rootRecordLabel?: string;
  };

  /** ================= ASSET RELATED ================= */
  AssetRelatedList: {
    nameClass: string;
    propertyReference: string;
    idRoot: string;
    nameClassRoot?: string;
    titleHeader?: string; // ✅ FIX
    /**
     * Mã bản ghi cha (ví dụ "PC0015") — title của màn là tên mục liên quan nên
     * không có gì khác cho biết đang xem con của bản ghi nào. Thiếu thì góc phải
     * header để trống như cũ.
     */
    rootRecordLabel?: string;
    groupMenuId?: number;
    viewPermission?: string;
    assetTitleHeader?: string;
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
    rootRecordLabel?: string;
    returnTo?: AssetReturnTo;
    groupMenuId?: number;
    viewPermission?: string;
    assetTitleHeader?: string;
  };

  AssetAddRelatedItem: {
    idRoot?: string;
    nameClass: string;
    field: AssetField;
    propertyClass?: PropertyClass;
    nameClassRoot?: string;
    propertyReference?: string;
    titleHeader?: string;
    rootRecordLabel?: string;
    returnTo?: AssetReturnTo;
    groupMenuId?: number;
    viewPermission?: string;
    assetTitleHeader?: string;
  };

  /** ================= QR (NESTED) ================= */
  ScanTab: NavigatorScreenParams<ScanTabParamList>;

  /**
   * Nhánh quét đặt ở stack gốc, dùng khi mở máy quét từ một màn ngoài tab (ví
   * dụ nút quét trên header màn danh sách tài sản). Trùng tên với route trong
   * ScanTab là có ý: `navigate` tìm trong navigator hiện tại trước, nên mỗi
   * nhánh tự dẫn trong nhánh của mình và back trả về đúng chỗ đã mở.
   */
  QrScan: undefined;

  QrDetails: {
    id: string;
    titleHeader?: string;
    nameClass?: string;
    field?: AssetField;
    propertyClass?: PropertyClass;
    itemData?: AssetItem;
    /** Xem chú thích ở `AssetDetails.activeTab`. */
    activeTab?: string;
  };

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
    titleHeader?: string;
    groupMenuId?: number;
    viewPermission?: string;
    assetTitleHeader?: string;
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
    returnTo?: AssetReturnTo;
    idRoot?: string;
    propertyReference?: string;
    nameClassRoot?: string;
    rootRecordLabel?: string;
    titleHeader?: string;
    groupMenuId?: number;
    viewPermission?: string;
    assetTitleHeader?: string;
  };

  /** ================= NỘI ĐỊA — TỦ LẠNH ================= */
  /** Bước [2]: chụp ảnh tại chỗ + ghi chú + toạ độ rồi gửi. */
  XacNhanViTriTuLanhForm: { fridge: FridgeSummary };
  /** Bước [3]: màn kết quả sau khi gửi thành công. */
  XacNhanViTriTuLanhResult: { fridge: FridgeSummary };
  /**
   * Cửa vào chức năng xác nhận vị trí: lịch sử của MỘT tủ + nút thêm lượt mới.
   * Mở từ menu ☰ trên header màn chi tiết, giống hệt lối vào trung chuyển.
   */
  XacNhanViTriTuLanhLichSu: { fridge: FridgeSummary };

  /**
   * Cửa vào chức năng trung chuyển từ menu Nội địa: chọn tủ trước đã.
   *
   * API lịch sử trung chuyển bắt buộc `ID_NoiDia_TuLanh` (bỏ trống là trả mảng
   * rỗng), nên không có màn "toàn bộ lượt chuyển" như web — phải chọn tủ rồi
   * mới xem được lịch sử của nó. Màn này chỉ tra cứu theo mã/seri; muốn quét
   * tem thì dùng tab Quét (QrDetails → menu → Trung chuyển).
   *
   * Tên route PHẢI trùng `View Web Mobile` khai báo trên Config hệ thống.
   */
  TrungChuyenTuLanh: undefined;
  /** Lịch sử trung chuyển của một tủ + nút (+) tạo yêu cầu mới. */
  TrungChuyenTuLanhLichSu: { fridge: FridgeSummary };
  /**
   * Bước [1]: tủ vào từ màn lịch sử đã có sẵn, cho quét thêm tủ khác.
   *
   * ⚠️ ĐANG TẮT, chờ tương lai — route không còn đăng ký trong AppNavigator.
   * Luồng hiện tại chỉ chuyển đúng con tủ mở từ màn chi tiết nên đi thẳng từ
   * lịch sử sang [2]. Giữ type ở đây để màn cũ vẫn biên dịch được.
   */
  TrungChuyenTuLanhChonTu: { fridges: FridgeSummary[] };
  /** Bước [2]: chọn nhà phân phối. Luồng hiện tại `fridges` luôn đúng 1 phần tử. */
  TrungChuyenTuLanhChonNhaPhanPhoi: { fridges: FridgeSummary[] };
  /** Bước [3]: chọn khách hàng của NPP đã chọn. */
  TrungChuyenTuLanhChonKhachHang: {
    fridges: FridgeSummary[];
    nhaPhanPhoi: NhaPhanPhoiItem;
  };
  /** Bước [4]: đối chiếu "TỪ → ĐẾN" rồi gửi. */
  TrungChuyenTuLanhXacNhan: {
    fridges: FridgeSummary[];
    nhaPhanPhoi: NhaPhanPhoiItem;
    khachHang: KhachHangItem;
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

/** ================= GUIDE ================= */
export type GuideNavigationProp = StackNavigation<"Guide">;

export type GuideTopicNavigationProp = StackNavigation<"GuideTopic">;
export type GuideTopicRouteProp = StackRoute<"GuideTopic">;

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
