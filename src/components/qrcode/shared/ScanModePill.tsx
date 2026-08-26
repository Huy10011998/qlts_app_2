import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import {
  getRecordActionKindInfo,
} from "../../../constants/recordActionKinds";
import type { ScanMode } from "../../../context/ScanModeContext";

type ScanModePillProps = {
  mode: ScanMode;
  onPress: () => void;
};

const ACCENT = "#22C55E";

/** Nhãn của chế độ, dùng chung cho pill và bảng chọn. */
export const getScanModeLabel = (mode: ScanMode) =>
  mode === "view"
    ? "Xem thông tin"
    : getRecordActionKindInfo(mode)?.label ?? "Xem thông tin";

export const getScanModeIcon = (mode: ScanMode) =>
  mode === "view"
    ? "information-circle-outline"
    : getRecordActionKindInfo(mode)?.icon ?? "information-circle-outline";

/**
 * Chế độ quét đang bật, ngay trên màn quét.
 *
 * Luôn hiện — kể cả khi đang là "Xem thông tin". Người dùng phải biết quét xong
 * sẽ xảy ra chuyện gì TRƯỚC khi quét, và đổi việc phải trong một tap chứ không
 * phải đi tìm trong Cài đặt.
 *
 * Màu chốt cứng theo bộ chrome tối của màn quét, không lấy theo theme.
 */
export default function ScanModePill({ mode, onPress }: ScanModePillProps) {
  const isActive = mode !== "view";

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Chế độ quét: ${getScanModeLabel(mode)}`}
        hitSlop={8}
        onPress={onPress}
        style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
      >
        <Ionicons
          name={getScanModeIcon(mode)}
          size={15}
          color={isActive ? ACCENT : "rgba(255,255,255,0.75)"}
        />
        <Text style={styles.label}>
          Chế độ: <Text style={styles.value}>{getScanModeLabel(mode)}</Text>
        </Text>
        <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.75)" />
      </Pressable>

      {isActive ? (
        <Text style={styles.hint}>
          Quét là vào thẳng {getScanModeLabel(mode).toLowerCase()}
        </Text>
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
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillPressed: {
    opacity: 0.7,
  },
  label: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "500",
  },
  value: {
    color: "#fff",
    fontWeight: "700",
  },
  hint: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11.5,
    marginTop: 5,
    marginLeft: 4,
  },
});
