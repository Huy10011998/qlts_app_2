import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import type { HomeNavigationProp } from "../../types";
import { usePermission } from "../../hooks/usePermission";
import HomeMenuItemCard from "./shared/HomeMenuItemCard";
import HomeSectionTitle from "./shared/HomeSectionTitle";
import HomeStatTiles, { type HomeStatTile } from "./shared/HomeStatTiles";
import HomeUtilityCard, { type HomeUtilityRow } from "./shared/HomeUtilityCard";
import HomeAttendanceCard from "./shared/HomeAttendanceCard";
import HomeAssetStructurePager from "./shared/HomeAssetStructurePager";
import HomeCustomizeSheet, {
  buildHomeCustomizeSections,
} from "./shared/HomeCustomizeSheet";
import HomeBlockOrderSheet from "./shared/HomeBlockOrderSheet";
import type { HomeReorderItem } from "./shared/HomeReorderList";
import {
  HOME_BLOCK_META,
  isHomeBlockKey,
  type HomeBlockKey,
} from "./shared/homeBlockOrder";
import HomeScreenSkeleton, { AttendanceSkeleton } from "./shared/HomeScreenSkeleton";
import HomeJumpBar from "./shared/HomeJumpBar";
import HomeScrollTopButton from "./shared/HomeScrollTopButton";
import { HOME_BRAND_RED } from "./shared/homeTheme";
import {
  getHomeCardChrome,
  HOME_BLOCK_TONES,
  HomeBlockToneContext,
  useHomePageBackground,
} from "./shared/homeBlockTone";
import {
  HOME_COLLAPSED_BLOCKS_KEY,
  HOME_HIDDEN_BLOCKS_KEY,
} from "./shared/homeBlockLists";
import { useStoredHomeBlockList } from "./shared/useStoredHomeBlockList";
import {
  formatHomeCount,
  formatHomeNumber,
  formatHomePeriodLabel,
  HOME_NO_DATA,
} from "./shared/homeFormat";
import { useHomeDashboard } from "./shared/useHomeDashboard";
import { useHomeMenuContext } from "./shared/HomeMenuProvider";
import { useHomeMenuItems } from "./shared/useHomeMenuItems";
import WorkflowDashboardCard from "../Workflow/Dashboard/WorkflowDashboardCard";
import { WORKFLOW_VIEW_CODE } from "../Workflow/workflowMenu";
import { navigateFromRef } from "../../navigation/navigationService";
import TabBarSpacer from "../../navigation/shared/TabBarSpacer";
import { useHideTabBarOnScroll } from "../../navigation/shared/tabBarAutoHide";
import { createReportActions } from "./shared/homeMenuHelpers";
import EmptyState from "../../components/ui/EmptyState";
import { useAppDispatch } from "../../store/hooks";
import { reloadPermissions } from "../../store/PermissionActions";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";
import { markAppReady } from "../../services/splash/splashGate";
import { useAppColors, useStyles } from "../../utils/helpers/colors";
import {
  makeStyles,
  getHomeShortcutCardWidth,
  getHomeShortcutPagerHeight,
  HOME_CONTENT_HORIZONTAL_PADDING,
} from "./HomeScreen.styles";
import {
  chunkHomeShortcutPages,
  getHomeShortcutPageCount,
  HOME_SHORTCUT_PAGE_SIZE,
  getHomeShortcutVisiblePageIndexes,
} from "./shared/homeShortcutPages";

/**
 * Nhóm chức năng + nhánh trong cây menu mà hai ô đếm thiết bị ở khối SỐ LIỆU
 * TOÀN CÔNG TY mở ra. Mã nhóm và id do quản trị khai bên web, dùng chung cho
 * mọi tài khoản. CNTT đã được BE chuyển từ nhóm Tài sản sang nhóm IT.
 */
const ASSET_VIEW_MACHINE = "TaiSan";
const ASSET_MENU_ID_MACHINE = 177;
const ASSET_VIEW_IT = "IT";
const ASSET_MENU_ID_IT = 67;

/**
 * Quyền xem từng phần số liệu Trang chủ — nhóm "Dashboard Tài sản" quản trị khai
 * bên web. BE trả nguyên mã (không có tiền tố `View.`) nên kiểm bằng
 * `hasPermission`, không dùng `canView`.
 */
const DASHBOARD_PERMISSION_MACHINE = "Dashboard.TaiSan.MayMoc";
const DASHBOARD_PERMISSION_IT = "Dashboard.TaiSan.CNTT";
const DASHBOARD_PERMISSION_CAMERA = "Dashboard.TaiSan.Camera";
const DASHBOARD_PERMISSION_ATTENDANCE = "Dashboard.TaiSan.DiemDanh";
const DASHBOARD_PERMISSION_UTILITIES = "Dashboard.TaiSan.TieuThu";

const HomeScreen: React.FC = () => {
  const styles = useStyles(makeStyles);
  const navigation = useNavigation<HomeNavigationProp>();
  const colors = useAppColors();
  const pageBackground = useHomePageBackground();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const tabsNavigation = navigation.getParent() as any;
  const isFocused = useIsFocused();
  const { canView, hasPermission, loaded } = usePermission();
  const dispatch = useAppDispatch();
  const {
    menuItems,
    fetchHomeMenuItems,
    hasLoadedMenuOnce,
    hasMenuLoadError,
    isPinnedFeatureIdsLoading,
    openFeatureTab,
    openReportScreen,
    pinnedFeatureIds,
    togglePinnedFeature,
  } = useHomeMenuItems(navigation, tabsNavigation);
  const {
    dashboard,
    hasDashboardError,
    isDashboardLoading,
    isDashboardStale,
    refreshDashboard,
    updatedAtLabel,
    machine,
    hasMachineError,
    isMachineLoading,
    refreshMachineDashboard,
  } = useHomeDashboard();
  // Thứ tự khối và bảng sắp xếp lấy thẳng từ provider: nút mở bảng nằm trên
  // header do navigator dựng, không đi qua HomeScreen.
  const {
    blockOrder,
    closeBlockOrderSheet,
    isBlockOrderLoading,
    isBlockOrderSheetVisible,
    moveBlock,
    openBlockOrderSheet,
    registerHomeRefresh,
  } = useHomeMenuContext();
  const [hasLoadError, setHasLoadError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCustomizeVisible, setIsCustomizeVisible] = useState(false);
  const [shortcutPage, setShortcutPage] = useState(0);
  const shortcutPagerRef = useRef<ScrollView>(null);
  const scrollRef = useRef<ScrollView>(null);
  // Thu gọn = chạm nhãn màu, khối còn dòng tiêu đề. Ẩn = bỏ chọn khối trong bảng
  // Sắp xếp, khối biến hẳn. Cả hai lưu theo tài khoản.
  const {
    keys: collapsedKeys,
    setIncluded: setBlockCollapsed,
    setManyIncluded: setBlocksCollapsed,
    isLoading: isCollapsedKeysLoading,
  } = useStoredHomeBlockList(HOME_COLLAPSED_BLOCKS_KEY);
  const {
    keys: hiddenKeys,
    setIncluded: setBlockHidden,
    isLoading: isHiddenKeysLoading,
  } = useStoredHomeBlockList(HOME_HIDDEN_BLOCKS_KEY);
  const collapsedKeySet = useMemo(() => new Set(collapsedKeys), [collapsedKeys]);
  const hiddenKeySet = useMemo(() => new Set(hiddenKeys), [hiddenKeys]);
  /** Vị trí từng khối trong trang — đo bằng onLayout vì thứ tự khối đổi được. */
  const blockYRef = useRef<Partial<Record<HomeBlockKey, number>>>({});
  /** Hàng chip dính trên cùng che mất phần đầu khối vừa cuộn tới — phải chừa ra. */
  const jumpBarHeightRef = useRef(0);
  // Hàng chip đi tới khối, và ô "Đã điểm danh hôm nay" (chỉ là số tổng; chi tiết
  // theo bộ phận nằm ở khối điểm danh phía dưới) đều trượt tới khối bằng hàm này.
  const scrollToBlock = useCallback(
    (key: HomeBlockKey) => {
      // Đang thu gọn thì mở ra luôn: chạm để tới mà chỉ thấy dòng tiêu đề là vô ích.
      setBlockCollapsed(key, false);

      const y = blockYRef.current[key];
      if (y == null) return;

      scrollRef.current?.scrollTo({
        // Chừa một chút để dòng tiêu đề khối không dính sát hàng chip.
        y: Math.max(y - jumpBarHeightRef.current - 8, 0),
        animated: true,
      });
    },
    [setBlockCollapsed],
  );
  // Nút lên đầu trang: chỉ đổi state lúc vượt ngưỡng, không phải mỗi khung hình
  // cuộn — màn này dựng lại nặng.
  const [showScrollTop, setShowScrollTop] = useState(false);
  // Thanh tab tự ẩn khi đọc xuống, hiện lại khi vuốt ngược lên (như Facebook).
  const hideTabBarOnScroll = useHideTabBarOnScroll();
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = event.nativeEvent.contentOffset.y > windowHeight * 0.8;
      setShowScrollTop((prev) => (prev === next ? prev : next));
      hideTabBarOnScroll(event);
    },
    [hideTabBarOnScroll, windowHeight],
  );
  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);
  const openCustomizeSheet = useCallback(() => setIsCustomizeVisible(true), []);
  const closeCustomizeSheet = useCallback(
    () => setIsCustomizeVisible(false),
    [],
  );

  const loadPermissions = useCallback(
    async (options?: { isRefresh?: boolean }) => {
      const isRefresh = options?.isRefresh === true;

      if (isRefresh) {
        setIsRefreshing(true);
      }

      try {
        const success = await dispatch(reloadPermissions());
        setHasLoadError(!success);
      } finally {
        if (isRefresh) {
          setIsRefreshing(false);
        }
      }
    },
    [dispatch],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const ensurePermissions = async () => {
        if (!isActive) return;
        await loadPermissions();
      };

      ensurePermissions();

      return () => {
        isActive = false;
      };
    }, [loadPermissions]),
  );

  useNetworkAwareReload(
    () => {
      loadPermissions();
      fetchHomeMenuItems();
      // Thẻ số liệu (tài sản, điểm danh, máy móc): để ra nền từ sáng thì số
      // điểm danh còn là số lúc mở app.
      refreshDashboard();
    },
    {
      enabled: isFocused,
      hasError: hasLoadError || hasMenuLoadError,
      onOffline: () => {
        setHasLoadError(true);
      },
    },
  );

  const refreshHomeData = useCallback(
    async (options?: { silent?: boolean }) => {
      const showSpinner = !options?.silent;
      if (showSpinner) setIsRefreshing(true);
      // Dashboard nằm cùng lượt kéo-để-làm-mới nhưng lỗi của nó không được gộp
      // vào `hasLoadError` — hook tự giữ lỗi bên trong.
      await Promise.all([
        loadPermissions({ isRefresh: showSpinner }),
        fetchHomeMenuItems(),
        refreshDashboard(),
      ]);
      if (showSpinner) setIsRefreshing(false);
    },
    [fetchHomeMenuItems, loadPermissions, refreshDashboard],
  );

  // Nút làm mới trên header dùng đúng lượt tải của kéo-để-tải-lại nhưng KHÔNG
  // bật vòng xoay RefreshControl (icon trên header tự xoay): bật vòng xoay bằng
  // code khi người dùng không kéo, iOS đẩy trang xuống một khoảng, có khi kẹt.
  useEffect(
    () => registerHomeRefresh(() => refreshHomeData({ silent: true })),
    [refreshHomeData, registerHomeRefresh],
  );

  const visibleMenuItems = useMemo(() => {
    if (!loaded) return [];
    return menuItems.filter((item) =>
      item.viewPermission ? canView(item.viewPermission) : true,
    );
  }, [canView, loaded, menuItems]);
  // Phải lọc bỏ nhóm phương tiện y như tab Chức năng: chức năng phương tiện cũng
  // mang `groupMenuId: 2`, nên nếu để nguyên thì Trang chủ sinh ra những id
  // `report:` mà tab Chức năng không bao giờ hiện — ghim không tới được.
  const visibleFeatureItems = useMemo(
    () => visibleMenuItems.filter((item) => item.homeGroup !== "vehicle"),
    [visibleMenuItems],
  );
  const visibleVehicleItems = useMemo(
    () => visibleMenuItems.filter((item) => item.homeGroup === "vehicle"),
    [visibleMenuItems],
  );
  const reportActions = useMemo(
    () => createReportActions(visibleFeatureItems, openReportScreen),
    [openReportScreen, visibleFeatureItems],
  );
  // Bảng Tuỳ chỉnh phải thấy đủ ba nhóm y như tab Chức năng — ghim từ Trang chủ
  // mà thiếu nhóm nào thì user vẫn phải sang tab kia, đúng thứ mà nút này định bỏ.
  const customizeSections = useMemo(
    () =>
      buildHomeCustomizeSections({
        featureItems: visibleFeatureItems,
        reportItems: reportActions,
        vehicleItems: visibleVehicleItems,
      }),
    [reportActions, visibleFeatureItems, visibleVehicleItems],
  );
  // Hàng shortcut lấy đúng thứ tự user đã ghim, không phân biệt chức năng, phương
  // tiện hay báo cáo — tab Chức năng mới là chỗ chia nhóm. Báo cáo mang id có
  // tiền tố `report:` nên nằm chung một danh sách ghim mà không đụng id chức năng.
  const shortcutItems = useMemo(() => {
    const candidatesById = new Map<
      string,
      (typeof visibleMenuItems)[number] | (typeof reportActions)[number]
    >();

    [...visibleMenuItems, ...reportActions].forEach((item) => {
      candidatesById.set(item.id, item);
    });

    return pinnedFeatureIds
      .map((id) => candidatesById.get(id))
      .filter((item): item is NonNullable<typeof item> => !!item);
  }, [pinnedFeatureIds, reportActions, visibleMenuItems]);
  const hasNoViewFeatures = visibleMenuItems.length === 0;
  const hasNoShortcuts = !hasNoViewFeatures && shortcutItems.length === 0;
  // Truy cập nhanh chỉ nói được "chưa ghim gì" khi đã biết ĐỦ hai vế: user ghim
  // những id nào, và những id đó có nằm trong menu khả dụng không. Thiếu vế nào
  // cũng ra một danh sách rỗng giả và block chớp qua thẻ "Chưa ghim chức năng
  // nào" rồi mới nhảy ra lưới thật.
  //
  // Không dùng `menuItems.length === 0` được: danh sách luôn có sẵn mục tĩnh
  // "Điện mặt trời" nên vế đó không bao giờ đúng — cổng chờ coi như không có.
  //
  // Thứ tự / ẩn / thu gọn khối cũng đọc từ máy theo username (Keychain) như
  // danh sách ghim — chờ luôn, không thì khối nhảy chỗ, loé lên rồi mới ẩn.
  const isBlockPrefsLoading =
    isBlockOrderLoading || isCollapsedKeysLoading || isHiddenKeysLoading;
  const isInitialMenuLoading =
    !hasLoadedMenuOnce || isPinnedFeatureIdsLoading || isBlockPrefsLoading;
  // Splash native bên Android giữ tới đây rồi mới gỡ. Màn lỗi cũng tính là xong:
  // thà thấy lý do hỏng còn hơn ngồi nhìn splash tới lúc trần thời gian đá ra.
  const isHomeSettled =
    hasLoadError || hasMenuLoadError || (loaded && !isInitialMenuLoading);

  useEffect(() => {
    if (isHomeSettled) markAppReady();
  }, [isHomeSettled]);
  // Một chỉ số / một dòng hoạt động chỉ hữu ích khi bấm được. Thay vì hard-code
  // route, tra lại chính chức năng có cùng viewPermission và dùng luôn onPress
  // của nó — quyền và tham số điều hướng đã đúng sẵn.
  const menuItemByPermission = useMemo(() => {
    const itemsByPermission = new Map<
      string,
      (typeof visibleMenuItems)[number]
    >();

    visibleMenuItems.forEach((item) => {
      if (item.viewPermission && !itemsByPermission.has(item.viewPermission)) {
        itemsByPermission.set(item.viewPermission, item);
      }
    });

    return itemsByPermission;
  }, [visibleMenuItems]);
  // Mỗi phần số liệu đi theo một mã quyền Dashboard Tài sản, thiếu mã nào thì
  // phần đó ẩn hẳn (kể cả khung chờ):
  // - MayMoc: ô thiết bị máy móc + hai trang cơ cấu / tăng trưởng máy móc.
  // - CNTT: ô thiết bị CNTT + trang cơ cấu thiết bị CNTT.
  // - Camera: ô camera.
  // - DiemDanh: ô đã điểm danh + khối điểm danh.
  // - TieuThu: khối tiêu thụ điện · nước · hơi.
  // `hasPermission` trả false khi quyền chưa tải xong.
  const canViewMachine = hasPermission(DASHBOARD_PERMISSION_MACHINE);
  const canViewIt = hasPermission(DASHBOARD_PERMISSION_IT);
  const canViewCamera = hasPermission(DASHBOARD_PERMISSION_CAMERA);
  const canViewAttendance = hasPermission(DASHBOARD_PERMISSION_ATTENDANCE);
  const canViewUtilities = hasPermission(DASHBOARD_PERMISSION_UTILITIES);
  const statTileCount = [
    canViewMachine,
    canViewIt,
    canViewCamera,
    canViewAttendance,
  ].filter(Boolean).length;
  // Hai ô thiết bị mở màn Asset của nhóm tương ứng nhưng chỉ hiện đúng nhánh
  // của nó: máy móc là mục 177 nhóm Tài sản, CNTT là mục 67 nhóm IT (id do quản
  // trị khai, không đổi theo tài khoản). Không tra được nhóm (mất quyền) thì ô
  // không bấm được như trước.
  const openAssetBranch = useCallback(
    (viewPermission: string, rootMenuId: number) => {
      const assetItem = menuItemByPermission.get(viewPermission);
      if (!assetItem) return undefined;

      return () =>
        navigation.navigate("Asset", {
          groupMenuId: assetItem.groupMenuId,
          titleHeader: assetItem.label,
          viewPermission: assetItem.viewPermission,
          rootMenuId,
        });
    },
    [menuItemByPermission, navigation],
  );
  const statTiles = useMemo<HomeStatTile[]>(() => {
    if (!dashboard) return [];

    const tiles: HomeStatTile[] = [];
    const { attendance, devices } = dashboard;

    // Hiện ô theo quyền Dashboard; còn bấm được hay không lại theo quyền chức
    // năng (View.TaiSan / IT / Camera). Có quyền xem số mà thiếu quyền chức năng
    // thì ô vẫn hiện, chỉ không bấm được (`menuItemByPermission` không có mục).
    if (canViewMachine) {
      tiles.push({
        key: "device-machines",
        iconName: "cube-outline",
        iconBg: colors.redIconSurface,
        iconColor: colors.redLight,
        // Nhãn ngắn để vừa hai dòng cạnh mũi tên ›, không bị cắt "…".
        label: "Máy móc đang quản lý",
        value: formatHomeNumber(devices.machines),
        onPress: openAssetBranch(ASSET_VIEW_MACHINE, ASSET_MENU_ID_MACHINE),
      });
    }

    if (canViewIt) {
      tiles.push({
        key: "device-it",
        iconName: "hardware-chip-outline",
        iconBg: colors.indigoSurface,
        iconColor: colors.blue,
        label: "Thiết bị CNTT đang dùng",
        value: formatHomeNumber(devices.it),
        // Camera đếm riêng ở ô khác, tổng CNTT của API không gồm camera — ghi
        // rõ để không ai cộng hai ô lại rồi thắc mắc lệch số.
        sub: "Chưa gồm camera",
        onPress: openAssetBranch(ASSET_VIEW_IT, ASSET_MENU_ID_IT),
      });
    }

    if (canViewCamera) {
      tiles.push({
        key: "device-camera",
        iconName: "videocam-outline",
        iconBg: colors.blueSurface,
        iconColor: colors.sky,
        label: "Camera đang hoạt động",
        value: formatHomeNumber(devices.camera),
        onPress: menuItemByPermission.get("Camera")?.onPress,
      });
    }

    if (canViewAttendance) {
      // Ô này LUÔN là số toàn công ty, không đổi theo combobox bộ phận ở khối
      // điểm danh bên dưới.
      tiles.push({
        key: "attendance-today",
        iconName: "people-outline",
        iconBg: colors.violetSurface,
        iconColor: colors.violet,
        label: "Đã điểm danh hôm nay",
        value:
          attendance.total == null
            ? HOME_NO_DATA
            : `${formatHomeCount(attendance.checkedIn)} / ${formatHomeNumber(
                attendance.total,
              )}`,
        sub: attendance.total == null ? undefined : "người",
        // Không có khối điểm danh phía dưới (không có số, hoặc user đã tắt khối
        // trong Sắp xếp) thì không có chỗ nào để trượt tới.
        onPress:
          attendance && !hiddenKeySet.has("attendance")
            ? () => scrollToBlock("attendance")
            : undefined,
      });
    }

    return tiles;
  }, [
    canViewAttendance,
    canViewCamera,
    canViewIt,
    canViewMachine,
    colors,
    dashboard,
    hiddenKeySet,
    menuItemByPermission,
    openAssetBranch,
    scrollToBlock,
  ]);
  const itStructure = useMemo(() => {
    if (!canViewIt) return null;
    if (!dashboard?.itStructure?.items?.length) return null;

    return dashboard.itStructure;
  }, [canViewIt, dashboard]);
  const utilityRows = useMemo<HomeUtilityRow[]>(() => {
    // Payload trong cache có thể là của bản app cũ, chưa có khối này.
    if (!dashboard?.utilities?.items?.length) return [];
    if (!canViewUtilities) return [];

    const iconThemeByKey: Record<
      string,
      { iconBg: string; iconColor: string }
    > = {
      electricity: { iconBg: colors.amberLight, iconColor: colors.amber },
      solar: { iconBg: colors.orangeSurface, iconColor: colors.violet },
      water: { iconBg: colors.blueSurface, iconColor: colors.sky },
      // Nước thải đứng ngay dưới nước cấp nên phải khác màu hẳn, không thì hai
      // dòng liền nhau cùng icon xanh đọc như một dòng bị lặp. Tránh luôn
      // `slate` vì đó là màu đoạn BL của vạch chia hai nhà máy.
      wasteWater: { iconBg: colors.tealSurface, iconColor: colors.green },
      steam: { iconBg: colors.redSurface, iconColor: colors.rose },
    };

    return dashboard.utilities.items.map((item) => ({
      ...item,
      iconBg: iconThemeByKey[item.key]?.iconBg ?? colors.slateLight,
      iconColor: iconThemeByKey[item.key]?.iconColor ?? colors.slate,
    }));
  }, [canViewUtilities, colors, dashboard]);
  const utilityPeriodLabel = dashboard
    ? formatHomePeriodLabel(dashboard.period.month, dashboard.period.year)
    : "";
  const attendance = useMemo(() => {
    if (!canViewAttendance) return null;
    if (!dashboard?.attendance) return null;

    return dashboard.attendance;
  }, [canViewAttendance, dashboard]);
  // Lần đầu chưa có gì trong cache thì mới dựng skeleton. Đang có số mà làm mới
  // thì giữ nguyên số cũ — nhảy sang skeleton rồi nhảy về làm cả trang giật.
  const isFirstDashboardLoad = isDashboardLoading && !dashboard;
  // API dashboard chết mà không còn gì trong cache thì phải nói ra, kèm nút thử
  // lại — nếu không cả trang chỉ còn hàng shortcut và user không biết là hôm nay
  // không có số liệu hay app hỏng.
  const hasDashboardLoadFailure = hasDashboardError && !dashboard;
  // Lúc chưa có dữ liệu thì `statTiles` rỗng dù có quyền, vẫn phải dựng khung
  // chờ. Thẻ lỗi kèm nút Tải lại thì hiện cho ai được xem BẤT KỲ phần nào của
  // endpoint này (cả người chỉ có quyền tiêu thụ): khối của họ đang trống vì
  // lỗi, không có chỗ nào khác báo.
  const hasStatSection =
    statTiles.length > 0 ||
    (statTileCount > 0 && isFirstDashboardLoad) ||
    ((statTileCount > 0 || canViewUtilities) && hasDashboardLoadFailure);
  const hasUtilitySection =
    utilityRows.length > 0 || (canViewUtilities && isFirstDashboardLoad);
  const hasItStructureSection =
    itStructure !== null || (canViewIt && isFirstDashboardLoad);
  // Như các khối cùng endpoint: lượt tải đầu vẫn chiếm chỗ (thẻ tự vẽ khung
  // chờ), không thì khối chen vào sau đẩy cả trang xuống.
  const hasAttendanceSection =
    attendance !== null || (canViewAttendance && isFirstDashboardLoad);
  // Hai card máy móc có nguồn riêng nên lượt tải đầu cũng riêng: endpoint kia đã
  // có cache mà endpoint này chưa về thì trang 1-2 mới là phần đang chờ.
  const isFirstMachineLoad = isMachineLoading && !machine;
  const hasMachineSection =
    canViewMachine &&
    (machine !== null || hasMachineError || isFirstMachineLoad);
  // Khu cuộn ngang giữ đủ các trang được phép xem, chỉ cần MỘT trang có gì để
  // hiện.
  const hasAssetStructureSection = hasItStructureSection || hasMachineSection;
  const homeContentWidth = windowWidth - HOME_CONTENT_HORIZONTAL_PADDING * 2;
  const shortcutCardWidth = getHomeShortcutCardWidth(
    homeContentWidth,
    shortcutItems.length,
  );
  const shortcutPagerHeight = getHomeShortcutPagerHeight(shortcutItems.length);
  const shortcutPages = useMemo(
    () => chunkHomeShortcutPages(shortcutItems),
    [shortcutItems],
  );
  const shortcutPageCount = getHomeShortcutPageCount(shortcutItems.length);
  const shortcutVisiblePageIndexes = getHomeShortcutVisiblePageIndexes(
    shortcutPage,
    shortcutPageCount,
  );
  // Bỏ ghim làm số trang co lại: trang đang xem có thể không còn tồn tại, phải
  // kéo cả state và vị trí cuộn về trang cuối cùng còn lại.
  useEffect(() => {
    if (shortcutPageCount === 0) {
      if (shortcutPage !== 0) setShortcutPage(0);
      return;
    }

    if (shortcutPage < shortcutPageCount) return;

    const lastPage = shortcutPageCount - 1;
    setShortcutPage(lastPage);
    shortcutPagerRef.current?.scrollTo({
      x: lastPage * homeContentWidth,
      animated: false,
    });
  }, [homeContentWidth, shortcutPage, shortcutPageCount]);
  const handleShortcutPagerScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (homeContentWidth <= 0) return;

      const nextPage = Math.round(
        event.nativeEvent.contentOffset.x / homeContentWidth,
      );

      setShortcutPage((current) => (current === nextPage ? current : nextPage));
    },
    [homeContentWidth],
  );
  const goToShortcutPage = useCallback(
    (page: number) => {
      setShortcutPage(page);
      shortcutPagerRef.current?.scrollTo({
        x: page * homeContentWidth,
        animated: true,
      });
    },
    [homeContentWidth],
  );
  // Thứ tự user đã lưu, lọc còn lại đúng những khối đang hiện. Khối bị ẩn vì
  // thiếu quyền / chưa có dữ liệu vẫn nằm trong `blockOrder` để lần sau hiện lại
  // đúng chỗ cũ.
  const orderedBlockKeys = useMemo<HomeBlockKey[]>(() => {
    const isBlockVisible: Record<HomeBlockKey, boolean> = {
      stats: hasStatSection,
      // Truy cập nhanh luôn có mặt: không quyền thì hiện thẻ giải thích, chưa
      // ghim thì hiện lời mời ghim.
      shortcuts: true,
      // Lọc theo quyền View.Workflow ngay dưới (ngoài memo).
      workflow: true,
      assetStructure: hasAssetStructureSection,
      attendance: hasAttendanceSection,
      utilities: hasUtilitySection,
    };

    return blockOrder.filter((key) => isBlockVisible[key]);
  }, [
    hasAttendanceSection,
    blockOrder,
    hasAssetStructureSection,
    hasStatSection,
    hasUtilitySection,
  ]);
  const canViewWorkflow = loaded && canView(WORKFLOW_VIEW_CODE);
  // Khối tài khoản này có thể xem (đủ quyền, có dữ liệu). Bảng Sắp xếp liệt kê
  // đủ chừng này — kể cả khối user đã tắt, để còn bật lại.
  const availableBlockKeys = canViewWorkflow
    ? orderedBlockKeys
    : orderedBlockKeys.filter((key) => key !== "workflow");
  // Khối thật sự hiện trên Trang chủ: bỏ những khối user đã tắt.
  const visibleBlockKeys = availableBlockKeys.filter(
    (key) => !hiddenKeySet.has(key),
  );
  // Một hai khối thì cuộn chút là thấy hết, hàng chip chỉ chiếm chỗ.
  const showJumpBar = visibleBlockKeys.length >= 3;
  // Đè giữ nhãn khối nào cũng được: còn khối mở thì gập hết, đã gập hết thì mở
  // hết. Chỉ các khối đang hiện — khối đã ẩn ở Sắp xếp giữ nguyên.
  const toggleAllBlocksCollapsed = () => {
    const allCollapsed = visibleBlockKeys.every((key) =>
      collapsedKeySet.has(key),
    );
    setBlocksCollapsed(visibleBlockKeys, !allCollapsed);
  };

  useEffect(() => {
    if (!showJumpBar) jumpBarHeightRef.current = 0;
  }, [showJumpBar]);
  const handleMoveBlock = useCallback(
    ({
      fromIndex,
      toIndex,
      keys,
    }: {
      fromIndex: number;
      toIndex: number;
      keys: string[];
    }) => {
      const visibleKeys = keys.filter(isHomeBlockKey);

      // Lọc mà mất phần tử là chỉ số đã lệch — thà bỏ lượt kéo còn hơn lưu sai.
      if (visibleKeys.length !== keys.length) return;

      moveBlock({ visibleKeys, fromIndex, toIndex });
    },
    [moveBlock],
  );

  if (hasLoadError || hasMenuLoadError) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.centerState,
          { backgroundColor: pageBackground },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => refreshHomeData()}
            colors={[HOME_BRAND_RED]}
            tintColor={HOME_BRAND_RED}
          />
        }
      >
        <EmptyState
          iconName="cloud-offline-outline"
          title="Không thể tải dữ liệu Trang chủ"
          subtitle="Vui lòng kiểm tra kết nối hoặc kéo xuống để thử lại."
        />
      </ScrollView>
    );
  }

  if (!loaded || isInitialMenuLoading) {
    return (
      <HomeScreenSkeleton
        // Đọc xong quyền thì đã biết đúng các khối sắp hiện; chưa thì đoán theo
        // thứ tự đã lưu, bỏ những khối user đã tắt.
        blockKeys={
          loaded
            ? visibleBlockKeys
            : blockOrder.filter((key) => !hiddenKeySet.has(key))
        }
        collapsedKeys={collapsedKeys}
        statTileCount={loaded ? statTileCount : undefined}
      />
    );
  }

  // Mỗi khối: nhãn màu của nhóm (chạm để thu gọn / mở) + nội dung, bọc trong
  // context màu nhóm để card bên trong tự tô mép trên. Thu gọn là gỡ hẳn nội
  // dung, không chỉ ẩn — khối đang gập không tải gì thêm.
  const renderBlock = (
    key: HomeBlockKey,
    title: Omit<
      React.ComponentProps<typeof HomeSectionTitle>,
      "tone" | "iconName" | "collapsed" | "onToggleCollapsed" | "onLongPress"
    >,
    content: React.ReactNode,
  ) => {
    const isCollapsed = collapsedKeySet.has(key);

    return (
      <HomeBlockToneContext.Provider value={HOME_BLOCK_TONES[key]}>
        <HomeSectionTitle
          {...title}
          tone={HOME_BLOCK_TONES[key]}
          iconName={HOME_BLOCK_META[key].iconName}
          collapsed={isCollapsed}
          onToggleCollapsed={() => setBlockCollapsed(key, !isCollapsed)}
          onLongPress={toggleAllBlocksCollapsed}
        />
        {isCollapsed ? null : content}
      </HomeBlockToneContext.Provider>
    );
  };
  // Thẻ lỗi / thẻ trống dựng thẳng ở đây (ngoài context khối) nên tự lấy viền và
  // mép trên theo màu nhãn khối của nó.
  const statsCardChrome = getHomeCardChrome({
    borderColor: HOME_BLOCK_TONES.stats.label,
    shadowColor: colors.shadow,
    accent: HOME_BLOCK_TONES.stats.label,
  });
  const shortcutsCardChrome = getHomeCardChrome({
    borderColor: HOME_BLOCK_TONES.shortcuts.label,
    shadowColor: colors.shadow,
    accent: HOME_BLOCK_TONES.shortcuts.label,
  });

  // Thứ tự hiển thị do `visibleBlockKeys` quyết định, không nằm trong JSX.
  const blockNodes: Record<HomeBlockKey, React.ReactNode> = {
    stats: renderBlock(
      "stats",
      {
        label: "SỐ LIỆU TOÀN CÔNG TY",
        // Còn giữ số cũ vì lượt gọi mới nhất thất bại thì phải ghi rõ ở đây —
        // lưới số liệu không có chỗ nào khác để báo. Giờ SERVER lúc chạy proc,
        // không phải giờ máy — người xem cần biết đang xem số cũ hay số mới.
        note: updatedAtLabel
          ? `${isDashboardStale ? "Số cũ · s" : "S"}ố liệu lúc ${updatedAtLabel}`
          : undefined,
      },
      hasDashboardLoadFailure ? (
        <View
          style={[
            styles.overviewErrorCard,
            statsCardChrome,
            { backgroundColor: colors.surface },
          ]}
        >
          <Ionicons
            name="cloud-offline-outline"
            size={18}
            color={colors.textMuted}
          />
          <Text
            style={[styles.overviewErrorText, { color: colors.textSecondary }]}
          >
            Không lấy được số liệu dashboard. Vui lòng thử lại.
          </Text>
          <TouchableOpacity onPress={refreshDashboard} activeOpacity={0.7}>
            <Text
              style={[styles.overviewErrorAction, { color: HOME_BRAND_RED }]}
            >
              Tải lại
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <HomeStatTiles
          tiles={statTiles}
          isLoading={isFirstDashboardLoad}
          // Quyền đã đọc xong ở nhánh này, nên khung chờ ra đúng số ô sắp hiện.
          skeletonCount={statTileCount}
        />
      ),
    ),
    shortcuts: renderBlock(
      "shortcuts",
      {
        label: "TRUY CẬP NHANH",
        note:
          shortcutItems.length > 0
            ? `Đã ghim ${shortcutItems.length} mục`
            : undefined,
        // Không có chức năng nào khả dụng thì bảng tuỳ chỉnh cũng rỗng — ẩn nút
        // đi thay vì mở ra một danh sách trắng.
        action: hasNoViewFeatures ? undefined : "Tuỳ chỉnh",
        actionIconName: "options-outline",
        onAction: openCustomizeSheet,
      },
      hasNoViewFeatures ? (
        <View
          style={[
            styles.noPermissionCard,
            shortcutsCardChrome,
            { backgroundColor: colors.surface },
          ]}
        >
          <EmptyState
            iconName="lock-closed-outline"
            title="Chưa có chức năng khả dụng"
            subtitle="Tài khoản hiện tại chưa được cấp quyền xem chức năng nào. Vui lòng liên hệ IT nếu bạn cần thêm quyền truy cập."
            fullHeight={false}
          />
        </View>
      ) : hasNoShortcuts ? (
        <TouchableOpacity
          style={[
            styles.noPermissionCard,
            shortcutsCardChrome,
            { backgroundColor: colors.surface },
          ]}
          activeOpacity={0.78}
          onPress={openCustomizeSheet}
        >
          <EmptyState
            iconName="add-circle-outline"
            title="Chưa ghim chức năng nào"
            subtitle="Bấm vào đây hoặc nút Tuỳ chỉnh để chọn chức năng, báo cáo hiện ra Trang chủ."
            fullHeight={false}
          />
        </TouchableOpacity>
      ) : (
        <>
          <ScrollView
            ref={shortcutPagerRef}
            style={[styles.shortcutPager, { height: shortcutPagerHeight }]}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            onMomentumScrollEnd={handleShortcutPagerScrollEnd}
            scrollEventThrottle={16}
          >
            {shortcutPages.map((page, pageIndex) => (
              <View
                key={`shortcut-page-${pageIndex}`}
                style={[styles.shortcutPage, { width: homeContentWidth }]}
              >
                {page.map((item, indexInPage) => (
                  <View
                    key={item.id}
                    style={[styles.shortcutCard, { width: shortcutCardWidth }]}
                  >
                    <HomeMenuItemCard
                      {...item}
                      index={pageIndex * HOME_SHORTCUT_PAGE_SIZE + indexInPage}
                      fixedHeight
                    />
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
          <View style={styles.shortcutFooter}>
            {/* Nhiều hơn một trang mới có gì để chỉ; một trang thì hàng này
                chỉ còn "Xem tất cả" nằm bên phải. */}
            <View style={styles.shortcutDots}>
              {shortcutPageCount > 1
                ? shortcutVisiblePageIndexes.map((pageIndex) => (
                    <TouchableOpacity
                      key={`shortcut-dot-${pageIndex}`}
                      onPress={() => goToShortcutPage(pageIndex)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, right: 4, bottom: 8, left: 4 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Trang ${pageIndex + 1}`}
                    >
                      <View
                        style={[
                          styles.shortcutDot,
                          pageIndex === shortcutPage &&
                            styles.shortcutDotActive,
                        ]}
                      />
                    </TouchableOpacity>
                  ))
                : null}
            </View>
            <TouchableOpacity
              style={styles.shortcutViewAll}
              onPress={openFeatureTab}
              activeOpacity={0.7}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Xem tất cả"
            >
              <Text style={styles.shortcutViewAllText}>Xem tất cả</Text>
              <Ionicons
                name="chevron-forward"
                size={13}
                color={HOME_BRAND_RED}
              />
            </TouchableOpacity>
          </View>
        </>
      ),
    ),
    // Một nhãn cho cả khu cuộn ngang; tiêu đề riêng của từng trang vẫn nằm trong
    // card, vuốt sang trang khác là tiêu đề đổi theo — không đọc nhầm số.
    assetStructure: renderBlock(
      "assetStructure",
      { label: "CƠ CẤU TÀI SẢN" },
      <HomeAssetStructurePager
        pageWidth={homeContentWidth}
        showMachinePages={canViewMachine}
        showItPage={canViewIt}
        itStructure={itStructure}
        machine={machine}
        isDashboardLoading={isFirstDashboardLoad}
        isMachineLoading={isFirstMachineLoad}
        hasMachineError={hasMachineError}
        onRetryMachine={refreshMachineDashboard}
        resetToken={dashboard?.updatedAt ?? ""}
      />,
    ),
    workflow: canViewWorkflow
      ? renderBlock(
          "workflow",
          {
            label: "TỔNG QUAN CÔNG VIỆC",
            action: "Xem chi tiết",
            onAction: () => navigateFromRef("CongViec"),
          },
          // Tự tải; Trang chủ làm mới (dashboard đổi updatedAt) là tải lại theo.
          <WorkflowDashboardCard reloadKey={dashboard?.updatedAt ?? ""} />,
        )
      : null,
    attendance: renderBlock(
      "attendance",
      { label: "ĐIỂM DANH NHÂN SỰ HÔM NAY" },
      // Lượt tải đầu chưa có số: khung chờ (thẻ thật chưa có số là báo lỗi Bravo8).
      attendance === null ? (
        <AttendanceSkeleton />
      ) : (
        <HomeAttendanceCard
          total={attendance.total ?? null}
          checkedIn={attendance.checkedIn ?? null}
          notCheckedIn={attendance.notCheckedIn ?? null}
          departments={attendance.departments ?? []}
          isLoading={isFirstDashboardLoad}
        />
      ),
    ),
    utilities: renderBlock(
      "utilities",
      {
        // Kỳ tiêu thụ là THÁNG TRƯỚC và do SQL tự quyết — tiêu đề phải ghi rõ
        // tháng nhận được, không tự trừ thêm một tháng.
        label: utilityPeriodLabel
          ? `TIÊU THỤ ${utilityPeriodLabel.toUpperCase()}`
          : "TIÊU THỤ ĐIỆN · NƯỚC · HƠI",
      },
      <HomeUtilityCard
        rows={utilityRows}
        periodLabel={utilityPeriodLabel || undefined}
        isLoading={isFirstDashboardLoad}
      />,
    ),
  };
  const reorderItems: HomeReorderItem[] = availableBlockKeys.map((key) => ({
    key,
    ...HOME_BLOCK_META[key],
    hidden: hiddenKeySet.has(key),
    accent: HOME_BLOCK_TONES[key].label,
    iconColor: HOME_BLOCK_TONES[key].accent,
  }));

  return (
    <View style={[styles.root, { backgroundColor: pageBackground }]}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        // 16 (mỗi khung hình) để thanh tab ẩn/hiện bám tay; `handleScroll` chỉ
        // đổi state lúc vượt ngưỡng nên gọi dày không làm màn dựng lại.
        scrollEventThrottle={16}
        // Hàng chip là con đầu tiên và dính trên cùng khi cuộn.
        stickyHeaderIndices={showJumpBar ? [0] : undefined}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => refreshHomeData()}
            colors={[HOME_BRAND_RED]}
            tintColor={HOME_BRAND_RED}
          />
        }
      >
        {showJumpBar ? (
          <HomeJumpBar
            keys={visibleBlockKeys}
            onJump={scrollToBlock}
            backgroundColor={pageBackground}
            onLayout={(event) => {
              jumpBarHeightRef.current = event.nativeEvent.layout.height;
            }}
          />
        ) : null}
        {visibleBlockKeys.map((key) => (
          <View
            key={key}
            style={styles.block}
            onLayout={(event) => {
              blockYRef.current[key] = event.nativeEvent.layout.y;
            }}
          >
            {blockNodes[key]}
          </View>
        ))}
        {/* Tắt hết khối trong Sắp xếp thì Trang chủ trắng trơn — phải chỉ đường
            bật lại, không thì tưởng app hỏng. */}
        {visibleBlockKeys.length === 0 && availableBlockKeys.length > 0 ? (
          <View
            style={[styles.noPermissionCard, { backgroundColor: colors.surface }]}
          >
            <EmptyState
              iconName="eye-off-outline"
              title="Bạn đã ẩn hết các khối"
              subtitle="Mở Sắp xếp (nút mũi tên lên xuống trên đầu trang) rồi chọn lại khối muốn xem."
              actionLabel="Mở Sắp xếp"
              onActionPress={openBlockOrderSheet}
              fullHeight={false}
            />
          </View>
        ) : null}
        <TabBarSpacer />
      </ScrollView>

      <HomeScrollTopButton visible={showScrollTop} onPress={scrollToTop} />

      <HomeBlockOrderSheet
        visible={isBlockOrderSheetVisible}
        items={reorderItems}
        onMove={handleMoveBlock}
        onToggleHidden={(key, hidden) => {
          if (isHomeBlockKey(key)) setBlockHidden(key, hidden);
        }}
        onClose={closeBlockOrderSheet}
      />

      <HomeCustomizeSheet
        visible={isCustomizeVisible}
        sections={customizeSections}
        pinnedIds={pinnedFeatureIds}
        onTogglePinned={togglePinnedFeature}
        onClose={closeCustomizeSheet}
      />
    </View>
  );
};

export default HomeScreen;
