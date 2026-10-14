import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import { COMPACT_TEXT_MAX_SCALE } from "../../../../utils/helpers/textScaling";

type Props = {
  icon: string;
  iconSize: number;
  count: number;
  /** Đọc cho trình đọc màn hình, kèm số: "Bình luận (2)". */
  label: string;
  /** Không truyền thì chỉ là chữ — bấm vào rơi xuống thẻ bên dưới. */
  onPress?: () => void;
  /** Viên mờ, không bấm được — như nút cùng tên ở màn chi tiết đang tắt. */
  disabled?: boolean;
};

/**
 * Số bình luận / số file ở chân thẻ phiếu và thẻ công việc. Có `onPress` thì
 * thành viên đỏ nhạt viền đỏ — cùng kiểu nút "Bình luận (n)" ở màn chi tiết để
 * người dùng nhận ra bấm được — mở thẳng màn Bình luận / File, khỏi vào chi tiết.
 */
export default function WorkflowCounter({
  icon,
  iconSize,
  count,
  label,
  onPress,
  disabled,
}: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const pillContent = (
    <>
      <Ionicons name={icon} size={iconSize + 3} color={c.red} />
      <Text style={styles.pillText} maxFontSizeMultiplier={COMPACT_TEXT_MAX_SCALE}>
        {count}
      </Text>
    </>
  );

  if (disabled) {
    return (
      <View
        style={[styles.pill, styles.pillDisabled]}
        accessibilityLabel={`${label} (${count})`}
        accessibilityState={{ disabled: true }}
      >
        {pillContent}
      </View>
    );
  }

  if (!onPress) {
    return (
      <View style={styles.counter}>
        <Ionicons name={icon} size={iconSize} color={c.textSub} />
        <Text style={styles.text}>{count}</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.6}
      hitSlop={6}
      onPress={onPress}
      style={styles.pill}
      accessibilityRole="button"
      accessibilityLabel={`${label} (${count})`}
    >
      {pillContent}
    </TouchableOpacity>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    counter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    text: {
      fontSize: 12,
      color: c.textSub,
    },
    // Cao bằng nút compact (Duyệt / Từ chối) để chân thẻ thẳng hàng.
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      minHeight: 30,
      paddingHorizontal: 9,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: c.redBorder,
      backgroundColor: c.redSurface,
    },
    // Cùng độ mờ với WorkflowButton đang tắt.
    pillDisabled: {
      opacity: 0.5,
    },
    pillText: {
      fontSize: 13,
      fontWeight: "700",
      color: c.red,
    },
  });
