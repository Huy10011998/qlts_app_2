import { StyleSheet } from "react-native";
import { C } from "../../utils/helpers/colors";

// Layout constants shared between the screen grid math and these styles.
export const HOME_CONTENT_HORIZONTAL_PADDING = 16;
export const HOME_FEATURE_GRID_GAP = 10;
export const HOME_FEATURE_CARD_HEIGHT = 132;

export const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: HOME_CONTENT_HORIZONTAL_PADDING,
    paddingTop: 16,
    paddingBottom: 32,
  },

  grid: {
    flexDirection: "column",
    gap: HOME_FEATURE_GRID_GAP,
    marginBottom: 14,
  },
  gridRow: {
    flexDirection: "row",
    gap: HOME_FEATURE_GRID_GAP,
  },
  homeGridItem: {
    height: HOME_FEATURE_CARD_HEIGHT,
  },
  featureSheet: {
    maxHeight: "82%",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  featureSheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    marginBottom: 14,
    paddingRight: 44,
  },
  featureSheetContent: {
    paddingBottom: 20,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  featureGridItem: {
    width: "48%",
  },
  noPermissionCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 12,
    marginBottom: 14,
    shadowColor: C.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },

  reportGridItem: {
    minHeight: 118,
  },
  reportCard: {
    flex: 1,
    minHeight: 118,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: C.violetBorder,
    shadowColor: C.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  reportIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.violetSurface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  reportTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  reportTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text,
    lineHeight: 17,
    minHeight: 34,
    marginBottom: 6,
  },
  reportArrowWrap: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: C.violetSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  reportPinButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.violetBorder,
    backgroundColor: C.violetSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  reportPinButtonActive: {
    borderColor: "#7048E8",
    backgroundColor: "#7048E8",
  },
  reportSheetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  reportSheetGridItem: {
    minHeight: 118,
  },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  qaCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 14,
    shadowColor: C.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  qaDivider: {
    width: 1,
    height: 36,
    backgroundColor: C.border,
  },
});
