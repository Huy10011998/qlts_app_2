import React from "react";
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { DropdownProps, Item, StackNavigation } from "../../../types/Index";
import {
  ASSET_MENU_CARD_SHADOW,
} from "./assetMenuTheme";
import { getAssetMenuItemTheme } from "./assetMenuHelpers";

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
  const hasChildren = item.children?.length > 0;
  const expanded = expandedIds.includes(item.id);
  const theme = getAssetMenuItemTheme(item, expanded);

  const handlePress = () => {
    if (hasChildren) {
      if (!isSearching) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      onToggle(item.id);
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
      });
    }
  };

  return (
    <View style={{ paddingLeft: level > 0 ? 16 : 0, marginBottom: 6 }}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          level > 0 && styles.cardChild,
          pressed && styles.cardPressed,
        ]}
        onPress={handlePress}
        android_ripple={{ color: "rgba(0,0,0,0.04)" }}
      >
        <View style={[styles.accent, { backgroundColor: theme.color }]} />

        <View style={[styles.iconWrap, { backgroundColor: theme.bg }]}>
          {theme.lib === "material" ? (
            <MaterialIcons name={theme.icon as any} size={16} color={theme.color} />
          ) : (
            <Ionicons name={theme.icon as any} size={16} color={theme.color} />
          )}
        </View>

        <Text style={[styles.label, level > 0 && styles.labelChild]} numberOfLines={2}>
          {item.label}
        </Text>

        {hasChildren ? (
          <View style={[styles.chevronWrap, { backgroundColor: theme.bg }]}>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={13}
              color={theme.color}
            />
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={14} color="#C7C7CC" />
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
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 11,
    paddingRight: 14,
    paddingLeft: 16,
    overflow: "hidden",
    gap: 10,
    ...ASSET_MENU_CARD_SHADOW,
  },
  cardChild: {
    backgroundColor: "#FAFBFE",
    shadowOpacity: 0.03,
    elevation: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EDF0F5",
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
  label: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    color: "#0F1923",
    letterSpacing: 0.1,
    lineHeight: 18,
  },
  labelChild: {
    fontSize: 12.5,
    fontWeight: "500",
    color: "#374151",
  },
  chevronWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
});
