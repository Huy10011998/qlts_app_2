import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { ListCardAttachFileProps } from "../../types";
import Ionicons from "react-native-vector-icons/Ionicons";
import Viewer from "../file/FileView";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";

export default function ListCardAttachFile({ item }: ListCardAttachFileProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const [openPdf, setOpenPdf] = useState(false);

  return (
    <View>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Ionicons name="document-text-outline" size={26} color={c.red} />
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

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      backgroundColor: c.surface,
      marginHorizontal: 12,
      marginVertical: 6,
      padding: 16,
      borderRadius: 16,
      shadowColor: c.shadow,
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
      backgroundColor: c.blueSurface,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 16,
    },

    info: { flex: 1 },
    text: { fontSize: 14, color: c.textSecondary, marginTop: 4 },
    label: { fontWeight: "bold", color: c.text, fontSize: 15 },

    viewButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: c.red,
      borderRadius: 8,
    },

    viewText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  });
