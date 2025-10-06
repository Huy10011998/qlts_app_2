import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { getFieldValue } from "../../utils/Helper";
import { CardItemProps } from "../../types";

export default function ListCardAsset({
  item,
  fields = [],
  icon,
  onPress = () => {},
}: CardItemProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)}>
      <View style={styles.avatar}>
        <Ionicons
          name={icon || "document-text-outline"}
          size={26}
          color="#FF3333"
        />
      </View>
      <View style={styles.info}>
        {fields.map((field) => (
          <Text key={field.name} style={styles.text}>
            <Text style={styles.label}>{field.moTa}: </Text>
            {getFieldValue(item, field)}
          </Text>
        ))}
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
  text: { fontSize: 14, color: "#000", marginBottom: 2 },
  label: { fontWeight: "bold", color: "#000" },
});
