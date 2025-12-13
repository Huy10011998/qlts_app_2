import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { usePermission } from "../../hooks/usePermission";
import { AssetActionProps } from "../../types";

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

      {allowInsert && (
        <TouchableOpacity style={styles.iconBtn} onPress={onClone}>
          <View style={styles.iconWrapper}>
            <FontAwesome5 name="clone" size={24} color="#333" />
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
