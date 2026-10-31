import { StyleSheet } from "react-native";
import { AppColors, C } from "../../utils/helpers/colors";

const RED = C.red;
const PHOTO_TEXT_SHADOW = {
  textShadowColor: "rgba(0,0,0,0.35)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 6,
};

export const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    // ── Root ──
    // Cùng màu thẻ form — màu lộ ra phía sau bàn phím.
    kvRoot: {
      flex: 1,
      backgroundColor: c.bg,
    },
    root: {
      flex: 1,
      backgroundColor: c.bg,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },

    // ── Ảnh nền + thanh trên ──
    // Kích thước + vị trí tính theo mép nước trong LoginScreen.
    photo: {
      position: "absolute",
    },
    photoSky: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
    },
    photoSkyBlend: {
      position: "absolute",
      left: 0,
      right: 0,
    },
    photoTopShade: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
    },
    photoArea: {
      flexGrow: 1,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      gap: 12,
    },
    // Ghi rõ co/giãn: để `flex: 1` thì khối chữ giãn theo nội dung, đẩy nút
    // mạng nội bộ ra ngoài mép phải màn hình (đo được rộng 1058pt).
    brandRow: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    // Logo hiện nguyên hình kèm nền trắng của file (như header các màn khác,
    // tỷ lệ 2560×1810), không thêm khung, bo góc hay bóng.
    brandLogo: {
      width: 99,
      height: 70,
      resizeMode: "contain",
    },
    brandTextWrap: {
      flex: 1,
    },
    brandTitle: {
      fontSize: 19,
      fontWeight: "800",
      color: "#fff",
      letterSpacing: 0.2,
      ...PHOTO_TEXT_SHADOW,
    },
    brandTagline: {
      marginTop: 2,
      fontSize: 12.5,
      fontWeight: "500",
      color: "rgba(255,255,255,0.92)",
      ...PHOTO_TEXT_SHADOW,
    },
    networkBtn: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: "rgba(20,20,20,0.38)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    networkDot: {
      position: "absolute",
      top: -2,
      right: -2,
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
    },
    networkDotGranted: {
      backgroundColor: "#16A34A",
    },
    networkDotDenied: {
      backgroundColor: C.amber,
    },
    networkDotUnknown: {
      backgroundColor: "#64748B",
    },

    // ── Thẻ form ──
    // Nền xám-xanh như các màn trong app, ô nhập và nút trắng nổi trên đó —
    // thẻ trắng nối liền mảng sáng của ảnh nền nên trông nhạt (31/10).
    card: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      // paddingTop tính trong LoginScreen (cộng phần nâng thẻ `cardLift`).
      paddingHorizontal: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.18,
      shadowRadius: 22,
      elevation: 16,
    },
    cardShort: {
      paddingHorizontal: 20,
    },
    // Máy tính bảng: thẻ vẫn tràn ngang, nội dung giữ bề rộng như điện thoại.
    cardInner: {
      flexGrow: 1,
      width: "100%",
      maxWidth: 480,
      alignSelf: "center",
    },
    cardSpacer: {
      flexGrow: 1,
    },
    greeting: {
      marginBottom: 16,
    },
    greetingShort: {
      marginBottom: 12,
    },
    greetingHello: {
      fontSize: 15,
      color: c.textMuted,
    },
    greetingTitle: {
      marginTop: 2,
      fontSize: 20,
      fontWeight: "800",
      color: c.text,
    },
    // Đã nhớ tài khoản: ảnh đại diện + "Xin chào, TÊN" (kiểu VCB).
    greetingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      overflow: "hidden",
      borderWidth: 2,
      borderColor: c.redBorder,
      backgroundColor: c.surface,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    avatarInitials: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInitialsText: {
      fontSize: 19,
      fontWeight: "800",
      color: "#fff",
      letterSpacing: 0.5,
    },
    // Ghi rõ co/giãn như `brandRow`: `flex: 1` trong hàng ngang cho chữ giãn
    // tràn màn.
    greetingTextWrap: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      minWidth: 0,
    },
    greetingName: {
      marginTop: 2,
      fontSize: 18,
      fontWeight: "800",
      color: c.text,
      letterSpacing: 0.2,
    },

    // ── Inputs ──
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      minHeight: 52,
      marginBottom: 12,
      borderWidth: 1.5,
      borderColor: c.separator,
    },
    inputWrapperShort: {
      minHeight: 46,
      marginBottom: 10,
    },
    inputWrapperFocused: {
      borderColor: RED,
      backgroundColor: c.redSurface,
    },
    inputIcon: {
      marginRight: 12,
    },
    textInput: {
      flex: 1,
      minHeight: 52,
      paddingTop: 0,
      paddingBottom: 0,
      paddingVertical: 0,
      fontSize: 15,
      color: c.text,
      textAlignVertical: "center",
    },
    textInputShort: {
      minHeight: 46,
    },

    // ── Buttons ──
    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
      gap: 12,
    },
    // Nền đỏ đặc dưới lớp gradient: Android cần nền mới đổ bóng `elevation`.
    loginBtn: {
      flex: 1,
      height: 50,
      borderRadius: 12,
      backgroundColor: RED,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: C.redDeep,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
    loginBtnShort: {
      height: 46,
    },
    loginBtnFill: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 12,
    },
    loginBtnDisabled: {
      opacity: 0.5,
      shadowOpacity: 0,
      elevation: 0,
    },
    loginBtnText: {
      color: "#fff",
      fontSize: 17,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    faceIdBtn: {
      width: 50,
      height: 50,
      borderRadius: 12,
      backgroundColor: c.surface,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: c.separator,
    },
    faceIdBtnShort: {
      width: 46,
      height: 46,
    },
    faceIdBtnDimmed: {
      opacity: 0.4,
    },
    faceIDIcon: {
      width: 28,
      height: 28,
    },

    // ── Hỗ trợ ──
    supportRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 18,
    },
    supportRowShort: {
      marginTop: 14,
    },
    supportAction: {
      flex: 1,
      minHeight: 44,
      borderRadius: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.separator,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },
    supportActionText: {
      flexShrink: 1,
      fontSize: 13,
      fontWeight: "600",
      color: c.text,
    },

    // ── Footer ──
    // Thông tin chân thẻ cho nổi (31/10): ba ô trắng giá trị đỏ đậm như ô
    // nhập, dòng bảo mật có khiên xanh và viên phiên bản.
    footer: {
      marginTop: 18,
      gap: 12,
    },
    footerShort: {
      marginTop: 12,
      gap: 10,
    },
    infoRow: {
      flexDirection: "row",
      gap: 8,
    },
    // Ghi rõ co/giãn (không `flex: 1`) — xem `brandRow`.
    infoChip: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      minWidth: 0,
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 6,
      borderRadius: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.separator,
    },
    infoChipWide: {
      flexGrow: 1.5,
    },
    infoLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: c.textMuted,
    },
    infoValue: {
      marginTop: 2,
      fontSize: 14,
      fontWeight: "800",
      color: RED,
    },
    secureRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: 6,
    },
    secureText: {
      fontSize: 12.5,
      fontWeight: "700",
      color: c.textSecondary,
    },
    versionPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.separator,
    },
    versionText: {
      fontSize: 11.5,
      fontWeight: "600",
      color: c.textMuted,
    },
  });
