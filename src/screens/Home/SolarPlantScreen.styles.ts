import { AppColors, C } from "../../utils/helpers/colors";
import { StyleSheet } from "react-native";

import {
  COMPARE_CURRENT_YEAR_COLOR,
  COMPARE_PREVIOUS_YEAR_COLOR,
} from "./SolarPlantScreen.helpers";

export const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    scroll: { flex: 1 },
    headerButton: {
      paddingHorizontal: 5,
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
      lineHeight: 17,
    },
    menuScrollContent: {
      paddingBottom: 12,
    },

    // Hero section
    heroSection: { backgroundColor: c.solarHero, overflow: "hidden" },
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
      minWidth: 190,
    },
    prodLabel: { fontSize: 14, fontWeight: "600", color: c.textSecondary },
    prodValue: {
      fontSize: 36,
      fontWeight: "700",
      color: c.text,
      lineHeight: 43,
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
      lineHeight: 14,
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
    sectionTitle: { fontSize: 16, fontWeight: "700", color: c.text },
    updatedNow: { fontSize: 12, color: c.textMuted },
    epStats: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
    epItem: { flex: 1, minWidth: 96, alignItems: "center" },
    epLabel: { fontSize: 12, color: c.textMuted, marginBottom: 2 },
    epValue: { fontSize: 20, fontWeight: "700", color: c.text },
    epUnit: { fontSize: 12, fontWeight: "400", color: c.textSecondary },
    epDivider: { width: 1, height: 36, backgroundColor: c.border },

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
      borderRadius: 18,
      paddingHorizontal: 9,
      paddingVertical: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    tabChipActive: { backgroundColor: "#4285f4" },
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
    dateNavCenterText: {
      flexShrink: 1,
      fontSize: 15,
      lineHeight: 20,
      color: "#6EA0F6",
      fontWeight: "300",
      textAlign: "center",
    },
    calendarOverlay: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.5)",
      paddingHorizontal: 24,
    },
    calendarDialog: {
      width: "100%",
      maxWidth: 420,
      minHeight: 456,
      borderRadius: 18,
      backgroundColor: c.surface,
      overflow: "hidden",
    },
    calendarTitle: {
      color: c.text,
      fontSize: 18,
      fontWeight: "600",
      paddingHorizontal: 28,
      paddingTop: 24,
    },
    calendarSelectedRow: {
      minHeight: 92,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 28,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    calendarSelectedText: {
      flex: 1,
      color: c.text,
      fontSize: 34,
      fontWeight: "400",
      marginRight: 16,
    },
    calendarMonthRow: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 28,
    },
    calendarMonthText: {
      color: c.textMuted,
      fontSize: 20,
      fontWeight: "400",
    },
    calendarMonthControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: 28,
    },
    calendarMonthButton: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    calendarMonthButtonDisabled: {
      opacity: 0.35,
    },
    calendarWeekRow: {
      flexDirection: "row",
      paddingHorizontal: 28,
      marginTop: 8,
    },
    calendarWeekText: {
      flex: 1,
      color: c.text,
      fontSize: 20,
      textAlign: "center",
    },
    calendarGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: 28,
      paddingTop: 18,
    },
    calendarDayCell: {
      width: `${100 / 7}%`,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
    },
    calendarDayInRange: {
      backgroundColor: c.accentLight,
    },
    calendarDayCircle: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
    },
    calendarDaySelected: {
      backgroundColor: "#5d8ff6",
    },
    calendarDayText: {
      color: c.textMuted,
      fontSize: 22,
      fontWeight: "400",
    },
    calendarDayMuted: {
      color: c.placeholder,
    },
    // Ngày tương lai: chưa có số liệu nên không cho chọn.
    calendarDayDisabled: {
      opacity: 0.35,
    },
    calendarDayDisabledText: {
      color: c.textMuted,
    },
    calendarDaySelectedText: {
      color: "#fff",
    },
    calendarOptionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      minHeight: 280,
      paddingHorizontal: 28,
      paddingTop: 24,
    },
    calendarOptionCell: {
      width: "25%",
      height: 76,
      alignItems: "center",
      justifyContent: "center",
    },
    calendarOptionCircle: {
      minWidth: 76,
      height: 76,
      borderRadius: 38,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 10,
    },
    calendarOptionSelected: {
      backgroundColor: "#5d8ff6",
    },
    calendarOptionDisabled: {
      opacity: 0.35,
    },
    calendarOptionText: {
      color: c.text,
      fontSize: 22,
      fontWeight: "400",
    },
    calendarOptionSelectedText: {
      color: "#fff",
    },
    calendarOptionDisabledText: {
      color: c.textMuted,
    },
    calendarActionRow: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      paddingHorizontal: 24,
      gap: 28,
    },
    calendarActionBtn: {
      minWidth: 64,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    calendarActionText: {
      color: "#6EA0F6",
      fontSize: 18,
    },

    // White sections
    whiteSection: {
      backgroundColor: c.surface,
      marginTop: 8,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },

    // Energy Balance
    balanceSubLabel: {
      fontSize: 14,
      color: c.textSecondary,
      marginTop: 12,
      marginBottom: 4,
    },
    balanceBigValue: {
      fontSize: 36,
      fontWeight: "700",
      color: c.text,
      lineHeight: 44,
    },
    balanceUnit: { fontSize: 18, fontWeight: "400", color: c.textSecondary },
    barTrack: {
      flexDirection: "row",
      height: 10,
      borderRadius: 5,
      overflow: "hidden",
      marginVertical: 10,
      backgroundColor: c.border,
    },
    barFill: { height: 10 },
    toHomeBarFill: { backgroundColor: "#4caf50" },
    toGridBarFill: { backgroundColor: "#42b0e8" },
    fromSolarBarFill: { backgroundColor: "#42b0e8" },
    fromGridBarFill: { backgroundColor: "#f5a623" },
    donutRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginVertical: 8,
    },
    legendCol: { flex: 1, gap: 10 },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    dot: { width: 10, height: 10, borderRadius: 5 },
    balanceToHomeDot: { backgroundColor: "#4caf50" },
    balanceToGridDot: { backgroundColor: "#42b0e8" },
    balanceFromSolarDot: { backgroundColor: "#42b0e8" },
    balanceFromGridDot: { backgroundColor: "#f5a623" },
    // Bám theo BarChart: năm trước xanh da trời, năm nay tím.
    year2025Dot: { backgroundColor: COMPARE_PREVIOUS_YEAR_COLOR },
    year2026Dot: { backgroundColor: COMPARE_CURRENT_YEAR_COLOR },
    legendLabel: {
      fontSize: 13,
      color: c.textSecondary,
      flex: 1,
      minWidth: 86,
    },
    legendValue: {
      fontSize: 13,
      color: c.text,
      fontWeight: "500",
      flexShrink: 1,
    },
    separator: { height: 1, backgroundColor: c.border, marginVertical: 14 },
    selfConsumptionRow: { marginTop: 12 },
    selfText: { fontSize: 13, color: c.textSecondary },
    selfBold: { fontWeight: "700", color: c.text },
    // Màu chú giải của biểu đồ phải khớp nét vẽ trong AreaChart/BarChart.
    // Bảng màu chung (đã qua kiểm tra mù màu): #2a78d6 sản xuất,
    // #eb6834 tiêu thụ & lưới điện, #1baf7a tự dùng.
    productionDot: { backgroundColor: "#2a78d6" },
    productionRing: { borderColor: "#2a78d6" },
    consumptionDot: { backgroundColor: "#eb6834" },
    consumptionRing: { borderColor: "#eb6834" },
    toGridDot: { backgroundColor: "#eb6834" },
    toGridRing: { borderColor: "#eb6834" },
    fromSolarDot: { backgroundColor: "#1baf7a" },
    fromSolarRing: { borderColor: "#1baf7a" },
    selfDot: { backgroundColor: "#1baf7a" },
    selfRing: { borderColor: "#1baf7a" },

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
      fontWeight: "700",
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
    chartLegendTextSmall: { fontSize: 12, color: c.textMuted, lineHeight: 17 },
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

    // Toggle Merged/Split
    toggleRow: {
      flexDirection: "row",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "#4285f4",
      overflow: "hidden",
      marginBottom: 16,
    },
    toggleBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: c.surface,
    },
    toggleBtnActive: { backgroundColor: c.accentLight },
    toggleText: { fontSize: 14, color: c.textSecondary },
    toggleTextActive: { color: "#4285f4", fontWeight: "600" },

    // Sub-tabs
    subTabRow: {
      flexDirection: "row",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "#4285f4",
      overflow: "hidden",
      marginBottom: 8,
    },
    subTab: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      backgroundColor: c.surface,
    },
    subTabActive: { backgroundColor: c.accentLight },
    subTabText: { fontSize: 13, color: c.textSecondary },
    subTabTextActive: { color: "#4285f4", fontWeight: "600" },

    // Environmental
    envRow: { flexDirection: "row", marginTop: 12 },
    envItem: { flex: 1, alignItems: "center", gap: 4 },
    envValue: { fontSize: 30, fontWeight: "700", color: c.text },
    envLabel: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: "center",
      lineHeight: 18,
    },

    // Expanded chart
    expandedSafe: {
      flex: 1,
      backgroundColor: c.surface,
    },
    expandedCompareTabs: {
      width: "100%",
      alignSelf: "center",
      minHeight: 46,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surfaceAlt,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderRadius: 8,
      padding: 2,
    },
    expandedCompareTab: {
      flex: 1,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 7,
    },
    expandedCompareTabActive: {
      backgroundColor: c.blueSurface,
      borderWidth: 1,
      borderColor: "#6ea0f6",
    },
    expandedCompareTabText: {
      color: c.text,
      fontSize: 16,
      lineHeight: 22,
    },
    expandedCompareTabTextActive: {
      color: "#6ea0f6",
      fontWeight: "600",
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
      lineHeight: 18,
    },
    // Khung chờ của biểu đồ. Chiều cao do phía gọi truyền vào cho khớp đúng chỗ
    // biểu đồ sẽ chiếm, nên lúc dữ liệu về trang không bị đẩy xuống.
    chartSkeleton: {
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    chartSkeletonText: {
      position: "absolute",
      color: c.textMuted,
      fontSize: 13,
    },
    chartSkeletonSpinner: {
      position: "absolute",
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
    fullScreenSpinner: {
      marginBottom: 14,
      height: 24,
    },
    fullScreenStateText: {
      color: c.text,
      fontSize: 15,
      fontWeight: "500",
      lineHeight: 22,
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
    // Viên nền cho dòng tổng kết dưới ảnh nhà máy: chữ đặt thẳng lên ảnh thì
    // chìm, mà đẩy xuống hẳn nền khối thì lại dính sát mép ảnh.
    flowSummaryPill: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      justifyContent: "center",
      gap: 7,
      maxWidth: "100%",
      marginHorizontal: 18,
      // Khung cảnh nhà máy tràn xuống 4px dưới đáy vùng của nó (`sceneWrap` có
      // `bottom: -4`), nên phải cộng thêm 4 vào lề trên thì khoảng hở nhìn thấy
      // ở trên mới bằng ở dưới.
      marginTop: 12 + 4,
      marginBottom: 12,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: c.surface,
    },
    flowSummaryText: {
      flexShrink: 1,
      fontSize: 13,
      lineHeight: 18,
      color: c.textSecondary,
      // Xuống 2 dòng trên máy hẹp thì cả hai dòng vẫn cân giữa viên nền.
      textAlign: "center",
    },
    flowSummaryValue: { color: c.text, fontWeight: "700" },
  });
