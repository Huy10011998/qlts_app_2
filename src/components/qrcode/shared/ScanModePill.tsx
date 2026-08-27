import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { ScanMode } from "../../../context/ScanModeContext";

type ScanModePillProps = {
  mode: ScanMode;
  onPress: () => void;
};

const ACCENT = "#22C55E";

/**
 * Nhãn của chế độ, dùng chung cho pill, bảng chọn và câu báo khi không chạy được.
 *
 * Chế độ `action` tự mang nhãn của nó (nhớ lúc người dùng chọn trên một tài sản
 * thật) — app không còn bảng nào để tra tên việc nữa.
 */
export const getScanModeLabel = (mode: ScanMode) => {
  switch (mode.state) {
    case "action":
      return mode.label;
    case "ask":
      return "Chọn khi quét";
    default:
      return "Xem thông tin";
  }
};

export const getScanModeIcon = (mode: ScanMode) => {
  switch (mode.state) {
    case "action":
      return mode.icon || "ellipsis-horizontal-circle-outline";
    case "ask":
      return "help-circle-outline";
    default:
      return "information-circle-outline";
  }
};

/**
 * Chế độ quét đang bật, ngay trên màn quét.
 *
 * Luôn hiện — người dùng phải biết quét xong sẽ xảy ra chuyện gì TRƯỚC khi quét,
 * và đổi việc phải trong một tap chứ không phải đi tìm trong Cài đặt. Đây cũng là
 * đường quay lại duy nhất khi lỡ chốt nhầm việc.
 *
 * Màu chốt cứng theo bộ chrome tối của màn quét, không lấy theo theme.
 */
export default function ScanModePill({ mode, onPress }: ScanModePillProps) {
  const isRunningAction = mode.state === "action";

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
          color={isRunningAction ? ACCENT : "rgba(255,255,255,0.75)"}
        />
        {/* Nhãn là moTa của class con nên có thể dài — cắt chứ không xuống dòng
            làm méo pill. */}
        <Text style={styles.label} numberOfLines={1}>
          Chế độ: <Text style={styles.value}>{getScanModeLabel(mode)}</Text>
        </Text>
        <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.75)" />
      </Pressable>

      {isRunningAction ? (
        <Text style={styles.hint}>
          Quét là vào thẳng {getScanModeLabel(mode).toLowerCase()}
        </Text>
      ) : null}

      {mode.state === "ask" ? (
        <Text style={styles.hint}>Quét xong sẽ hỏi bạn muốn làm gì</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-start",
    marginTop: 10,
    // Pill co lại theo bề rộng màn, không đẩy tràn ra ngoài header.
    maxWidth: "100%",
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
    flexShrink: 1,
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
