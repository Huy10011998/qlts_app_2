import { AppColors, C } from "../../utils/helpers/colors";
import { StyleSheet, type ViewStyle } from "react-native";

import {
  COMPARE_CURRENT_YEAR_COLOR,
  COMPARE_PREVIOUS_YEAR_COLOR,
  SOLAR_SERIES_COLORS,
} from "./SolarPlantScreen.helpers";
import {
  FLOW_HERO_CARD_BORDER,
  FLOW_HERO_CARD_MARGIN,
  FLOW_HERO_CARD_RADIUS,
} from "./SolarPlantScreen.flowHero";

/**
 * Khung hàng nút chọn (Gộp / Tách biểu đồ, Theo tháng / quý / năm) — cùng kiểu
 * hàng tab kỳ ở đầu màn: rãnh xám nhạt, ô đang chọn là viên đỏ chữ trắng. Khung
 * nằm trong khối nền trắng nên dùng rãnh xám chứ không dùng thẻ trắng có bóng
 * như thanh chế độ của màn Lịch (nền trang ở đó là xám).
 */
const segmentShell = (c: AppColors): ViewStyle => ({
  flexDirection: "row",
  backgroundColor: c.surfaceAlt,
  borderRadius: 12,
  padding: 3,
});

export const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    scroll: { flex: 1 },
    headerButton: {
      paddingHorizontal: 5,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    offlineBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: c.redSurface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.redBorder,
    },
    offlineText: {
      flex: 1,
      color: C.redDeep,
      fontSize: 12,
    },
    menuScrollContent: {
      paddingBottom: 12,
    },

    // Hero section
    // Hero là một card bo góc có viền, cách mép màn — cùng số với khung chờ
    // (`FLOW_HERO_CARD_*` trong SolarPlantScreen.flowHero).
    heroSection: {
      backgroundColor: c.bg,
      padding: FLOW_HERO_CARD_MARGIN,
    },
    heroCard: {
      backgroundColor: c.solarHero,
      borderColor: c.border,
      borderRadius: FLOW_HERO_CARD_RADIUS,
      borderWidth: FLOW_HERO_CARD_BORDER,
      overflow: "hidden",
    },
    heroContent: {
      width: "100%",
      alignSelf: "center",
    },
    heroTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      flexWrap: "wrap",
      gap: 10,
      paddingHorizontal: 18,
      paddingTop: 12,
    },
    productionBlock: {
      flex: 1,
      // Đủ cho "1,92 MWh" ở cỡ 36 (số còn tự co tới 80%). Để 190 thì màn hẹp
      // (bật Thu phóng) đẩy ô nhiệt độ xuống một dòng riêng, hero dài thêm.
      minWidth: 150,
    },
    prodLabel: { fontSize: 14, fontWeight: "600", color: c.textSecondary },
    prodValue: {
      fontSize: 36,
      fontWeight: "700",
      color: c.text,
    },
    prodUnit: { fontSize: 19, fontWeight: "400" },
    weatherRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 4,
      flexShrink: 0,
    },
    tempText: { fontSize: 20, fontWeight: "600", color: c.text },

    // Hero visual
    heroVisual: {
      position: "relative",
    },
    // Ảnh nhà máy thật nằm dưới, lớp SVG (mũi tên, tấm pin, tủ điện) vẽ đè lên.
    // Vị trí và kích thước do `SceneView` tính, vì chúng bám theo toạ độ của
    // hình nhà xưởng mà ảnh thay thế.
    scenePhotoWrap: {
      position: "relative",
    },
    scenePhoto: {
      position: "absolute",
    },
    scenePhotoScrim: {
      position: "absolute",
      backgroundColor: "rgba(255,255,255,0.16)",
    },
    sceneWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: -4,
      alignItems: "center",
    },
    toHomeBubblePosition: {
      position: "absolute",
      zIndex: 2,
    },
    solarPowerBubblePosition: {
      position: "absolute",
      top: 0,
      left: "50%",
      zIndex: 3,
    },
    fromGridBubblePosition: {
      position: "absolute",
      zIndex: 2,
    },
    bubble: {
      backgroundColor: c.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    bubbleValueRow: {
      width: "100%",
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "center",
      paddingHorizontal: 6,
    },
    bubbleValue: { fontWeight: "600", color: c.textSecondary },
    bubbleUnit: {
      fontSize: 11,
      color: c.textMuted,
      marginBottom: 3,
      marginLeft: 2,
    },
    bubbleLabel: {
      fontSize: 10,
      color: c.textMuted,
      textAlign: "center",
      marginTop: 2,
    },

    // Energy Produced
    contentFrame: {
      width: "100%",
      alignSelf: "center",
    },
    energyProducedCard: {
      backgroundColor: c.surface,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: c.border,
    },
    epRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 10,
    },
    sectionTitle: { fontSize: 16, fontWeight: "600", color: c.text },
    updatedNow: { fontSize: 12, color: c.textMuted },
    epStats: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
    epItem: { flex: 1, minWidth: 0, alignItems: "center", paddingHorizontal: 4 },
    epLabel: { fontSize: 12, color: c.textMuted, marginBottom: 2 },
    epValue: { fontSize: 18, fontWeight: "500", color: c.text },
    epUnit: { fontSize: 10, fontWeight: "400", color: c.textMuted },
    epDivider: { width: 1, height: 32, backgroundColor: c.border },

    // Tabs
    stickyPeriodHeader: {
      backgroundColor: c.surface,
      zIndex: 10,
      elevation: 4,
      alignItems: "center",
    },
    // Năm tab dài ngắn khác nhau ("Hôm nay" 7 ký tự, "Kỳ hoá đơn" 10) nên KHÔNG
    // chia đều bề ngang: chia đều thì tab dài nhất quyết định cỡ chữ của cả
    // hàng. Mỗi tab rộng theo nội dung, khoảng trống thừa rải đều giữa chúng.
    tabBar: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: c.surfaceAlt,
      paddingHorizontal: 6,
      paddingVertical: 8,
      alignItems: "center",
      gap: 2,
    },
    tabItem: { flexShrink: 1, minWidth: 0, alignItems: "center" },
    tabChip: {
      backgroundColor: "transparent",
      borderRadius: 18,
      paddingHorizontal: 9,
      paddingVertical: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    tabChipActive: { backgroundColor: C.red },
    tabText: { color: c.textSecondary, fontSize: 13, textAlign: "center" },
    tabTextActive: { color: "white", fontWeight: "600" },

    dateNav: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.surface,
      minHeight: 60,
      paddingHorizontal: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    dateNavSide: {
      width: 72,
      minHeight: 48,
      alignItems: "flex-start",
      justifyContent: "center",
    },
    dateNavRight: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 14,
    },
    dateNavIconButton: {
      minWidth: 24,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    dateNavIconButtonDisabled: {
      opacity: 0.45,
    },
    dateNavCenter: {
      flex: 1,
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    // Chữ thường: tab kỳ ngay trên đã tô đỏ, hàng này đỏ đậm nữa thì hai chữ
    // "Hôm nay" chồng nhau giành mắt. Icon lịch giữ màu đỏ để còn biết bấm được.
    dateNavCenterText: {
      flexShrink: 1,
      fontSize: 15,
      color: c.text,
      fontWeight: "400",
      textAlign: "center",
    },

    // White sections
    whiteSection: {
      backgroundColor: c.surface,
      marginTop: 8,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },

    // Energy Balance
    // Hàng đầu khối: vòng Tự chủ năng lượng + lời giải thích bên phải.
    autonomyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginTop: 12,
      marginBottom: 4,
    },
    autonomyCenter: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    autonomyPercent: {
      fontSize: 22,
      fontWeight: "700",
      color: c.text,
    },
    autonomyTextCol: { flex: 1, gap: 4 },
    autonomyTitle: { fontSize: 15, fontWeight: "600", color: c.text },
    autonomyCaption: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
    autonomyCaptionBold: {
      fontWeight: "700",
      color: SOLAR_SERIES_COLORS.solar,
    },
    // Hai cụm Sản xuất / Tiêu thụ: tên bên trái, tổng bên phải, rồi thanh tỉ
    // trọng và hai dòng chia nhỏ.
    balanceGroup: { marginTop: 16 },
    balanceGroupHeader: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 12,
    },
    balanceGroupTitle: { fontSize: 14, color: c.textSecondary },
    balanceGroupTotal: { fontSize: 20, fontWeight: "700", color: c.text },
    balanceUnit: { fontSize: 12, fontWeight: "400", color: c.textMuted },
    barTrack: {
      flexDirection: "row",
      height: 10,
      borderRadius: 5,
      overflow: "hidden",
      marginVertical: 10,
      backgroundColor: c.border,
    },
    barFill: { height: 10 },
    balanceRows: { gap: 8 },
    balanceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    balanceIconChip: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
    },
    balanceRowLabel: { flex: 1, fontSize: 13, color: c.textSecondary },
    balanceRowValue: { fontSize: 13, fontWeight: "600", color: c.text },
    // Cột phần trăm rộng cố định để hai dòng thẳng hàng như một bảng.
    balanceRowPercent: {
      minWidth: 40,
      fontSize: 12,
      color: c.textMuted,
      textAlign: "right",
    },
    dot: { width: 10, height: 10, borderRadius: 5 },
    // Bám theo BarChart: năm trước xám, năm nay màu điện mặt trời.
    year2025Dot: { backgroundColor: COMPARE_PREVIOUS_YEAR_COLOR },
    year2026Dot: { backgroundColor: COMPARE_CURRENT_YEAR_COLOR },
    separator: { height: 1, backgroundColor: c.border, marginVertical: 14 },
    // Màu chú giải của biểu đồ phải khớp nét vẽ trong AreaChart/BarChart — cả
    // hai lấy từ `SOLAR_SERIES_COLORS` (mặt trời xanh lá, nhà máy xanh dương,
    // lưới cam).
    productionDot: { backgroundColor: SOLAR_SERIES_COLORS.solar },
    productionRing: { borderColor: SOLAR_SERIES_COLORS.solar },
    loadDot: { backgroundColor: SOLAR_SERIES_COLORS.load },
    loadRing: { borderColor: SOLAR_SERIES_COLORS.load },
    consumptionDot: { backgroundColor: SOLAR_SERIES_COLORS.grid },
    consumptionRing: { borderColor: SOLAR_SERIES_COLORS.grid },
    toGridDot: { backgroundColor: SOLAR_SERIES_COLORS.grid },
    toGridRing: { borderColor: SOLAR_SERIES_COLORS.grid },
    fromSolarDot: { backgroundColor: SOLAR_SERIES_COLORS.solar },
    fromSolarRing: { borderColor: SOLAR_SERIES_COLORS.solar },
    selfDot: { backgroundColor: SOLAR_SERIES_COLORS.solarDark },
    // Vòng nét đứt = đường nét đứt "Tự dùng" trên biểu đồ gộp.
    selfRing: {
      borderColor: SOLAR_SERIES_COLORS.solarDark,
      borderStyle: "dashed",
    },

    // Chart
    chartHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      marginBottom: 8,
    },
    chartTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: c.text,
    },
    // Tổng của cả kỳ, đứng cạnh nút phóng to. `flexShrink` để tiêu đề bên trái
    // không bị đẩy mất chữ khi số dài (ví dụ "1.234,56 MWh").
    chartHeaderTotal: {
      flexShrink: 0,
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
    },
    expandButton: {
      width: 52,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
    },
    expandIcon: { fontSize: 36, color: c.textMuted },
    infoIcon: { fontSize: 18, color: c.textMuted },

    tooltipBubble: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#222",
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 6,
      alignSelf: "center",
      marginBottom: 4,
    },
    /** Canh viên nhãn theo mốc thay vì giữa khung; lề trái là giá trị động. */
    tooltipBubblePinned: { alignSelf: "flex-start" },
    tooltipText: { color: "white", fontSize: 13, fontWeight: "500" },
    splitChartBlock: {
      marginTop: 18,
    },

    chartLegendRow: {
      flexDirection: "row",
      gap: 20,
      marginTop: 10,
      flexWrap: "wrap",
    },
    chartLegendRowCompact: {
      gap: 10,
      flexWrap: "nowrap",
    },
    chartLegendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    chartLegendItemCompact: { gap: 4, flexShrink: 1 },
    chartLegendText: { fontSize: 13, color: c.textSecondary },
    chartLegendTextMuted: { fontSize: 13, color: c.textMuted },
    chartLegendTextCompact: { fontSize: 11, flexShrink: 1 },
    chartLegendTextSmall: { fontSize: 12, color: c.textMuted },
    checkCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    checkCircleCompact: {
      width: 18,
      height: 18,
      borderRadius: 9,
    },
    checkDot: { width: 10, height: 10, borderRadius: 5 },
    checkDotCompact: { width: 8, height: 8, borderRadius: 4 },

    // Toggle Merged/Split — cao ~39 như bản viền xanh cũ (đệm 3 + 8 + chữ 14pt).
    toggleRow: {
      ...segmentShell(c),
      marginBottom: 16,
    },
    toggleBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      borderRadius: 9,
    },
    toggleBtnActive: { backgroundColor: c.red },
    toggleText: { fontSize: 14, fontWeight: "600", color: c.textSub },
    toggleTextActive: { color: c.onBrand },

    // Sub-tabs (Theo tháng / quý / năm) — cao ~34 (đệm 3 + 6 + chữ 13pt).
    subTabRow: {
      ...segmentShell(c),
      marginBottom: 8,
    },
    subTab: {
      flex: 1,
      paddingVertical: 6,
      alignItems: "center",
      borderRadius: 9,
    },
    subTabActive: { backgroundColor: c.red },
    subTabText: { fontSize: 13, fontWeight: "600", color: c.textSub },
    subTabTextActive: { color: c.onBrand },

    // Environmental
    envRow: { flexDirection: "row", marginTop: 12 },
    envItem: { flex: 1, alignItems: "center", gap: 4 },
    envValueRow: { flexDirection: "row", alignItems: "baseline", gap: 5 },
    envValue: { fontSize: 28, fontWeight: "500", color: c.text },
    envUnit: { fontSize: 12, color: c.textMuted },
    envLabel: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: "center",
    },

    // Expanded chart
    expandedSafe: {
      flex: 1,
      backgroundColor: c.surface,
    },
    // Cùng kiểu hàng Theo tháng / quý / năm trong màn, chỉ cao và chữ to hơn.
    // Thụt vào đúng lề 18 của phần biểu đồ bên dưới thay vì sát mép màn.
    expandedCompareTabs: {
      ...segmentShell(c),
      marginHorizontal: 18,
      marginTop: 10,
      minHeight: 46,
      alignItems: "center",
    },
    expandedCompareTab: {
      flex: 1,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 9,
    },
    expandedCompareTabActive: {
      backgroundColor: c.red,
    },
    expandedCompareTabText: {
      color: c.textSub,
      fontSize: 16,
      fontWeight: "600",
    },
    expandedCompareTabTextActive: {
      color: c.onBrand,
    },
    expandedCompareChartWrap: {
      marginTop: 16,
    },
    expandedContent: {
      flex: 1,
      width: "100%",
      alignSelf: "center",
    },
    expandedContentContainer: {
      flexGrow: 1,
      paddingHorizontal: 18,
      paddingTop: 14,
      paddingBottom: 14,
    },

    // ─── Trạng thái tải / lỗi của từng khối ─────────────────────────────────
    // Mỗi khối tự lo trạng thái của mình: skeleton cho lần đầu, vạch mảnh khi
    // làm mới (số cũ giữ nguyên), hộp đỏ nhạt khi lỗi.
    blockShell: {
      position: "relative",
    },
    refreshBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 2,
      overflow: "hidden",
      backgroundColor: c.border,
    },
    refreshBarFill: {
      width: "40%",
      height: 2,
    },
    refreshBarGradient: {
      flex: 1,
    },
    blockErrorBox: {
      backgroundColor: c.redSurface,
      borderColor: c.redBorder,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: 10,
    },
    blockErrorText: {
      color: C.redDeep,
      fontSize: 13,
    },
    // Khung chờ của biểu đồ. Chiều cao do phía gọi truyền vào cho khớp đúng chỗ
    // biểu đồ sẽ chiếm, nên lúc dữ liệu về trang không bị đẩy xuống.
    chartSkeleton: {
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    // Cột giả của khung chờ biểu đồ; vị trí / chiều cao tính theo khung lúc vẽ.
    chartLoadingBar: {
      position: "absolute",
      borderTopLeftRadius: 5,
      borderTopRightRadius: 5,
    },
    chartSkeletonText: {
      position: "absolute",
      color: c.textMuted,
      fontSize: 13,
    },
    // Chỗ đặt vạch làm mới trong modal biểu đồ toàn màn: cao đúng 2px nên bật/tắt
    // không làm nội dung bên dưới nhích lên xuống.
    expandedRefreshHost: {
      position: "relative",
      height: 2,
    },
    // ─── Trạng thái toàn màn (bước lấy danh sách site) ──────────────────────
    // Dùng chính nền của khối hero để vào màn đã ra ngay "màn điện mặt trời",
    // thay vì một spinner trơ trên nền xám chung của app.
    fullScreenState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      backgroundColor: c.solarHero,
    },
    fullScreenBadge: {
      width: 104,
      height: 104,
      borderRadius: 52,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.loadingOverlay,
      marginBottom: 22,
    },
    fullScreenStateText: {
      color: c.text,
      fontSize: 15,
      fontWeight: "500",
      textAlign: "center",
    },
    fullScreenRetryButton: {
      backgroundColor: "#2a78d6",
      borderRadius: 22,
      paddingHorizontal: 26,
      paddingVertical: 11,
      marginTop: 20,
    },
    fullScreenRetryText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "600",
    },

    // ─── Khối 1: dòng năng lượng ────────────────────────────────────────────
    flowStatusText: {
      fontSize: 12,
      color: c.textSecondary,
      textAlign: "center",
      marginTop: 2,
    },
  });
