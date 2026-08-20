import {
  AppColors,
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../../utils/helpers/colors";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { CameraItem, getCameraItemTheme } from "./cameraMenuHelpers";
import { cameraMenuCardShadow } from "./cameraMenuTheme";
import { splitHighlight } from "../../../utils/helpers/string";
import type { CameraZoneTarget } from "./useOpenCameraZone";

const localStyles = StyleSheet.create({
  childWrap: {
    paddingLeft: 16,
  },
});

type CameraMenuDropdownItemProps = {
  item: CameraItem;
  level?: number;
  /** Nhận cả number vì tập gập/mở dùng chung với cây tài sản (id có thể là số). */
  expandedIds: (string | number)[];
  onToggle: (id: string) => void;
  onOpenZone: (target: CameraZoneTarget) => void;
  searchText: string;
};

function CameraMenuDropdownItem({
  item,
  level = 0,
  expandedIds,
  onToggle,
  onOpenZone,
  searchText,
}: CameraMenuDropdownItemProps) {
  const styles = useStyles(makeStyles);
  const childCount = item.children.length;
  const hasChildren = childCount > 0;
  const expanded = expandedIds.includes(item.id);
  const c = useAppColors();
  const theme = getCameraItemTheme(item, expanded, c);
  const hairlineBorderColor = useHairlineBorderColor();

  return (
    <View style={[styles.itemWrap, level > 0 && localStyles.childWrap]}>
      <View
        style={[
          styles.itemCard,
          level > 0 && styles.itemCardChild,
          level > 0 && { borderColor: hairlineBorderColor },
        ]}
      >
        <View style={[styles.accent, { backgroundColor: theme.color }]} />

        <Pressable
          style={({ pressed }) => [
            styles.itemMainPressable,
            pressed && styles.itemPressed,
          ]}
          onPress={() => onOpenZone({ id: item.id, label: item.label })}
        >
          <View style={[styles.iconWrap, { backgroundColor: theme.bg }]}>
            {theme.lib === "material" ? (
              <MaterialIcons
                name={theme.icon as any}
                size={16}
                color={theme.color}
              />
            ) : (
              <Ionicons
                name={theme.icon as any}
                size={16}
                color={theme.color}
              />
            )}
          </View>

          <Text
            style={[styles.label, level > 0 && styles.labelChild]}
            numberOfLines={2}
          >
            {splitHighlight(item.label, searchText).map((segment, index) =>
              segment.match ? (
                <Text
                  key={index}
                  style={[styles.labelMatch, { backgroundColor: c.amberLight }]}
                >
                  {segment.text}
                </Text>
              ) : (
                segment.text
              ),
            )}
          </Text>
        </Pressable>

        {hasChildren ? (
          <>
            {/* Số khu vực con lấy ngay từ cây, không tốn thêm request nào. */}
            <View style={[styles.countBadge, { backgroundColor: theme.bg }]}>
              <Text
                style={[styles.countText, { color: theme.color }]}
              >
                {childCount}
              </Text>
            </View>
            <Pressable
              onPress={() => onToggle(item.id)}
              hitSlop={10}
              style={({ pressed }) => [
                styles.chevronWrap,
                { backgroundColor: theme.bg },
                pressed && styles.itemPressed,
              ]}
            >
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={13}
                color={theme.color}
              />
            </Pressable>
          </>
        ) : (
          <Ionicons name="chevron-forward" size={14} color={c.textMuted} />
        )}
      </View>

      {expanded
        ? item.children.map((child) => (
            <MemoizedCameraMenuDropdownItem
              key={child.id}
              item={child}
              level={level + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onOpenZone={onOpenZone}
              searchText={searchText}
            />
          ))
        : null}
    </View>
  );
}

const MemoizedCameraMenuDropdownItem = React.memo(CameraMenuDropdownItem);
export default MemoizedCameraMenuDropdownItem;

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    itemWrap: { marginBottom: 6 },
    itemCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 14,
      minHeight: 58,
      paddingVertical: 11,
      paddingRight: 14,
      paddingLeft: 16,
      overflow: "hidden",
      gap: 10,
      ...cameraMenuCardShadow(c),
    },
    itemCardChild: {
      backgroundColor: c.surfaceAlt,
      minHeight: 56,
      shadowOpacity: 0.03,
      elevation: 1,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    itemMainPressable: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      gap: 10,
    },
    itemPressed: { opacity: 0.75 },
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
      color: c.text,
      letterSpacing: 0.1,
      textAlignVertical: "center",
    },
    labelChild: {
      fontSize: 12.5,
      fontWeight: "500",
      color: c.textSecondary,
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
      marginRight: 6,
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
