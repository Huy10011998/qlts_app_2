import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import {
  CameraItem,
  getAllZoneIds,
  getCameraItemTheme,
} from "./cameraMenuHelpers";
import { CAMERA_MENU_CARD_SHADOW } from "./cameraMenuTheme";

type CameraMenuDropdownItemProps = {
  item: CameraItem;
  level?: number;
  expandedIds: string[];
  onToggle: (id: string) => void;
  rawData: any[];
};

function CameraMenuDropdownItem({
  item,
  level = 0,
  expandedIds,
  onToggle,
  rawData,
}: CameraMenuDropdownItemProps) {
  const navigation = useNavigation<any>();
  const hasChildren = item.children.length > 0;
  const expanded = expandedIds.includes(item.id);
  const theme = getCameraItemTheme(item, expanded);

  const handleNavigate = () => {
    const zoneId = Number(item.id);
    const zoneIds = getAllZoneIds(zoneId, rawData);

    const cameras = rawData
      .filter(
        (camera) =>
          camera.iD_Camera != null &&
          camera.iD_Camera_Ma != null &&
          zoneIds.includes(camera.iD_VungCamera),
      )
      .map((camera) => ({
        iD_Camera: camera.iD_Camera,
        iD_Camera_MoTa: camera.iD_Camera_MoTa,
        iD_Camera_Ma: camera.iD_Camera_Ma,
      }));

    navigation.navigate("CameraList", {
      zoneId,
      zoneName: item.label,
      cameras,
    });
  };

  return (
    <View style={[styles.itemWrap, { paddingLeft: level > 0 ? 16 : 0 }]}>
      <View style={[styles.itemCard, level > 0 && styles.itemCardChild]}>
        <View style={[styles.accent, { backgroundColor: theme.color }]} />

        <Pressable
          style={({ pressed }) => [
            styles.itemMainPressable,
            pressed && styles.itemPressed,
          ]}
          onPress={handleNavigate}
        >
          <View style={[styles.iconWrap, { backgroundColor: theme.bg }]}>
            {theme.lib === "material" ? (
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
            style={[styles.label, level > 0 && styles.labelChild]}
            numberOfLines={2}
          >
            {item.label}
          </Text>
        </Pressable>

        {hasChildren ? (
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
        ) : (
          <Ionicons name="chevron-forward" size={14} color="#C7C7CC" />
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
              rawData={rawData}
            />
          ))
        : null}
    </View>
  );
}

const MemoizedCameraMenuDropdownItem = React.memo(CameraMenuDropdownItem);
export default MemoizedCameraMenuDropdownItem;

const styles = StyleSheet.create({
  itemWrap: { marginBottom: 6 },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 11,
    paddingRight: 14,
    paddingLeft: 16,
    overflow: "hidden",
    gap: 10,
    ...CAMERA_MENU_CARD_SHADOW,
  },
  itemCardChild: {
    backgroundColor: "#FAFBFE",
    shadowOpacity: 0.03,
    elevation: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EDF0F5",
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
