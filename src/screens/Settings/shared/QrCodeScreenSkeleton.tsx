import React from "react";
import { StyleSheet, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppColors, C, useStyles } from "../../../utils/helpers/colors";
import QrCodeBackButton from "./QrCodeBackButton";

/** Phải khớp `QR_SIZE` + padding panel của `QrCodeScreen`, không thì mã QR nhảy chỗ. */
const QR_PANEL_SIZE = 128 + 12;

/**
 * Khung chờ của màn Thông tin QrCode.
 *
 * Giữ nguyên nền và bố cục ba khối của màn thật, chỉ tô mờ phần chờ `get-info`
 * trả về — nhờ vậy lúc dữ liệu về không có gì dịch chuyển.
 */
export default function QrCodeScreenSkeleton() {
  const s = useStyles(makeS);
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#8C2634", "#6E1A26"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.root}
      accessibilityLabel="Đang tải thông tin QrCode"
    >
      <QrCodeBackButton tint={C.onBrand} backgroundColor="#FFFFFF24" />

      <View
        style={[
          s.content,
          { paddingTop: insets.top + 18, paddingBottom: 26 + insets.bottom },
        ]}
      >
        <View style={s.qrPanel} />

        <View style={s.personBlock}>
          <View style={[s.bar, s.fullName]} />
          <View style={[s.bar, s.position]} />
          <View style={[s.bar, s.department]} />
          <View style={[s.bar, s.phone]} />
        </View>

        <View style={s.footer}>
          <View style={[s.bar, s.companyName]} />
          <View style={[s.bar, s.footerLine]} />
          <View style={[s.bar, s.footerLineShort]} />
          <View style={[s.bar, s.footerLineShort]} />
        </View>
      </View>
    </LinearGradient>
  );
}

const makeS = (_c: AppColors) =>
  StyleSheet.create({
    root: { flex: 1 },
    content: {
      flex: 1,
      justifyContent: "space-between",
      paddingHorizontal: 22,
    },

    qrPanel: {
      alignSelf: "flex-start",
      width: QR_PANEL_SIZE,
      height: QR_PANEL_SIZE,
      borderRadius: 6,
      backgroundColor: "#FFFFFF66",
    },

    personBlock: { alignItems: "center", paddingHorizontal: 4 },
    bar: { borderRadius: 6, backgroundColor: "#FFFFFF4D" },
    fullName: { width: "74%", height: 27 },
    position: { marginTop: 9, width: "88%", height: 15 },
    department: { marginTop: 6, width: "58%", height: 15 },
    phone: { marginTop: 22, width: "46%", height: 23 },

    footer: { width: "100%" },
    companyName: { width: "88%", height: 17 },
    footerLine: { marginTop: 9, width: "100%", height: 13 },
    footerLineShort: { marginTop: 9, width: "66%", height: 13 },
  });
