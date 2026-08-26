import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

type QrQuickReviewToggleProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
};

const TRACK_ON = "#22C55E";
const TRACK_OFF = "rgba(255,255,255,0.25)";

/**
 * Công tắc "đánh giá nhanh" trên màn quét: bật thì quét xong vào thẳng màn đánh
 * giá, tắt thì dừng ở màn chi tiết thiết bị như trước.
 *
 * Đặt ngay trên màn quét chứ không vùi vào Cài đặt: người dùng đổi chế độ đúng
 * lúc đổi việc (đi kiểm kê hàng loạt / tra một thiết bị), và phải thấy mình đang
 * ở chế độ nào trước khi quét.
 *
 * Màu chốt cứng theo bộ chrome tối của màn quét, không lấy theo theme.
 */
export default function QrQuickReviewToggle({
  enabled,
  onChange,
}: QrQuickReviewToggleProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.pill}>
        <Ionicons
          name="flash-outline"
          size={15}
          color={enabled ? TRACK_ON : "rgba(255,255,255,0.75)"}
        />
        <Text style={styles.label}>Đánh giá nhanh</Text>
        <Switch
          value={enabled}
          onValueChange={onChange}
          trackColor={{ false: TRACK_OFF, true: TRACK_ON }}
          thumbColor="#fff"
          ios_backgroundColor={TRACK_OFF}
          style={styles.switch}
        />
      </View>

      {enabled ? (
        <Text style={styles.hint}>Quét là vào form đánh giá luôn</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-start",
    marginTop: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(0,0,0,0.42)",
    borderRadius: 18,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 4,
  },
  label: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  switch: {
    transform: [{ scaleX: 0.78 }, { scaleY: 0.78 }],
  },
  hint: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11.5,
    marginTop: 5,
    marginLeft: 4,
  },
});
