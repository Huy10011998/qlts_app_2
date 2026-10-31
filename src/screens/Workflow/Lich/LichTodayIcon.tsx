import React from "react";
import { StyleSheet, Text, View } from "react-native";

/**
 * Tờ lịch nhỏ ghi số ngày thật của hôm nay (nút chế độ "Hôm nay" và nút tròn
 * về hôm nay), cùng cỡ icon 16 của các nút bên cạnh — icon lịch của Ionicons
 * in cứng số 31 hoặc không có số.
 */
export default function LichTodayIcon({ color }: { color: string }) {
  return (
    <View style={[styles.sheet, { borderColor: color }]}>
      <View style={[styles.binding, { backgroundColor: color }]} />
      <View style={styles.dayWrap}>
        {/* Cỡ cố định như icon font: ô 16pt, nhân theo Cỡ chữ là tràn. */}
        <Text allowFontScaling={false} style={[styles.day, { color }]}>
          {new Date().getDate()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    width: 16,
    height: 16,
    borderRadius: 3.5,
    borderWidth: 1.4,
    overflow: "hidden",
  },
  binding: {
    height: 3,
  },
  dayWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  day: {
    fontSize: 8.5,
    lineHeight: 10,
    fontWeight: "800",
    includeFontPadding: false,
  },
});
