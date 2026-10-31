import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import CalendarDateSheet from "../../../components/dataPicker/shared/CalendarDateSheet";
import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";
import { elevation } from "../../../utils/helpers/tokens";

type Props = {
  /** "Tháng 10/2026" / "26/10 - 01/11/2026". */
  label: string;
  /** Ngày đang chọn — bảng chọn mở sẵn ở ngày này. */
  value: Date;
  /** Chọn xong: màn nhảy tới tháng / tuần của ngày đó và chọn ngày đó. */
  onPick: (date: Date) => void;
};

/**
 * Nhãn tháng / tuần giữa hai nút ‹ ›: viên có icon lịch, bấm mở lịch tháng
 * (`CalendarDateSheet`, chạm tiêu đề để chọn nhanh tháng / năm) để nhảy tới ngày
 * bất kỳ thay vì bấm ‹ › nhiều lần.
 */
export default function LichRangeLabel({ label, value, onPick }: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setOpen(true)}
        style={styles.pill}
        accessibilityRole="button"
        accessibilityLabel={`${label}, chọn ngày`}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="calendar" size={14} color={c.red} />
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Ionicons name="chevron-down" size={14} color={c.textSub} />
      </TouchableOpacity>

      <CalendarDateSheet
        visible={open}
        value={value}
        onCancel={() => setOpen(false)}
        onConfirm={(date) => {
          setOpen(false);
          onPick(date);
        }}
      />
    </>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    pill: {
      flexShrink: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      height: 38,
      paddingLeft: 6,
      paddingRight: 12,
      borderRadius: 19,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
      ...elevation(c.shadow, 1),
    },
    iconWrap: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.redSurface,
    },
    label: {
      flexShrink: 1,
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
    },
  });
