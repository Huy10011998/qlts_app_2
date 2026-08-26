import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AppColors, useStyles } from "../../../utils/helpers/colors";
import { BRAND_RED } from "./listTheme";

type SwipeHintBannerProps = {
  /** Việc sẽ làm, lấy đúng nhãn của nút vuốt (ví dụ "Thêm bảo trì"). */
  actionLabel: string;
};

/**
 * Dải chỉ dẫn cho thao tác vuốt trên thẻ. Luôn hiện — thao tác vuốt không có
 * dấu hiệu nào tự thấy được, nên nhắc thường trực thay vì cho tắt.
 */
export default function SwipeHintBanner({
  actionLabel,
}: SwipeHintBannerProps) {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.wrap}>
      <View style={styles.banner}>
        <Ionicons
          name="arrow-back-circle-outline"
          size={18}
          color={BRAND_RED}
        />
        <Text style={styles.text} numberOfLines={2}>
          Vuốt thẻ sang trái để {actionLabel.toLowerCase()} cho bản ghi đó.
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: {
      paddingHorizontal: 14,
      paddingBottom: 10,
      marginTop: -4,
    },
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.redSurface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.redBorder,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    text: {
      flex: 1,
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: "500",
    },
  });
