import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";

/**
 * Ba nhóm của màn thật, kèm chiều cao thẻ tương ứng.
 *
 * Tiêu đề là chuỗi cố định trong code nên hiện được ngay; chiều cao thẻ là số
 * XẤP XỈ (thẻ trạng thái giãn theo số dòng chi tiết, thẻ tạm dừng theo số nút),
 * đủ để không nhảy layout rõ khi dữ liệu về.
 */
const SECTIONS = [
  { title: "TRẠNG THÁI", height: 116 },
  { title: "TẠM DỪNG NHẬN THÔNG BÁO", height: 168 },
  { title: "TẮT CHO CẢ CÔNG TY", height: 96 },
];

/**
 * Khung chờ của màn Thông báo camera — chờ `dangTai` khi chưa có lệnh chính.
 *
 * Trước đây là vòng xoay canh giữa màn, nên vào màn thấy trống rồi mới đổ ra ba
 * nhóm thẻ.
 */
export default function CameraNotificationSkeleton() {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      accessibilityLabel="Đang tải cài đặt thông báo camera"
    >
      {SECTIONS.map((section) => (
        <View key={section.title}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View
            style={[
              styles.card,
              { height: section.height, borderColor: colors.border },
            ]}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    content: { padding: 16, paddingBottom: 32 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.6,
      marginBottom: 8,
      marginTop: 12,
      color: c.textSub,
    },
    card: {
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: c.skeleton,
    },
  });
