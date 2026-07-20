import {
  useAppColors,
  useHairlineBorderColor,
} from "../../../utils/helpers/colors";
import React from "react";
import {
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import type {
  DropdownProps,
  Item,
  StackNavigation,
  StackRoute,
} from "../../../types/index";
import {
  getAssetMenuItemTheme,
  getAssetMenuMobileRoute,
} from "./assetMenuHelpers";

const localStyles = StyleSheet.create({
  rootWrap: {
    marginBottom: 6,
  },
  childWrap: {
    paddingLeft: 16,
    marginBottom: 6,
  },
});

type AssetMenuDropdownItemProps = DropdownProps & {
  onShowReport: (item: Item) => void;
  isSearching: boolean;
};

function AssetMenuDropdownItem({
  item,
  level = 0,
  expandedIds,
  onToggle,
  onShowReport,
  isSearching,
}: AssetMenuDropdownItemProps) {
  const navigation = useNavigation<StackNavigation<"AssetList">>();
  const route = useRoute<StackRoute<"Asset">>();
  const hasChildren = item.children?.length > 0;
  const expanded = expandedIds.includes(item.id);
  const theme = getAssetMenuItemTheme(item, expanded);
  const colors = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();
  const themeBackground = theme.iconImageUri
    ? colors.indigoSurface
    : item.isReport
    ? colors.pinkSurface
    : item.contentName_Mobile
    ? colors.indigoSurface
    : expanded
    ? colors.redSurface
    : colors.orangeSurface;

  const handlePress = () => {
    if (hasChildren) {
      if (!isSearching && Platform.OS !== "android") {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      onToggle(item.id);
      return;
    }

    const mobileRoute = getAssetMenuMobileRoute(item);
    if (mobileRoute) {
      navigation.navigate(mobileRoute as never);
      return;
    }

    if (item.isReport) {
      onShowReport(item);
      return;
    }

    if (item.contentName_Mobile) {
      navigation.navigate("AssetList", {
        nameClass: item.contentName_Mobile,
        titleHeader: item.label,
        groupMenuId: route.params?.groupMenuId,
        viewPermission: route.params?.viewPermission,
        assetTitleHeader: route.params?.titleHeader,
      });
    }
  };

  return (
    <View style={level > 0 ? localStyles.childWrap : localStyles.rootWrap}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surface,
            shadowColor: colors.shadow,
          },
          level > 0 && styles.cardChild,
          level > 0 && {
            backgroundColor: colors.surfaceAlt,
            borderColor: hairlineBorderColor,
          },
          pressed && styles.cardPressed,
        ]}
        onPress={handlePress}
        android_ripple={{ color: "rgba(0,0,0,0.04)" }}
      >
        <View style={[styles.accent, { backgroundColor: theme.color }]} />

        <View style={[styles.iconWrap, { backgroundColor: themeBackground }]}>
          {theme.iconImageUri ? (
            <Image
              source={{ uri: theme.iconImageUri }}
              style={styles.iconImage}
            />
          ) : theme.lib === "material" ? (
            <MaterialIcons
              name={theme.icon as any}
              size={16}
              color={theme.color}
            />
          ) : (
            <Ionicons name={theme.icon as any} size={16} color={theme.color} />
          )}
        </View>

        <Text
          style={[
            styles.label,
            { color: colors.text },
            level > 0 && styles.labelChild,
            level > 0 && { color: colors.textSecondary },
          ]}
          numberOfLines={2}
          allowFontScaling={false}
        >
          {item.label}
        </Text>

        {hasChildren ? (
          <View
            style={[styles.chevronWrap, { backgroundColor: themeBackground }]}
          >
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={13}
              color={theme.color}
            />
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        )}
      </Pressable>

      {expanded && hasChildren
        ? item.children.map((child) => (
            <MemoizedAssetMenuDropdownItem
              key={child.id}
              item={child}
              level={level + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onShowReport={onShowReport}
              isSearching={isSearching}
            />
          ))
        : null}
    </View>
  );
}

const MemoizedAssetMenuDropdownItem = React.memo(AssetMenuDropdownItem);
export default MemoizedAssetMenuDropdownItem;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    minHeight: 58,
    paddingVertical: 11,
    paddingRight: 14,
    paddingLeft: 16,
    overflow: "hidden",
    gap: 10,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardChild: {
    minHeight: 56,
    shadowOpacity: 0.03,
    elevation: 1,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardPressed: {
    opacity: 0.75,
  },
  accent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconImage: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },
  label: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    letterSpacing: 0.1,
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  labelChild: {
    fontSize: 12.5,
    fontWeight: "500",
    lineHeight: 19,
  },
  chevronWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
});
