import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  AppColors,
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../../utils/helpers/colors";

type HomeAssetPageCardProps = {
  /**
   * Mỗi trang TỰ MANG tiêu đề của nó. Khu cuộn ngang cố tình không có một tiêu
   * đề chung: vuốt sang trang khác mà tiêu đề không đổi thì người xem đọc nhầm
   * số của trang này thành số của trang kia.
   */
  title: string;
  /** Chú thích phụ bên phải tiêu đề, ví dụ "5.578 thiết bị". */
  note?: string;
  children: React.ReactNode;
};

/**
 * Khung card dùng chung cho ba trang của khu CƠ CẤU TÀI SẢN.
 *
 * `flex: 1` là phần quan trọng: ScrollView ngang căng mọi trang bằng trang cao
 * nhất, nên ba card luôn cùng chiều cao và nội dung bên dưới khu cuộn không nhảy
 * lên nhảy xuống mỗi lần vuốt.
 */
export default function HomeAssetPageCard({
  title,
  note,
  children,
}: HomeAssetPageCardProps) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: hairlineBorderColor,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.header}>
        <Text
          style={[styles.title, { color: colors.text }]}
          numberOfLines={1}
          allowFontScaling={false}
        >
          {title}
        </Text>
        {note ? (
          <Text
            style={[styles.note, { color: colors.textMuted }]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {note}
          </Text>
        ) : null}
      </View>

      {children}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 12,
      shadowColor: c.shadow,
      shadowOpacity: 0.07,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    header: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
      marginBottom: 4,
    },
    title: {
      flex: 1,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: "800",
      letterSpacing: -0.2,
      color: c.text,
    },
    note: {
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "700",
      flexShrink: 0,
      color: c.textMuted,
    },
  });
