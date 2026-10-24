import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppColors,
  C,
  useStyles,
} from "../../../utils/helpers/colors";

/**
 * Bề ngang tối thiểu của bốn nút mốc tạm dừng ("15 phút", "30 phút", "1 giờ",
 * "4 giờ"): đệm ngang 16 × 2 + chữ 15pt đậm vừa (~52 / ~36pt) + viền hairline.
 *
 * Nút thật `flexGrow: 1` và xuống hàng theo bề ngang chữ, nên nút xám cũng phải
 * có đúng bề ngang tối thiểu đó thì mới xuống hàng cùng chỗ: màn 375–393 ra ba
 * nút + một nút (hai hàng), màn từ ~404 trở lên một hàng.
 */
const CHIP_MIN_WIDTHS = [85, 85, 69, 69];

/**
 * Khung chờ của màn Thông báo camera — chờ `dangTai` khi chưa có lệnh chính.
 *
 * Trước đây là vòng xoay canh giữa màn, nên vào màn thấy trống rồi mới đổ ra ba
 * nhóm thẻ.
 *
 * Tiêu đề nhóm là chuỗi cố định trong code nên hiện được ngay. Thẻ dựng cùng
 * khung với màn thật (nền thẻ, viền 1pt + mép trên 3pt hồng; thẻ tắt cả công ty
 * đỏ), bên trong vẽ đúng từng ô — số đo lấy từ `styles` của
 * `CameraNotificationScreen`:
 * - TRẠNG THÁI: lúc vào màn thường là đang nhận thông báo, chỉ một dòng chấm +
 *   chữ 16pt → thẻ ~56. Đang tạm dừng thì thẻ dài thêm mấy dòng chi tiết + nút
 *   Bật lại, nhưng đó là trường hợp hiếm nên không dựng sẵn.
 * - TẠM DỪNG: nhãn 12pt, ô chọn camera 42, bốn nút mốc, nhãn + ô lý do 72.
 * - TẮT CHO CẢ CÔNG TY: lời cảnh báo 13pt ba dòng + bốn nút mốc.
 */
export default function CameraNotificationSkeleton() {
  const styles = useStyles(makeStyles);

  const chips = (
    <View style={styles.chipRow}>
      {CHIP_MIN_WIDTHS.map((minWidth, index) => (
        <View key={`chip-${index}`} style={[styles.chip, { minWidth }]} />
      ))}
    </View>
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      accessibilityLabel="Đang tải cài đặt thông báo camera"
    >
      <Text style={styles.sectionTitle}>TRẠNG THÁI</Text>
      <View style={[styles.card, { borderColor: C.rose }]}>
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <View style={styles.statusLabel} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>TẠM DỪNG NHẬN THÔNG BÁO</Text>
      <View style={[styles.card, { borderColor: C.rose }]}>
        <View style={styles.fieldLabel} />
        <View style={styles.select} />
        {chips}
        <View style={[styles.fieldLabel, styles.fieldLabelSpaced]} />
        <View style={styles.input} />
      </View>

      <Text style={styles.sectionTitle}>TẮT CHO CẢ CÔNG TY</Text>
      <View style={[styles.card, { borderColor: C.red }]}>
        <View style={styles.warningLines}>
          <View style={styles.warningLine} />
          <View style={styles.warningLine} />
          <View style={[styles.warningLine, styles.warningLineShort]} />
        </View>
        {chips}
      </View>
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
    // Đúng `card` của màn thật: nền thẻ trắng, viền 1pt + mép trên 3pt.
    card: {
      borderRadius: 14,
      borderWidth: 1,
      borderTopWidth: 3,
      padding: 16,
      backgroundColor: c.card,
    },
    // Chữ "Đang nhận thông báo" 16pt đậm → dòng cao ~19.
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      height: 19,
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    statusLabel: {
      width: 150,
      height: 14,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    // Nhãn 12pt (dòng ~14) + marginBottom 6 của `inputLabel`.
    fieldLabel: {
      width: 78,
      height: 10,
      marginTop: 2,
      marginBottom: 8,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    // `inputLabel` thứ hai có marginTop 16; nhãn này cũng dài gần hết dòng.
    fieldLabelSpaced: {
      width: 210,
      marginTop: 18,
    },
    // `selectRow`: đệm dọc 12 × 2 + icon 18 + hai viền hairline.
    select: {
      height: 43,
      borderRadius: 10,
      marginBottom: 16,
      backgroundColor: c.skeleton,
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    // `chip`: đệm dọc 12 × 2 + chữ 15pt (~18) + hai viền hairline.
    chip: {
      flexGrow: 1,
      height: 43,
      borderRadius: 10,
      backgroundColor: c.skeleton,
    },
    // `input`: minHeight 72 + hai viền hairline.
    input: {
      height: 73,
      borderRadius: 10,
      backgroundColor: c.skeleton,
    },
    // Ba dòng chữ 13pt (~15.5 mỗi dòng) + marginBottom 14 của `warningText`.
    warningLines: {
      height: 47,
      justifyContent: "space-around",
      marginBottom: 14,
    },
    warningLine: {
      height: 10,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    warningLineShort: { width: "62%" },
  });
