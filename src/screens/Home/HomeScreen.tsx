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
import HomeScreenSkeleton from "./shared/HomeScreenSkeleton";
import { HOME_BRAND_RED } from "./shared/homeTheme";
import {
  formatHomeCount,
  formatHomeNumber,
  formatHomePeriodLabel,
  HOME_NO_DATA,
} from "./shared/homeFormat";
import { useHomeDashboard } from "./shared/useHomeDashboard";
import { useHomeMenuContext } from "./shared/HomeMenuProvider";
import { useHomeMenuItems } from "./shared/useHomeMenuItems";
import { createReportActions } from "./shared/homeMenuHelpers";
import EmptyState from "../../components/ui/EmptyState";
import { useAppDispatch } from "../../store/hooks";
import { reloadPermissions } from "../../store/PermissionActions";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";
import { markAppReady } from "../../services/splash/splashGate";
import {
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../utils/helpers/colors";
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

const HomeScreen: React.FC = () => {
  const styles = useStyles(makeStyles);
  const navigation = useNavigation<HomeNavigationProp>();
  const colors = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();
  const { width: windowWidth } = useWindowDimensions();
  const tabsNavigation = navigation.getParent() as any;
  const isFocused = useIsFocused();
  const { canView, loaded } = usePermission();
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
    isBlockOrderSheetVisible,
    moveBlock,
    registerHomeRefresh,
  } = useHomeMenuContext();
  const [hasLoadError, setHasLoadError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCustomizeVisible, setIsCustomizeVisible] = useState(false);
  const [shortcutPage, setShortcutPage] = useState(0);
  const shortcutPagerRef = useRef<ScrollView>(null);
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
    },
    {
      enabled: isFocused,
      hasError: hasLoadError || hasMenuLoadError,
      onOffline: () => {
        setHasLoadError(true);
      },
    },
  );

  const refreshHomeData = useCallback(async () => {
    setIsRefreshing(true);
    // Dashboard nằm cùng lượt kéo-để-làm-mới nhưng lỗi của nó không được gộp
    // vào `hasLoadError` — hook tự giữ lỗi bên trong.
    await Promise.all([
      loadPermissions({ isRefresh: true }),
      fetchHomeMenuItems(),
      refreshDashboard(),
    ]);
    setIsRefreshing(false);
  }, [fetchHomeMenuItems, loadPermissions, refreshDashboard]);

  // Nút làm mới trên header dùng đúng lượt làm mới của kéo-để-tải-lại, nên vòng
  // xoay của RefreshControl cũng chạy theo — không có hai đường tải khác nhau.
  useEffect(
    () => registerHomeRefresh(refreshHomeData),
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
  const isInitialMenuLoading = !hasLoadedMenuOnce || isPinnedFeatureIdsLoading;
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
  // Số liệu Trang chủ KHÔNG chặn theo quyền phía app: chỉ là số tổng hợp, muốn
  // xem chi tiết thì vẫn phải vào chức năng — chỗ đó đã chặn quyền sẵn. Chỉ khi
  // BE khai `viewPermission` cho khối thì mới chặn theo đúng mã đó.
  const canViewBlock = useCallback(
    (viewPermission?: string) => {
      if (!viewPermission) return true;

      return loaded && canView(viewPermission);
    },
    [canView, loaded],
  );
  const canViewAttendance = canViewBlock(dashboard?.attendance?.viewPermission);
  const statTiles = useMemo<HomeStatTile[]>(() => {
    if (!dashboard) return [];

    const tiles: HomeStatTile[] = [];
    const { attendance, devices } = dashboard;

    // Số nào API trả thì hiện. Tài khoản không có quyền tài sản / camera chỉ là
    // ô không bấm được (`menuItemByPermission` không có chức năng tương ứng),
    // chứ không mất số.
    tiles.push({
      key: "device-machines",
      iconName: "cube-outline",
      iconBg: colors.redIconSurface,
      iconColor: colors.redLight,
      label: "Thiết bị máy móc đang quản lý",
      value: formatHomeNumber(devices.machines),
      onPress: menuItemByPermission.get("TaiSan")?.onPress,
    });

    tiles.push({
      key: "device-it",
      iconName: "hardware-chip-outline",
      iconBg: colors.indigoSurface,
      iconColor: colors.blue,
      label: "Thiết bị CNTT đang sử dụng",
      value: formatHomeNumber(devices.it),
      // Camera đếm riêng ở ô dưới, tổng CNTT của API không gồm camera — ghi rõ
      // để không ai cộng hai ô lại rồi thắc mắc lệch số.
      sub: "Chưa gồm camera",
      onPress: menuItemByPermission.get("TaiSan")?.onPress,
    });

    tiles.push({
      key: "device-camera",
      iconName: "videocam-outline",
      iconBg: colors.blueSurface,
      iconColor: colors.sky,
      label: "Camera đang hoạt động",
      value: formatHomeNumber(devices.camera),
      onPress: menuItemByPermission.get("Camera")?.onPress,
    });

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
      });
    }

    return tiles;
  }, [canViewAttendance, colors, dashboard, menuItemByPermission]);
  const canViewItStructure = canViewBlock(
    dashboard?.itStructure?.viewPermission,
  );
  const itStructure = useMemo(() => {
    if (!canViewItStructure) return null;
    if (!dashboard?.itStructure?.items?.length) return null;

    return dashboard.itStructure;
  }, [canViewItStructure, dashboard]);
  // Tính riêng khỏi `utilityRows` vì khung chờ (skeleton) cũng phải theo quyền:
  // lần mở app đầu tiên chưa có cache, nếu chỉ chặn ở phần dữ liệu thì tài khoản
  // không được xem vẫn thấy khung "ĐIỆN · NƯỚC · HƠI" nhá lên rồi mất — chỉ xảy
  // ra khi BE khai `viewPermission` cho khối này.
  const canViewUtilities = canViewBlock(dashboard?.utilities?.viewPermission);
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
  // Ba ô đếm thiết bị luôn hiện nên lưới số liệu luôn có phần để hiện; lúc chưa
  // có dữ liệu thì `statTiles` rỗng vì lý do khác, vẫn phải dựng khung chờ / thẻ
  // lỗi kèm nút Tải lại.
  const hasStatSection =
    statTiles.length > 0 || isFirstDashboardLoad || hasDashboardLoadFailure;
  const hasUtilitySection =
    utilityRows.length > 0 || (canViewUtilities && isFirstDashboardLoad);
  const hasItStructureSection =
    itStructure !== null || (canViewItStructure && isFirstDashboardLoad);
  // Hai card máy móc có nguồn riêng nên lượt tải đầu cũng riêng: endpoint kia đã
  // có cache mà endpoint này chưa về thì trang 1-2 mới là phần đang chờ.
  const isFirstMachineLoad = isMachineLoading && !machine;
  // Khu cuộn ngang luôn giữ đủ ba trang, chỉ cần MỘT trong ba có gì để hiện.
  const hasAssetStructureSection =
    hasItStructureSection ||
    machine !== null ||
    hasMachineError ||
    isFirstMachineLoad;
  const homeContentWidth = windowWidth - HOME_CONTENT_HORIZONTAL_PADDING * 2;
  const shortcutCardWidth = getHomeShortcutCardWidth(homeContentWidth);
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
  const visibleBlockKeys = useMemo<HomeBlockKey[]>(() => {
    const isBlockVisible: Record<HomeBlockKey, boolean> = {
      stats: hasStatSection,
      // Truy cập nhanh luôn có mặt: không quyền thì hiện thẻ giải thích, chưa
      // ghim thì hiện lời mời ghim.
      shortcuts: true,
      assetStructure: hasAssetStructureSection,
      attendance: attendance !== null,
      utilities: hasUtilitySection,
    };

    return blockOrder.filter((key) => isBlockVisible[key]);
  }, [
    attendance,
    blockOrder,
    hasAssetStructureSection,
    hasStatSection,
    hasUtilitySection,
  ]);
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
          { backgroundColor: colors.bg },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshHomeData}
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
    return <HomeScreenSkeleton />;
  }

  // Mỗi khối là một hàm dựng, nhận sẵn tay nắm kéo thả để gắn vào dòng tiêu đề.
  // Thứ tự hiển thị do `visibleBlockKeys` quyết định, không còn nằm trong JSX.
  const blockNodes: Record<HomeBlockKey, React.ReactNode> = {
    stats: (
      <>
        {/* Còn giữ số cũ vì lượt gọi mới nhất thất bại thì phải ghi rõ ở
          đây — lưới số liệu không có chỗ nào khác để báo. */}
        <HomeSectionTitle
          label="SỐ LIỆU TOÀN CÔNG TY"
          // Giờ SERVER lúc chạy proc, không phải giờ máy — người xem cần biết
          // đang xem số cũ hay số mới.
          note={
            updatedAtLabel
              ? `${
                  isDashboardStale ? "Số cũ · s" : "S"
                }ố liệu lúc ${updatedAtLabel}`
              : undefined
          }
        />
        {hasDashboardLoadFailure ? (
          <View
            style={[
              styles.overviewErrorCard,
              {
                backgroundColor: colors.surface,
                borderColor: hairlineBorderColor,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <Ionicons
              name="cloud-offline-outline"
              size={18}
              color={colors.textMuted}
            />
            <Text
              style={[
                styles.overviewErrorText,
                { color: colors.textSecondary },
              ]}
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
          <HomeStatTiles tiles={statTiles} isLoading={isFirstDashboardLoad} />
        )}
      </>
    ),
    shortcuts: (
      <>
        <HomeSectionTitle
          label="TRUY CẬP NHANH"
          note={
            shortcutItems.length > 0
              ? `Đã ghim ${shortcutItems.length} mục`
              : undefined
          }
          // Không có chức năng nào khả dụng thì bảng tuỳ chỉnh cũng rỗng — ẩn nút
          // đi thay vì mở ra một danh sách trắng.
          action={hasNoViewFeatures ? undefined : "Tuỳ chỉnh"}
          actionIconName="options-outline"
          onAction={openCustomizeSheet}
        />
        {hasNoViewFeatures ? (
          <View
            style={[
              styles.noPermissionCard,
              {
                backgroundColor: colors.surface,
                borderColor: hairlineBorderColor,
                shadowColor: colors.shadow,
              },
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
              {
                backgroundColor: colors.surface,
                borderColor: hairlineBorderColor,
                shadowColor: colors.shadow,
              },
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
                      style={[
                        styles.shortcutCard,
                        { width: shortcutCardWidth },
                      ]}
                    >
                      <HomeMenuItemCard
                        {...item}
                        index={
                          pageIndex * HOME_SHORTCUT_PAGE_SIZE + indexInPage
                        }
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
                <Text
                  style={styles.shortcutViewAllText}
                >
                  Xem tất cả
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={13}
                  color={HOME_BRAND_RED}
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </>
    ),
    // Khu cuộn ngang cố tình KHÔNG có tiêu đề chung: mỗi trang tự mang tiêu đề
    // của nó, vuốt sang trang khác mà tiêu đề không đổi thì người xem đọc nhầm số.
    assetStructure: (
      <HomeAssetStructurePager
        pageWidth={homeContentWidth}
        itStructure={itStructure}
        machine={machine}
        isDashboardLoading={isFirstDashboardLoad}
        isMachineLoading={isFirstMachineLoad}
        hasMachineError={hasMachineError}
        onRetryMachine={refreshMachineDashboard}
        resetToken={dashboard?.updatedAt ?? ""}
      />
    ),
    attendance: (
      <>
        <HomeSectionTitle label="ĐIỂM DANH NHÂN SỰ HÔM NAY" />
        <HomeAttendanceCard
          total={attendance?.total ?? null}
          checkedIn={attendance?.checkedIn ?? null}
          notCheckedIn={attendance?.notCheckedIn ?? null}
          departments={attendance?.departments ?? []}
          isLoading={isFirstDashboardLoad}
        />
      </>
    ),
    utilities: (
      <>
        {/* Kỳ tiêu thụ là THÁNG TRƯỚC và do SQL tự quyết — tiêu đề phải ghi
          rõ tháng nhận được, không tự trừ thêm một tháng. */}
        <HomeSectionTitle
          label={
            utilityPeriodLabel
              ? `TIÊU THỤ ${utilityPeriodLabel.toUpperCase()}`
              : "TIÊU THỤ ĐIỆN · NƯỚC · HƠI"
          }
        />
        <HomeUtilityCard
          rows={utilityRows}
          periodLabel={utilityPeriodLabel || undefined}
          isLoading={isFirstDashboardLoad}
        />
      </>
    ),
  };
  const reorderItems: HomeReorderItem[] = visibleBlockKeys.map((key) => ({
    key,
    ...HOME_BLOCK_META[key],
  }));

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshHomeData}
            colors={[HOME_BRAND_RED]}
            tintColor={HOME_BRAND_RED}
          />
        }
      >
        {visibleBlockKeys.map((key) => (
          <React.Fragment key={key}>{blockNodes[key]}</React.Fragment>
        ))}
      </ScrollView>

      <HomeBlockOrderSheet
        visible={isBlockOrderSheetVisible}
        items={reorderItems}
        onMove={handleMoveBlock}
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
