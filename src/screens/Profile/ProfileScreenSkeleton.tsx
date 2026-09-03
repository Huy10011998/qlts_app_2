import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppColors,
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../utils/helpers/colors";

/**
 * Đúng các nhóm và nhãn của màn thật — nhãn ở đây là chuỗi cố định trong code,
 * không phải dữ liệu BE, nên khung chờ nói được luôn "sắp hiện những mục này".
 */
const SECTIONS = [
  { title: "THÔNG TIN CƠ BẢN", labels: ["Họ và tên", "Email"] },
  {
    title: "ĐƠN VỊ CÔNG TÁC",
    labels: ["Đơn vị", "Phòng ban", "Bộ phận", "Tổ nhóm"],
  },
  { title: "CHỨC VỤ & DANH HIỆU", labels: ["Chức vụ", "Chức danh"] },
];

/**
 * Khung chờ của màn Hồ sơ cá nhân.
 *
 * Giống `AssetDetailsSkeleton`: **hiện nhãn thật, chỉ tô xám phần giá trị** —
 * chờ ở đây là chờ `get-info` trả về giá trị, còn khung nhóm và tên từng mục thì
 * nằm sẵn trong code. Nhờ vậy lúc dữ liệu về không có gì dịch chuyển.
 *
 * Nếu sửa danh sách mục ở `ProfileScreen`, sửa `SECTIONS` ở đây theo — hai chỗ
 * lệch nhau thì khung chờ sẽ nhảy một nhịp khi dữ liệu về.
 */
export default function ProfileScreenSkeleton() {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      accessibilityLabel="Đang tải hồ sơ"
    >
      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.group}>
          <View style={styles.titleRow}>
            <View style={styles.pill} />
            <Text style={styles.title}>{section.title}</Text>
          </View>

          <View style={[styles.card, { borderColor: hairlineBorderColor }]}>
            {section.labels.map((label, index) => (
              <View
                key={label}
                style={[
                  styles.row,
                  index === section.labels.length - 1
                    ? styles.rowLast
                    : { borderBottomColor: colors.border },
                ]}
              >
                <View style={styles.iconBox} />
                <View style={styles.col}>
                  <Text style={styles.label}>{label}</Text>
                  <View
                    style={[
                      styles.value,
                      // Dài ngắn khác nhau cho giống giá trị thật.
                      index % 2 === 1 && styles.valueShort,
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    content: { paddingTop: 16, paddingBottom: 32 },
    group: { marginHorizontal: 16, marginBottom: 16 },
    titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    pill: {
      width: 4,
      height: 14,
      borderRadius: 2,
      marginRight: 8,
      backgroundColor: c.red,
    },
    title: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.4,
      color: c.textSub,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 11,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    rowLast: { borderBottomWidth: 0 },
    iconBox: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: c.skeleton,
    },
    col: { flex: 1 },
    label: {
      fontSize: 10.5,
      color: c.textSub,
      fontWeight: "600",
      letterSpacing: 0.3,
      marginBottom: 2,
    },
    value: {
      width: "62%",
      height: 13,
      marginTop: 2,
      marginBottom: 1,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    valueShort: { width: "38%" },
  });
