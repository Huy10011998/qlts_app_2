import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import type { CardItemProps } from "../../types";
import Ionicons from "react-native-vector-icons/Ionicons";
import { formatDate } from "../../utils/Date";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";
import { normalizeIconImageUri } from "../../utils/iconImage";

export default function ListCardHistory({
  item,
  icon,
  onPress,
}: CardItemProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const ngayTaoCapNhat = item?.log_StartDate;
  const iconImageUri = normalizeIconImageUri(icon);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.avatar}>
        {iconImageUri ? (
          <Image source={{ uri: iconImageUri }} style={styles.avatarImage} />
        ) : (
          <Ionicons name="time-outline" size={26} color={c.red} />
        )}
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
    avatarImage: {
      width: 30,
      height: 30,
      resizeMode: "contain",
    },

    info: { flex: 1 },
    text: { fontSize: 14, color: c.text, marginBottom: 4, paddingTop: 5 },
    label: { fontWeight: "bold", color: c.text, fontSize: 14 },
  });
