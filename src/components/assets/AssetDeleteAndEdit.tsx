import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { AssetDeleteProps } from "../../types/Components.d";
import { usePermission } from "../../hooks/usePermission";

export default function AssetDeleteAndEdit({
  onEdit,
  onDelete,
  nameClass,
}: AssetDeleteProps) {
  const { can } = usePermission();

  const allowEdit = !!nameClass && can(nameClass, "Update");
  const allowDelete = !!nameClass && can(nameClass, "Delete");

  return (
    <View style={styles.actionIcons}>
      {allowEdit && (
        <TouchableOpacity style={styles.iconBtn} onPress={onEdit}>
          <View style={styles.iconWrapper}>
            <MaterialIcons name="edit" size={24} color="#333" />
          </View>
        </TouchableOpacity>
      )}

      {allowDelete && (
        <TouchableOpacity style={styles.iconBtn} onPress={onDelete}>
          <View style={styles.iconWrapper}>
            <MaterialIcons name="delete" size={24} color="#333" />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actionIcons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  iconBtn: {
    marginLeft: 10,
    marginBottom: 10,
  },
  iconWrapper: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 14,
    padding: 8,
    borderWidth: 2,
    borderColor: "#FF3333",
    elevation: 3,
  },
});
