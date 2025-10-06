import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { CardItemProps } from "../../types";
import Ionicons from "react-native-vector-icons/Ionicons";
import { formatDate } from "../../utils/Helper";

export default function ListCardHistory({ item, onPress }: CardItemProps) {
  const ngayTaoCapNhat = item?.log_StartDate;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.avatar}>
        <Ionicons name="time-outline" size={26} color="#FF3333" />
      </View>

      <View style={styles.info}>
        <Text style={styles.text}>
          <Text style={styles.label}>Ngày tạo/cập nhật: </Text>
          <Text>{formatDate(ngayTaoCapNhat)}</Text>
        </Text>

        <Text style={styles.text}>
          <Text style={styles.label}>User: </Text>
          <Text>{item?.log_ID_User_MoTa}</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  info: { flex: 1 },
  text: { fontSize: 14, color: "#000", marginBottom: 4, paddingTop: 5 },
  label: { fontWeight: "bold", color: "#000", fontSize: 14 },
});
