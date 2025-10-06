import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ListCardAttachFileProps } from "../../types";
import Ionicons from "react-native-vector-icons/Ionicons";
import Viewer from "../file/FileView";

export default function ListCardAttachFile({ item }: ListCardAttachFileProps) {
  const [openPdf, setOpenPdf] = useState(false);

  return (
    <View>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Ionicons name="document-text-outline" size={26} color="#FF3333" />
        </View>

        <View style={styles.info}>
          <Text style={styles.label}>{item.moTa}</Text>
          <Text style={styles.text}>{item.name || "Không có tên file"}</Text>
        </View>

        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => setOpenPdf(true)}
        >
          <Text style={styles.viewText}>Xem</Text>
        </TouchableOpacity>
      </View>

      <Viewer
        visible={openPdf}
        onClose={() => setOpenPdf(false)}
        params={{
          name: item.name,
          path: item.path,
          nameClass: item.name_Class,
        }}
      />
    </View>
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
    alignItems: "center",
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
  text: { fontSize: 14, color: "#444", marginTop: 4 },
  label: { fontWeight: "bold", color: "#000", fontSize: 15 },
  viewButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#FF3333",
    borderRadius: 8,
  },
  viewText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
});
