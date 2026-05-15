import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { usePermission } from "../../hooks/usePermission";
import { AssetActionProps } from "../../types";
import { BRAND_RED } from "./shared/listTheme";

const localStyles = StyleSheet.create({
  iconBadgeBackground: {
    backgroundColor: "#fff",
  },
});

export default function AssetActions({
  onEdit,
  onDelete,
  onClone,
  nameClass,
}: AssetActionProps) {
  const { can } = usePermission();

  const allowEdit = !!nameClass && can(nameClass, "Update");
  const allowDelete = !!nameClass && can(nameClass, "Delete");
  const allowInsert = !!nameClass && can(nameClass, "Insert");

  const actions = [
    allowEdit
      ? {
          key: "edit",
          label: "Sửa",
          color: "#3B5BDB",
          bg: "#EEF2FF",
          border: "#DCE5FF",
          icon: (
            <MaterialIcons name="edit" size={18} color="#3B5BDB" />
          ),
          onPress: onEdit,
        }
      : null,
    allowDelete
      ? {
          key: "delete",
          label: "Xóa",
          color: BRAND_RED,
          bg: "#FFF3F3",
          border: "#FFD6D6",
          icon: (
            <MaterialIcons name="delete-outline" size={18} color={BRAND_RED} />
          ),
          onPress: onDelete,
        }
      : null,
    allowInsert
      ? {
          key: "clone",
          label: "Bản sao",
          color: "#E67700",
          bg: "#FFF8F0",
          border: "#FFE1BF",
          icon: (
            <FontAwesome5 name="clone" size={16} color="#E67700" />
          ),
          onPress: onClone,
        }
      : null,
  ].filter(Boolean) as {
    key: string;
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ReactNode;
    onPress: () => void;
  }[];

  return (
    <View style={styles.actionRow}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: action.bg,
              borderColor: action.border,
            },
            pressed && styles.actionButtonPressed,
          ]}
          onPress={action.onPress}
        >
          <View
            style={[
              styles.iconBadge,
              localStyles.iconBadgeBackground,
              { borderColor: action.border },
            ]}
          >
            {action.icon}
          </View>
          <Text style={[styles.actionText, { color: action.color }]}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    marginBottom: 10,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    shadowColor: "#1A2340",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginRight: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
