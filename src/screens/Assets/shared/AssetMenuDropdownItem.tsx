import {
  useAppColors,
  useHairlineBorderColor,
} from "../../../utils/helpers/colors";
import React from "react";
import {
  Image,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import type { DropdownProps, Item } from "../../../types/index";
import { getAssetMenuItemTheme } from "./assetMenuHelpers";
import { splitHighlight } from "../../../utils/helpers/string";

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
  onOpenItem: (item: Item) => void;
  isSearching: boolean;
  searchText: string;
};

function AssetMenuDropdownItem({
  item,
  level = 0,
  expandedIds,
  onToggle,
  onOpenItem,
  isSearching,
  searchText,
}: AssetMenuDropdownItemProps) {
  const childCount = item.children?.length ?? 0;
  const hasChildren = childCount > 0;
  const expanded = expandedIds.includes(item.id);
  const colors = useAppColors();
  const theme = getAssetMenuItemTheme(item, expanded, colors);
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
      // Đang tìm kiếm thì danh sách tự thay đổi theo từ khoá, thêm animation
      // gập/mở vào nữa là rối mắt.
      if (!isSearching) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      onToggle(item.id);
      return;
    }

    onOpenItem(item);
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
        >
          {splitHighlight(item.label, searchText).map((segment, index) =>
            segment.match ? (
              <Text
                key={index}
                style={[styles.labelMatch, { backgroundColor: colors.amberLight }]}
              >
                {segment.text}
              </Text>
            ) : (
              segment.text
            ),
          )}
        </Text>

        {hasChildren ? (
          <>
            {/* Số mục con lấy ngay từ cây, không tốn thêm request nào. */}
            <View style={[styles.countBadge, { backgroundColor: themeBackground }]}>
              <Text
                style={[styles.countText, { color: theme.color }]}
              >
                {childCount}
              </Text>
            </View>
            <View
              style={[styles.chevronWrap, { backgroundColor: themeBackground }]}
            >
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={13}
                color={theme.color}
              />
            </View>
          </>
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
              onOpenItem={onOpenItem}
              isSearching={isSearching}
              searchText={searchText}
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
    textAlignVertical: "center",
  },
  labelChild: {
    fontSize: 12.5,
    fontWeight: "500",
  },
  labelMatch: {
    fontWeight: "800",
  },
  countBadge: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 11,
    fontWeight: "800",
  },
  chevronWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
});
