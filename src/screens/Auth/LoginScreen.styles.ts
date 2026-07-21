import { StyleSheet } from "react-native";
import { C } from "../../utils/helpers/colors";

const RED = C.red;

export const styles = StyleSheet.create({
  // ── Root ──
  kvRoot: {
    flex: 1,
    backgroundColor: C.surface, // phải là trắng — màu lộ ra phía sau bàn phím
  },
  root: {
    flex: 1,
    backgroundColor: RED, // hero đỏ, card trắng che phần còn lại
  },

  // ── Hero ──
  heroBg: {
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  circle1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -80,
    right: -60,
  },
  circle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -60,
    left: -40,
  },
  circle3: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.09)",
    top: 60,
    right: 30,
  },
  logoBlock: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 20,
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    marginBottom: 10,
  },
  brandPillCompact: {
    marginBottom: 7,
    paddingVertical: 4,
  },
  brandPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.88)",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  logoShadowWrap: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  logoShadowWrapCompact: {
    borderRadius: 14,
  },
  logo: {
    width: 176,
    height: 88,
    resizeMode: "contain",
    backgroundColor: C.surface,
    borderRadius: 16,
  },
  logoCompact: {
    width: 142,
    height: 70,
    borderRadius: 14,
  },
  heroTagline: {
    marginTop: 10,
    fontSize: 11,
    color: "rgba(255,255,255,0.72)",
    letterSpacing: 0.5,
    fontWeight: "500",
  },
  heroTaglineCompact: {
    marginTop: 6,
    fontSize: 10,
  },

  // ── Card ──
  card: {
    flex: 1,
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 16,
    overflow: "hidden",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 20,
    flexGrow: 1,
  },
  scrollContentCompact: {
    paddingHorizontal: 24,
    paddingTop: 14,
  },

  // Card header
  cardHeader: {
    marginBottom: 10,
  },
  cardHeaderCompact: {
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: C.text,
    marginBottom: 4,
  },
  cardTitleCompact: {
    fontSize: 23,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: C.textMuted,
    lineHeight: 20,
  },
  cardSubtitleCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  // ── Inputs ──
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  inputWrapperCompact: {
    minHeight: 44,
    marginBottom: 9,
  },
  inputWrapperFocused: {
    borderColor: RED,
    backgroundColor: C.redSurface,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: 48,
    paddingTop: 0,
    paddingBottom: 0,
    paddingVertical: 0,
    fontSize: 14,
    color: C.text,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  textInputCompact: {
    height: 44,
  },

  // ── Buttons ──
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 12,
  },
  actionsRowCompact: {
    marginTop: 2,
  },
  loginBtn: {
    flex: 1,
    height: 45,
    borderRadius: 14,
    backgroundColor: RED,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: RED,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  loginBtnDisabled: {
    backgroundColor: "#E58B8B",
    shadowOpacity: 0.1,
    elevation: 2,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  faceIdBtn: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: C.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.border,
  },
  faceIdBtnDimmed: {
    opacity: 0.4,
  },
  faceIDIcon: {
    width: 28,
    height: 28,
  },

  // ── Info chips (moved to form) ──
  infoRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
    alignItems: "stretch",
  },
  infoRowCompact: {
    marginTop: 12,
  },
  infoChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: C.redSurface,
    borderWidth: 1,
    borderColor: C.redBorder,
    alignItems: "center",
  },
  infoChipCompact: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  infoChipWide: {
    flex: 1.4,
  },
  infoLabel: {
    fontSize: 10,
    color: "#B05050",
    fontWeight: "600",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 11,
    color: RED,
    fontWeight: "700",
    textAlign: "center",
  },
  localNetworkNotice: {
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    shadowColor: "#7F1D1D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  localNetworkNoticeGranted: {
    backgroundColor: C.greenLight,
    borderColor: C.greenBorder,
  },
  localNetworkNoticeDenied: {
    backgroundColor: C.orangeSurface,
    borderColor: C.amberBorder,
  },
  localNetworkNoticeUnknown: {
    backgroundColor: C.surfaceAlt,
    borderColor: C.border,
  },
  localNetworkIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  localNetworkIconGranted: {
    backgroundColor: C.greenLight,
  },
  localNetworkIconDenied: {
    backgroundColor: C.redSurface,
  },
  localNetworkIconUnknown: {
    backgroundColor: C.border,
  },
  localNetworkTextWrap: {
    flex: 1,
    gap: 1,
  },
  localNetworkLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.textSecondary,
  },
  localNetworkStatusText: {
    fontSize: 12,
    fontWeight: "800",
  },
  localNetworkStatusGranted: {
    color: "#15803D",
  },
  localNetworkStatusDenied: {
    color: "#B91C1C",
  },
  localNetworkStatusUnknown: {
    color: C.text,
  },
  localNetworkSettingsButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.redBorder,
  },
  supportCard: {
    marginTop: 12,
    padding: 10,
    borderRadius: 16,
    backgroundColor: C.redSurface,
    borderWidth: 1,
    borderColor: C.redBorder,
  },
  supportCardCompact: {
    marginTop: 9,
    padding: 8,
    borderRadius: 14,
  },
  supportActions: {
    gap: 8,
  },
  supportActionsCompact: {
    gap: 8,
  },
  supportAction: {
    flex: 1,
    minHeight: 36,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.redBorder,
  },
  supportActionText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: C.textSecondary,
  },

  // ── Footer ──
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    gap: 8,
  },
  footerCompact: {
    marginTop: 12,
  },
  footerNarrow: {
    flexDirection: "column",
    gap: 6,
  },
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  secureText: {
    fontSize: 12,
    color: C.placeholder,
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: C.borderStrong,
  },
  versionPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
  },
  versionText: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "600",
  },
});
