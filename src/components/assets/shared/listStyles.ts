import { StyleSheet } from "react-native";
import { BRAND_RED, cardShadow } from "./listTheme";
import { AppColors } from "../../../utils/helpers/colors";

export const makeSharedAssetListStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    searchWrap: {
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 8,
      backgroundColor: c.bg,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 8,
      gap: 12,
    },
    summaryBadge: {
      alignSelf: "flex-start",
      backgroundColor: c.redSurface,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: c.redBorder,
      minWidth: 0,
      flexShrink: 1,
    },
    summaryBadgeText: {
      fontSize: 11,
      fontWeight: "600",
      color: BRAND_RED,
    },
    summaryMeta: {
      fontSize: 11.5,
      color: c.textSub,
      fontWeight: "500",
    },
    listContent: {
      flexGrow: 1,
      paddingBottom: 24,
    },
    stickyHeader: {
      backgroundColor: c.bg,
      paddingHorizontal: 14,
      paddingTop: 2,
      paddingBottom: 10,
      zIndex: 10,
    },
    filterCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      ...cardShadow(c),
    },
    filterCardIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.redSurface,
      marginRight: 10,
    },
    filterCardContent: {
      flex: 1,
      minWidth: 0,
    },
    filterCardTitle: {
      fontSize: 13.5,
      fontWeight: "700",
      color: c.text,
      marginBottom: 2,
    },
    filterCardSub: {
      fontSize: 11.5,
      color: c.textSub,
      flexShrink: 1,
    },
  });
