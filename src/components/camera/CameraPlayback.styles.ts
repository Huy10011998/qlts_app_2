import { StyleSheet } from "react-native";
import { C } from "../../utils/helpers/colors";
import { elevation, radius, spacing } from "../../utils/helpers/tokens";
import { CAMERA_FULLSCREEN_EDGE_INSET } from "./shared/cameraStreamConfig";

export const PLAYER_ASPECT_RATIO = 16 / 9;
export const TIMELINE_ROW_HEIGHT = 168;
export const TIMELINE_RAIL_WIDTH = 6;
export const TIMELINE_LABEL_WIDTH = 74;
/** Khoảng cách từ đỉnh vùng cuộn tới hàng đầu tiên của timeline. */
export const TIMELINE_TOP_MARGIN = spacing.lg;
/** Vạch đọc: badge thời gian nằm cố định ở đây, nội dung cuộn qua nó. */
export const TIMELINE_READING_OFFSET = 56;

const ZOOM_BTN_SIZE = 44;
/** 2 nút zoom + khoảng cách giữa chúng — dùng để canh giữa cột. */
const ZOOM_COLUMN_HEIGHT = ZOOM_BTN_SIZE * 2 + spacing.md;

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  /* ── Player ─────────────────────────────────────────────────────── */
  player: { backgroundColor: "#000" },
  playerFrame: { width: "100%", backgroundColor: "#000", overflow: "hidden" },
  playerFrameFill: { flex: 1 },
  playerTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    zIndex: 3,
  },
  // Toàn màn hình: chừa tai thỏ / home indicator đúng như fullscreen của
  // CameraListGrid (fsHeader/fsFooter).
  playerTopBarFullscreen: {
    paddingTop: CAMERA_FULLSCREEN_EDGE_INSET,
    paddingHorizontal: spacing.md,
  },
  // Chỉ mũi tên, không kèm tên camera: nhiều đầu ghi in sẵn ngày giờ (OSD) ở
  // góc trên-trái khung hình nên chữ của app sẽ đè lên chữ của camera.
  playerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.38)",
    alignItems: "center",
    justifyContent: "center",
  },
  playerLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  /* ── Player controls (khi đang phát) ────────────────────────────── */
  playerControls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 22,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    zIndex: 4,
  },
  playerControlsFullscreen: {
    bottom: CAMERA_FULLSCREEN_EDGE_INSET,
    paddingHorizontal: spacing.lg,
  },
  playerControlBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  playerControlSpacer: { flex: 1 },
  playerSpeedBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  playerSpeedText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  progressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.28)",
    zIndex: 4,
  },
  progressFill: { height: 4, backgroundColor: C.red },
  progressHandle: {
    position: "absolute",
    // Neo ở đáy track và cao hơn track — playerFrame có overflow hidden nên
    // không dùng offset âm để tránh bị cắt.
    bottom: 0,
    marginLeft: -5,
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: C.red,
    zIndex: 5,
  },

  scrollContent: { paddingBottom: spacing.lg },

  /* ── Thanh chọn ngày ────────────────────────────────────────────── */
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  datePillBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  datePillCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
  },
  datePillText: { fontSize: 13, fontWeight: "600", color: C.textSecondary },
  dateViewBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Lịch chọn ngày (dùng chung BottomSheetModalShell của app) ─── */
  calendarSheet: {
    backgroundColor: C.surface,
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
    color: C.text,
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
    color: C.red,
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
    color: C.textSecondary,
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
  calendarDaySelected: { backgroundColor: C.red },
  calendarDayText: { color: C.text, fontSize: 15, fontWeight: "500" },
  calendarDayTextMuted: { color: C.placeholder },
  calendarDayTextSelected: { color: C.onBrand, fontWeight: "700" },
  calendarRecordingDot: {
    position: "absolute",
    bottom: 2,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.red,
  },
  calendarStartTimeRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  calendarStartTimeLabel: {
    color: C.text,
    fontSize: 16,
    fontWeight: "500",
  },
  calendarStartTimeValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  calendarStartTimeValue: {
    color: C.textSecondary,
    fontSize: 16,
    fontWeight: "500",
  },

  /* ── Bộ chọn thời gian bắt đầu ─────────────────────────────────── */
  timeSheet: {
    minHeight: 390,
    backgroundColor: C.surface,
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
    color: C.text,
    fontSize: 18,
    fontWeight: "700",
  },
  timeSheetConfirmText: {
    color: C.red,
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
  timePickerItem: { color: C.text, fontSize: 22, height: 220 },
  timePickerColon: {
    color: C.text,
    fontSize: 24,
    fontWeight: "600",
    marginHorizontal: spacing.xs,
  },

  /* ── Timeline ───────────────────────────────────────────────────── */
  timeline: {
    marginTop: TIMELINE_TOP_MARGIN,
    paddingHorizontal: spacing.md,
    position: "relative",
  },
  timelineRow: { flexDirection: "row", height: TIMELINE_ROW_HEIGHT },
  timelineLabelCol: {
    width: TIMELINE_LABEL_WIDTH,
    alignItems: "flex-end",
    paddingRight: spacing.sm,
  },
  timelineLabel: { fontSize: 13, fontWeight: "600", color: C.textSub },

  /* ── Badge thời gian ở vạch đọc (cố định, nội dung cuộn qua) ─────── */
  scrubBadgeWrap: {
    position: "absolute",
    left: spacing.md,
    width: TIMELINE_LABEL_WIDTH,
    top: TIMELINE_READING_OFFSET,
    alignItems: "flex-end",
    zIndex: 6,
  },
  scrubBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.red,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  scrubBadgeText: { fontSize: 12.5, fontWeight: "700", color: C.onBrand },
  // Mũi nhọn nhỏ chỉ về phía rail — hình vuông xoay 45°.
  scrubBadgeArrow: {
    position: "absolute",
    right: -3,
    width: 8,
    height: 8,
    backgroundColor: C.red,
    transform: [{ rotate: "45deg" }],
  },
  timelineLabelDash: {
    width: 10,
    height: 2,
    borderRadius: 1,
    backgroundColor: C.borderStrong,
    marginTop: 7,
  },
  timelineRailCol: {
    width: TIMELINE_RAIL_WIDTH,
    borderRadius: 3,
    backgroundColor: C.surfaceAlt,
    overflow: "hidden",
  },
  timelineTick: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: C.redLight,
  },
  // Nhóm đang chọn dùng đỏ đậm hơn để vẫn nổi so với các nhóm còn lại.
  timelineTickActive: { backgroundColor: C.red },
  timelineClipCol: {
    flex: 1,
    paddingLeft: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  clipCardWrap: { paddingTop: 4 },
  clipCardStack: {
    position: "absolute",
    top: 0,
    left: 10,
    right: 10,
    height: 12,
    borderRadius: radius.sm,
    backgroundColor: C.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  clipCard: {
    width: 138,
    height: 84,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: "#111",
    ...elevation(2),
  },
  clipCardActive: { borderWidth: 2, borderColor: C.red },
  clipCountText: {
    position: "absolute",
    top: 6,
    left: 8,
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    zIndex: 2,
  },
  clipPlayBtn: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: spacing.sm,
    zIndex: 2,
  },
  clipPlayCircle: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  personChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.redIconSurface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  timelineEmpty: { paddingVertical: spacing.xxl },

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
  playbackGridHour: {
    color: C.textSecondary,
    fontSize: 17,
    fontWeight: "500",
    marginBottom: spacing.md,
  },
  playbackGridClips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  playbackGridCard: {
    flexBasis: "31%",
    flexGrow: 1,
    maxWidth: "32%",
    aspectRatio: 1.55,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  playbackGridCardActive: { borderWidth: 2, borderColor: C.red },
  playbackGridTime: {
    position: "absolute",
    top: 5,
    left: 6,
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    zIndex: 2,
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowRadius: 2,
  },
  playbackGridDuration: {
    position: "absolute",
    top: 5,
    right: 6,
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    zIndex: 2,
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowRadius: 2,
  },
  playbackGridEventIcon: {
    position: "absolute",
    right: 5,
    bottom: 5,
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.48)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  playbackGroupDetail: {
    flex: 1,
    paddingTop: spacing.xl,
  },
  playbackGroupSheet: {
    width: "100%",
    backgroundColor: C.surface,
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
    color: C.text,
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
    gap: spacing.md,
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
    backgroundColor: C.red,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    ...elevation(3),
  },
  liveButtonText: { fontSize: 15, fontWeight: "700", color: C.onBrand },

  zoomBtn: {
    width: ZOOM_BTN_SIZE,
    height: ZOOM_BTN_SIZE,
    borderRadius: ZOOM_BTN_SIZE / 2,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    ...elevation(2),
  },

  /* ── Action sheet chọn tốc độ ───────────────────────────────────── */
  speedSheet: { backgroundColor: "transparent", paddingHorizontal: spacing.sm },
  speedCard: {
    backgroundColor: C.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  speedItem: { paddingVertical: spacing.lg, alignItems: "center" },
  speedItemBorder: { borderTopWidth: StyleSheet.hairlineWidth },
  speedItemText: { fontSize: 17, color: C.text },
  speedItemTextActive: { color: C.red, fontWeight: "600" },
  speedCancelCard: {
    backgroundColor: C.surface,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  speedCancelText: { fontSize: 17, fontWeight: "600", color: C.text },
});
