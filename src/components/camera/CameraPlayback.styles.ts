import { StyleSheet } from "react-native";
import { AppColors } from "../../utils/helpers/colors";
import { elevation, radius, spacing } from "../../utils/helpers/tokens";
import { CAMERA_FULLSCREEN_EDGE_INSET } from "./shared/cameraStreamConfig";

export const PLAYER_ASPECT_RATIO = 16 / 9;
export const TIMELINE_ROW_HEIGHT = 168;
export const TIMELINE_RAIL_WIDTH = 6;
// Đủ chỗ cho badge HH:mm:ss (88px) và vẫn chừa khoảng cách với mép màn hình.
export const TIMELINE_LABEL_WIDTH = 92;
/** Cố định để vạch đọc canh đúng tâm badge thời gian. */
const SCRUB_BADGE_HEIGHT = 24;

/**
 * Vạch đọc: badge thời gian nằm cố định ở đây, nội dung cuộn qua nó.
 *
 * Đây là mốc DUY NHẤT dùng cho cả hai phía — nơi vẽ vạch đỏ và nơi quy đổi
 * offset ↔ giờ. Trước đây vạch được vẽ ở tâm badge còn phép quy đổi lại lấy mép
 * trên badge: con số hiển thị luôn ứng với điểm cao hơn vạch nửa badge, nên
 * nhãn h:00 rơi phía trên vạch trong khi badge đã báo qua h:00 (12px ≈ 5 phút ở
 * mức zoom mặc định), và seek theo timeline cũng lệch chừng đó.
 */
export const TIMELINE_READING_OFFSET = 56 + SCRUB_BADGE_HEIGHT / 2;
/**
 * Hàng đầu tiên phải bắt đầu đúng tại vạch đọc. Nếu margin nhỏ hơn offset,
 * phần chênh lệch sẽ bị hiểu nhầm là người dùng đã cuộn timeline xuống.
 */
export const TIMELINE_TOP_MARGIN = TIMELINE_READING_OFFSET;

const ZOOM_BTN_SIZE = 40;
/** 2 nút zoom trong cùng một viên capsule — dùng để canh giữa cột. */
const ZOOM_COLUMN_HEIGHT = ZOOM_BTN_SIZE * 2;

export const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },

    /* ── Player ─────────────────────────────────────────────────────── */
    player: { backgroundColor: "#000" },
    playerFrame: { width: "100%", backgroundColor: "#000", overflow: "hidden" },
    playerFrameFill: { flex: 1 },
    // Lớp mờ trên/dưới khung hình: nút và chữ trắng vẫn đọc được khi cảnh sáng.
    playerScrimTop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 84,
      zIndex: 2,
    },
    playerScrimBottom: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 96,
      zIndex: 2,
    },
    playerTopBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      zIndex: 3,
    },
    playerTopSpacer: { flex: 1 },
    // Toàn màn hình: chừa tai thỏ / home indicator đúng như fullscreen của
    // CameraListGrid (fsHeader/fsFooter).
    playerTopBarFullscreen: {
      paddingTop: CAMERA_FULLSCREEN_EDGE_INSET,
      paddingHorizontal: spacing.md,
    },
    // Chỉ mũi tên, không kèm tên camera: nhiều đầu ghi in sẵn ngày giờ (OSD) ở
    // góc trên-trái khung hình nên chữ của app sẽ đè lên chữ của camera.
    playerBackBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "rgba(0,0,0,0.45)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255,255,255,0.16)",
      alignItems: "center",
      justifyContent: "center",
    },
    // Không tô đen đục: lúc đổi mốc/tự phục hồi thì phía dưới vẫn còn frame cuối
    // của bản ghi đang xem, tô đen là mất luôn nó. Nền playerFrame đã là đen nên
    // lần vào đầu tiên (chưa có frame nào) vẫn tối như trước; lớp mờ này chỉ để
    // spinner đọc được trên cảnh sáng.
    playerLoading: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.35)",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },

    /* ── Player controls (khi đang phát) ────────────────────────────── */
    playerControls: {
      position: "absolute",
      left: 0,
      right: 0,
      // Cao hơn vùng responder của thanh tiến trình (26) để không tranh chạm.
      bottom: 28,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      zIndex: 4,
    },
    // Toàn màn hình: bottom do component tính theo safe area (xem CameraPlayback)
    // vì phải nằm trên thanh tua, mà thanh tua lại phải nằm trên home indicator.
    playerControlsFullscreen: { paddingHorizontal: spacing.lg },
    // Các nút gom vào một "viên thuốc" kính mờ thay vì nhiều tròn đen rời rạc.
    playerControlGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      padding: 3,
      borderRadius: radius.pill,
      backgroundColor: "rgba(0,0,0,0.45)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255,255,255,0.14)",
    },
    playerControlBtn: {
      minWidth: 34,
      height: 34,
      borderRadius: 17,
      paddingHorizontal: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    playerControlSpacer: { flex: 1 },
    playerSpeedBtn: { flexDirection: "row", alignItems: "center", gap: 3 },
    playerSpeedText: { color: "#fff", fontSize: 13, fontWeight: "800" },
    playerClock: {
      marginLeft: spacing.sm,
      color: "rgba(255,255,255,0.92)",
      fontSize: 12,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    progressScrubber: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 26,
      justifyContent: "flex-end",
      // Chừa chỗ cho núm to lúc kéo — playerFrame overflow hidden sẽ cắt mất nếu
      // track dính sát mép dưới.
      paddingBottom: 3,
      zIndex: 5,
    },
    /**
     * Toàn màn hình phải nhấc thanh tua khỏi mép dưới: dải ~20pt sát đáy là vùng
     * cử chỉ home indicator của iOS, hệ thống ưu tiên nhận trước nên kéo tua ở đó
     * là bị vuốt đổi app. Thụt hai bên cho thẳng hàng với nút phía trên và tránh
     * góc màn hình; cao hơn một chút vì ngón tay ở landscape khó nhắm hơn.
     * `bottom` do component gán theo safe area thật.
     */
    progressScrubberFullscreen: {
      left: spacing.lg,
      right: spacing.lg,
      height: 34,
      paddingBottom: 6,
    },
    // Chiều cao đủ để chứa cả núm tròn, nên không cần offset âm (playerFrame
    // overflow hidden sẽ cắt mất).
    progressTrackWrap: {
      height: 14,
      justifyContent: "center",
    },
    progressTrack: {
      position: "relative",
      width: "100%",
      height: 3,
      borderRadius: 2,
      backgroundColor: "rgba(255,255,255,0.26)",
    },
    progressFill: {
      height: 3,
      borderRadius: 2,
      backgroundColor: c.red,
    },
    progressHandle: {
      position: "absolute",
      top: -5,
      // Vị trí do translateX điều khiển (mượt hơn left theo %), nên phải neo
      // left: 0 để gốc dịch chuyển luôn là mép trái thanh tua.
      left: 0,
      marginLeft: -6.5,
      width: 13,
      height: 13,
      borderRadius: 7,
      backgroundColor: c.red,
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.9)",
      zIndex: 5,
    },
    progressHandleActive: {
      top: -7,
      marginLeft: -8.5,
      width: 17,
      height: 17,
      borderRadius: 9,
    },

    scrollContent: { paddingBottom: spacing.lg },

    /* ── Tên camera + số bản ghi trong ngày ─────────────────────────── */
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      marginTop: spacing.md,
    },
    headerTitle: {
      flex: 1,
      color: c.text,
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 0.1,
    },
    headerMeta: {
      color: c.textSub,
      fontSize: 12,
      fontWeight: "600",
      overflow: "hidden",
      backgroundColor: c.surfaceAlt,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },

    /* ── Thanh chọn ngày ────────────────────────────────────────────── */
    dateRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    datePill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: radius.pill,
      paddingHorizontal: 2,
      paddingVertical: 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      ...elevation(c.shadow, 2),
    },
    datePillBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
    },
    datePillBtnDisabled: { opacity: 0.35 },
    datePillCenter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 38,
      paddingHorizontal: 14,
      borderRadius: radius.pill,
      backgroundColor: c.surfaceAlt,
    },
    datePillText: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
      letterSpacing: 0.1,
    },
    dateViewBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderStrong,
      ...elevation(c.shadow, 2),
    },
    dateViewBtnActive: {
      backgroundColor: c.redIconSurface,
      borderColor: c.redBorder,
    },
    playbackStatus: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: c.redSurface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.redBorder,
    },
    playbackStatusText: {
      flex: 1,
      color: c.red,
      fontSize: 13,
      fontWeight: "500",
    },

    /* ── Lịch chọn ngày (dùng chung BottomSheetModalShell của app) ─── */
    calendarSheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingBottom: spacing.xl,
      overflow: "hidden",
    },
    calendarHeader: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
    },
    calendarHeaderBtn: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    calendarMonthNav: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    calendarMonthBtn: {
      width: 36,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    calendarMonthText: {
      minWidth: 92,
      color: c.text,
      fontSize: 20,
      fontWeight: "600",
      textAlign: "center",
    },
    calendarConfirmBtn: {
      minWidth: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    calendarConfirmText: {
      color: c.red,
      fontSize: 17,
      fontWeight: "600",
    },
    calendarWeekRow: {
      flexDirection: "row",
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    calendarWeekText: {
      flex: 1,
      color: c.textSecondary,
      fontSize: 13,
      fontWeight: "600",
      textAlign: "center",
    },
    calendarGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: spacing.md,
    },
    calendarDayCell: {
      width: `${100 / 7}%`,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
    },
    calendarDayCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
    },
    calendarDaySelected: { backgroundColor: c.red },
    calendarDayText: { color: c.text, fontSize: 15, fontWeight: "500" },
    calendarDayTextMuted: { color: c.placeholder },
    calendarDayTextSelected: { color: c.onBrand, fontWeight: "700" },
    calendarRecordingDot: {
      position: "absolute",
      bottom: 2,
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: c.red,
    },
    calendarStartTimeRow: {
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    calendarStartTimeLabel: {
      color: c.text,
      fontSize: 16,
      fontWeight: "500",
    },
    calendarStartTimeValueWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    calendarStartTimeValue: {
      color: c.textSecondary,
      fontSize: 16,
      fontWeight: "500",
    },

    /* ── Bộ chọn thời gian bắt đầu ─────────────────────────────────── */
    timeSheet: {
      minHeight: 390,
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      overflow: "hidden",
    },
    timeSheetHeader: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
    },
    timeSheetHeaderBtn: {
      width: 48,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    timeSheetTitle: {
      color: c.text,
      fontSize: 18,
      fontWeight: "700",
    },
    timeSheetConfirmText: {
      color: c.red,
      fontSize: 17,
      fontWeight: "600",
    },
    timePickerRow: {
      height: 280,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xxl,
    },
    timePickerColumn: { flex: 1, height: 220 },
    timePickerItem: { color: c.text, fontSize: 22, height: 220 },
    timePickerColon: {
      color: c.text,
      fontSize: 24,
      fontWeight: "600",
      marginHorizontal: spacing.xs,
    },

    /* ── Timeline ───────────────────────────────────────────────────── */
    timeline: {
      marginTop: TIMELINE_TOP_MARGIN,
      paddingHorizontal: 12,
      position: "relative",
    },
    timelineRow: { flexDirection: "row", height: TIMELINE_ROW_HEIGHT },
    // Canh xuống mép dưới hàng: đó mới là mốc h:00 (trong một hàng thời gian
    // giảm dần từ trên xuống). Xem thêm chú thích ở TimelineRow.
    timelineLabelCol: {
      width: TIMELINE_LABEL_WIDTH,
      alignItems: "flex-end",
      justifyContent: "flex-end",
      paddingRight: 10,
    },
    timelineLabel: {
      fontSize: 13.5,
      lineHeight: 18,
      fontWeight: "700",
      color: c.textSub,
      letterSpacing: 0.2,
      fontVariant: ["tabular-nums"],
    },
    timelineLabelActive: { color: c.text },

    /* ── Badge thời gian ở vạch đọc (cố định, nội dung cuộn qua) ─────── */
    scrubBadgeWrap: {
      position: "absolute",
      left: spacing.md,
      width: TIMELINE_LABEL_WIDTH,
      // Tâm badge phải trùng vạch đọc, nên mép trên lùi lên nửa badge.
      top: TIMELINE_READING_OFFSET - SCRUB_BADGE_HEIGHT / 2,
      alignItems: "flex-end",
      zIndex: 20,
      elevation: 10,
    },
    // Vạch mảnh kéo từ badge sang hết bề ngang: mắt thấy rõ nội dung nào đang
    // nằm đúng mốc thời gian đang đọc.
    scrubLine: {
      position: "absolute",
      left: spacing.md + TIMELINE_LABEL_WIDTH,
      right: spacing.md,
      top: TIMELINE_READING_OFFSET,
      height: 1,
      backgroundColor: c.red,
      opacity: 0.28,
      zIndex: 19,
    },
    scrubBadge: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: SCRUB_BADGE_HEIGHT,
      minWidth: 84,
      backgroundColor: c.red,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      overflow: "visible",
      shadowColor: c.red,
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      zIndex: 20,
      elevation: 10,
    },
    scrubBadgeText: {
      flexShrink: 0,
      fontSize: 12.5,
      fontWeight: "800",
      letterSpacing: 0.3,
      color: c.onBrand,
      fontVariant: ["tabular-nums"],
    },
    // Mũi nhọn nhỏ chỉ về phía rail — hình vuông xoay 45°.
    scrubBadgeArrow: {
      position: "absolute",
      right: -3,
      width: 8,
      height: 8,
      backgroundColor: c.red,
      transform: [{ rotate: "45deg" }],
      zIndex: 21,
      elevation: 11,
    },
    // Tick ranh giới giờ, nằm ngay trên nhãn.
    timelineLabelDash: {
      width: 10,
      height: 2,
      borderRadius: 1,
      backgroundColor: c.borderStrong,
      marginBottom: 6,
    },
    timelineRailCol: {
      width: TIMELINE_RAIL_WIDTH,
      borderRadius: TIMELINE_RAIL_WIDTH / 2,
      // Rail nền phải luôn nhìn thấy; surfaceAlt gần trùng c.bg nên các khoảng
      // không có recording trước đây trông như timeline bị đứt/mất.
      backgroundColor: c.border,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderStrong,
      overflow: "hidden",
    },
    // Đoạn có bản ghi, vẽ đúng tỷ lệ vị trí trong hàng: nhìn dọc rail là thấy
    // ngay chỗ nào ghi liên tục, chỗ nào mất. Trước đây là các chấm rắc đều, số
    // chấm chỉ tỷ lệ thô với mức phủ nên không đọc được gì.
    timelineCoverage: {
      position: "absolute",
      left: -1,
      right: -1,
      borderRadius: 3,
      backgroundColor: c.redLight,
      opacity: 0.8,
    },
    // Nhóm đang chọn dùng đỏ đậm hơn để vẫn nổi so với các nhóm còn lại.
    timelineCoverageActive: { backgroundColor: c.red, opacity: 1 },
    // Mốc đang phát trong hàng.
    timelinePlayhead: {
      position: "absolute",
      left: -4,
      right: -4,
      height: 3,
      marginTop: -1.5,
      borderRadius: 2,
      backgroundColor: c.text,
      zIndex: 2,
    },
    timelineClipCol: {
      flex: 1,
      paddingLeft: 14,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
    },
    /* ── Thẻ bản ghi trên timeline ──────────────────────────────────────
       Không dùng ảnh snapshot: go2rtc chỉ chụp được frame HIỆN TẠI nên mọi thẻ
       đều giống nhau và nói sai về mốc thời gian, lại tốn một request mỗi thẻ.
       Chỗ đó giờ là dải phủ đọc từ chính clip của nhóm. */
    // Cao cố định, canh giữa theo chiều dọc: hàng cao theo mức zoom
    // (TIMELINE_ROW_HEIGHT × scale) nên thẻ không được co giãn theo.
    clipCard: {
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      height: 58,
      paddingHorizontal: 10,
      borderRadius: radius.md,
      backgroundColor: c.surfaceAlt,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    clipCardActive: {
      borderWidth: 1.5,
      borderColor: c.red,
      backgroundColor: c.redSurface,
    },
    clipPlayCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    clipPlayCircleActive: { backgroundColor: c.red, borderColor: c.red },
    clipCardBody: { flex: 1, gap: 3 },
    clipCardTime: {
      color: c.text,
      fontSize: 13.5,
      fontWeight: "700",
      letterSpacing: 0.2,
      fontVariant: ["tabular-nums"],
    },
    clipCardTimeActive: { color: c.red },
    clipCardMeta: {
      color: c.textSub,
      fontSize: 11.5,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    // Trục 60 phút của giờ đó; đoạn tô là khoảng có bản ghi. Chỉ còn dùng cho ô
    // trong chế độ lưới — hàng timeline đã có rail vẽ đúng tỷ lệ.
    clipCoverageTrack: {
      width: "100%",
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      overflow: "hidden",
    },
    clipCoverageFill: {
      position: "absolute",
      top: 0,
      bottom: 0,
      minWidth: 2,
      borderRadius: 2,
      backgroundColor: c.redLight,
    },
    clipCoverageFillActive: { backgroundColor: c.red },

    personChip: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.redIconSurface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.redBorder,
      alignItems: "center",
      justifyContent: "center",
      marginTop: spacing.xl,
    },
    timelineEmpty: { paddingVertical: spacing.xxl },
    timelineLoading: {
      minHeight: 180,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
    },
    timelineLoadingText: {
      color: c.textSecondary,
      fontSize: 14,
      fontWeight: "500",
    },

    /* ── Bản ghi dạng lưới ──────────────────────────────────────────── */
    playbackGrid: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
    },
    playbackViews: { position: "relative" },
    playbackViewActive: { zIndex: 1 },
    playbackViewHidden: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 0,
    },
    playbackGridGroup: { marginBottom: spacing.xl },
    playbackGridHourRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    playbackGridHour: {
      color: c.text,
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 0.2,
      fontVariant: ["tabular-nums"],
    },
    playbackGridHourRule: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.borderStrong,
    },
    playbackGridHourCount: {
      color: c.textSub,
      fontSize: 12,
      fontWeight: "600",
    },
    playbackGridClips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    playbackGridRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    // Ô lưới cũng bỏ ảnh snapshot: giờ + dải phủ + thời lượng + nút phát. Ô thấp
    // hơn ảnh 16:9 nên mỗi màn nhìn được nhiều bản ghi hơn.
    playbackGridCard: {
      flexBasis: "31%",
      flexGrow: 1,
      maxWidth: "32%",
      justifyContent: "space-between",
      gap: 6,
      padding: 8,
      borderRadius: radius.md,
      backgroundColor: c.surfaceAlt,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    playbackGridCardActive: {
      borderWidth: 1.5,
      borderColor: c.red,
      backgroundColor: c.redSurface,
    },
    playbackGridTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 4,
    },
    playbackGridBottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 4,
    },
    playbackGridTime: {
      color: c.text,
      fontSize: 12.5,
      fontWeight: "800",
      letterSpacing: 0.2,
      fontVariant: ["tabular-nums"],
    },
    playbackGridTimeActive: { color: c.red },
    playbackGridDuration: {
      color: c.textSub,
      fontSize: 11.5,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    playbackGridPlay: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },

    playbackGroupDetail: {
      flex: 1,
      paddingTop: spacing.xl,
    },
    playbackGroupSheet: {
      width: "100%",
      backgroundColor: c.surface,
      overflow: "hidden",
    },
    playbackGroupScroll: { flex: 1 },
    playbackGroupHeader: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.md,
    },
    playbackGroupCloseBtn: {
      position: "absolute",
      left: spacing.md,
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    playbackGroupTitle: {
      color: c.text,
      fontSize: 20,
      fontWeight: "700",
    },

    /* ── Nút zoom timeline ──────────────────────────────────────────── */
    /** Vùng cuộn (timeline) — mốc canh giữa cho cột nút zoom. */
    scrollArea: { flex: 1, position: "relative" },

    // Canh giữa theo chiều dọc của vùng cuộn: top 50% rồi kéo lên nửa chiều cao
    // cột (2 nút + khoảng cách) để tâm cột trùng tâm vùng.
    zoomColumn: {
      position: "absolute",
      right: spacing.md,
      top: "50%",
      marginTop: -ZOOM_COLUMN_HEIGHT / 2,
      borderRadius: ZOOM_BTN_SIZE / 2,
      backgroundColor: c.surface,
      overflow: "hidden",
      ...elevation(c.shadow, 3),
    },
    zoomDivider: {
      height: StyleSheet.hairlineWidth,
      marginHorizontal: 8,
      backgroundColor: c.borderStrong,
    },
    /* ── Nút quay lại xem trực tiếp ─────────────────────────────────── */
    // Nổi ở giữa đáy vùng cuộn; `bottom` do component truyền theo safe area.
    liveButtonWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      alignItems: "center",
      zIndex: 7,
    },
    liveButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: c.red,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.xl,
      paddingVertical: 12,
      ...elevation(c.shadow, 3),
      shadowColor: c.red,
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    liveButtonText: {
      fontSize: 14.5,
      fontWeight: "800",
      letterSpacing: 0.2,
      color: c.onBrand,
    },

    zoomBtn: {
      width: ZOOM_BTN_SIZE,
      height: ZOOM_BTN_SIZE,
      alignItems: "center",
      justifyContent: "center",
    },
    zoomBtnDisabled: { opacity: 0.35 },

    /* ── Action sheet chọn tốc độ ───────────────────────────────────── */
    speedSheet: {
      backgroundColor: "transparent",
      paddingHorizontal: spacing.sm,
    },
    speedCard: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      overflow: "hidden",
    },
    speedItem: { paddingVertical: spacing.lg, alignItems: "center" },
    speedItemBorder: { borderTopWidth: StyleSheet.hairlineWidth },
    speedItemText: { fontSize: 17, color: c.text },
    speedItemTextActive: { color: c.red, fontWeight: "600" },
    speedCancelCard: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    speedCancelText: { fontSize: 17, fontWeight: "600", color: c.text },
  });
