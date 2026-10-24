import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import { useHomeCardChrome } from "./homeBlockTone";

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
  const chrome = useHomeCardChrome();

  return (
    <View
      style={[styles.card, chrome, { backgroundColor: colors.surface }]}
    >
      <View style={styles.header}>
        <Text
          style={[styles.title, { color: colors.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {note ? (
          <Text
            style={[styles.note, { color: colors.textMuted }]}
            numberOfLines={1}
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
    // Viền, bóng và mép trên do `useHomeCardChrome` lo.
    card: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 12,
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
      fontWeight: "800",
      letterSpacing: -0.2,
      color: c.text,
    },
    note: {
      fontSize: 11,
      fontWeight: "700",
      flexShrink: 0,
      color: c.textMuted,
    },
  });
