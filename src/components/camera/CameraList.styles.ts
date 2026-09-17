import { StyleSheet } from "react-native";
import { AppColors } from "../../utils/helpers/colors";

export const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1 },
    offlineState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    listArea: { flex: 1, overflow: "hidden" },
    /**
     * Tắt hẳn vùng danh sách trong lúc fullscreen ở nhánh lớp phủ (Android):
     * nó bị che kín, để lại thì Android vẫn phải đo và dựng nó mỗi lần xoay.
     * Dùng `display: "none"` chứ không gỡ khỏi cây để không phải mount lại —
     * mount lại đồng nghĩa tải lại toàn bộ ảnh snapshot lúc đóng fullscreen.
     */
    listAreaHidden: { display: "none" },
    listAnimated: { flex: 1 },
    listContent: { paddingBottom: 8 },
    listContentEmpty: {
      flexGrow: 1,
      paddingBottom: 0,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginHorizontal: 16,
      marginVertical: 12,
    },
    pageTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: "600",
      color: c.text,
      marginRight: 12,
    },
    headerRight: { flexDirection: "row", alignItems: "center", gap: 16 },
    card: {
      backgroundColor: c.surface,
      borderRadius: 12,
      margin: 8,
      padding: 6,
      elevation: 2,
      overflow: "hidden",
    },
    cardHeader: { marginBottom: 4 },
    titleRow: { flexDirection: "row", alignItems: "center" },
    cardTitle: { fontSize: 12, marginLeft: 4, flex: 1, color: c.text },
    videoWrapper: {
      width: "100%",
      aspectRatio: 16 / 9,
      backgroundColor: "#000",
      borderRadius: 8,
      overflow: "hidden",
    },
    preview: {
      width: "100%",
      height: "100%",
      borderRadius: 8,
      backgroundColor: "#000",
    },
    previewLoadingBackground: {
      backgroundColor: "#111",
      alignItems: "center",
      justifyContent: "center",
    },
    previewLoading: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#111",
      borderRadius: 8,
    },
    paginationRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      // minHeight chứ không phải height: hàng này còn cộng thêm paddingBottom
      // theo safe area, chiều cao cố định sẽ bóp mất phần chừa đó.
      minHeight: 28,
      backgroundColor: c.surface,
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: c.borderStrong,
    },
    dotActive: {
      width: 22,
      height: 7,
      backgroundColor: "#e53935",
      borderRadius: 4,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    modalOverlayLandscape: {
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
    },
    sheetContainer: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    sheetContainerLandscape: {
      width: "100%",
      maxWidth: 520,
      borderRadius: 24,
    },
    handleWrapper: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
    handle: {
      width: 45,
      height: 5,
      backgroundColor: c.borderStrong,
      borderRadius: 3,
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 8,
      color: c.text,
    },
    sheetTitleChild: {
      fontSize: 16,
      textAlign: "center",
      marginBottom: 12,
      color: c.textMuted,
    },
    listItem: { paddingVertical: 16, paddingHorizontal: 20 },
    listItemText: { fontSize: 16, color: c.text, textAlign: "center" },
    itemBorder: { borderTopWidth: 0.5, borderColor: c.border },
    activeItem: { backgroundColor: c.surfaceAlt },
    activeText: { color: c.red, fontWeight: "600" },
    closeBtn: {
      marginTop: 10,
      marginHorizontal: 16,
      backgroundColor: c.surfaceAlt,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    closeText: { fontSize: 16, fontWeight: "600", color: c.text },
    /**
     * Lớp phủ fullscreen. Phủ tuyệt đối thay vì `flex: 1` vì nó nằm chung cây
     * với danh sách chứ không còn trong <Modal> riêng; `elevation` để trên
     * Android nó nằm trên các view phía trước nó trong cùng cây.
     */
    fullscreenOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#000",
      zIndex: 20,
      elevation: 20,
    },
    /**
     * Khung fullscreen của iOS. Ở đó fullscreen vẫn nằm trong <Modal> riêng
     * (xem CameraList.tsx) nên chỉ cần `flex: 1`, không phải phủ tuyệt đối.
     */
    fullscreenContainer: { flex: 1, backgroundColor: "#000" },
    fsHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingBottom: 10,
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    },
    fsHeaderBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "rgba(0,0,0,0.45)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255,255,255,0.16)",
      alignItems: "center",
      justifyContent: "center",
    },
    fsHeaderLandscape: { paddingTop: 48 },
    fsHeaderSpacer: { flex: 1 },
    fsVideoArea: { flex: 1, backgroundColor: "#000" },
    fsSwipeOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "transparent",
      zIndex: 5,
    },
    fsPager: {
      position: "absolute",
      alignSelf: "center",
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    fsPagerText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    visibleVideo: { opacity: 1 },
    hiddenVideo: { opacity: 0 },
    thumbOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.35)",
    },
    spinner: {
      position: "absolute",
      alignSelf: "center",
      top: "50%",
      marginTop: -18,
    },
  });
