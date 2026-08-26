import { StyleSheet } from "react-native";
import { AppColors } from "../../../utils/helpers/colors";
import { ASSET_FORM_BRAND_RED, assetFormCardShadow } from "./assetFormTheme";

/**
 * Base styles shared by every asset form screen. Takes the palette so each
 * screen rebuilds its sheet when the user switches the appearance.
 */
export const createAssetFormBaseStyles = (c: AppColors) => {
  const brandColor = ASSET_FORM_BRAND_RED;
  const cardShadow = assetFormCardShadow(c);

  return {
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
    },
    loadingOverlay: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(15,25,35,0.2)",
      justifyContent: "center" as const,
      alignItems: "center" as const,
      zIndex: 999,
    },
    heroCard: {
      backgroundColor: c.surface,
      borderRadius: 18,
      padding: 14,
      marginBottom: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      ...cardShadow,
    },
    heroIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginRight: 12,
    },
    heroContent: {
      flex: 1,
      marginLeft: 8,
    },
    heroTitle: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: c.text,
      marginBottom: 2,
    },
    heroSub: {
      fontSize: 12,
      color: c.textSub,
    },
    groupCard: {
      backgroundColor: c.surface,
      padding: 14,
      borderRadius: 16,
      marginBottom: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      ...cardShadow,
    },
    groupHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginBottom: 12,
    },
    groupTitleWrap: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      flex: 1,
    },
    groupIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: c.redSurface,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginRight: 10,
    },
    groupTitle: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: c.text,
      flex: 1,
    },
    chevronWrap: {
      width: 28,
      height: 28,
      borderRadius: 9,
      backgroundColor: c.redSurface,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    fieldBlock: {
      marginBottom: 14,
    },
    label: {
      fontSize: 13,
      fontWeight: "600" as const,
      marginBottom: 7,
      color: c.textSecondary,
    },
    input: {
      borderWidth: 1,
      borderColor: c.borderStrong,
      minHeight: 48,
      paddingHorizontal: 12,
      borderRadius: 12,
      paddingVertical: 0,
      fontSize: 14,
      color: c.text,
      backgroundColor: c.input,
      textAlignVertical: "center" as const,
    },
    switchRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
    },
    textArea: {
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 12,
      padding: 12,
      minHeight: 100,
      fontSize: 14,
      color: c.text,
      backgroundColor: c.input,
      textAlignVertical: "top" as const,
    },
    boolRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingVertical: 6,
    },
    boolLabel: {
      flex: 1,
      paddingRight: 12,
    },
    tooltipRow: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      alignItems: "flex-start" as const,
    },
    tooltipLabel: {
      color: brandColor,
      fontWeight: "600" as const,
      fontSize: 14,
    },
    tooltipText: {
      color: c.text,
      fontSize: 14,
      flexShrink: 1,
    },
  };
};
