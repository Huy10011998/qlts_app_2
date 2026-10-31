import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { CongViecItem } from "../../../types/index";
import { AppColors, useStyles } from "../../../utils/helpers/colors";
import { getHomeCardChrome } from "../../Home/shared/homeBlockTone";
import { getMaMauColor } from "../shared/workflowConstants";
import { isSameDay, startOfDay } from "../shared/workflowDate";
import { getNgayLe } from "./amLich";
import { selectionHaptic } from "./lichHaptic";
import { dayKey, LichRange, WEEKDAY_LABELS } from "./lichHelpers";

type Props = {
  anchor: Date;
  range: LichRange;
  tasksByDay: Map<string, CongViecItem[]>;
  selected: Date;
  onSelect: (day: Date) => void;
};

/** Ô ngày mobile hẹp (~50pt) nên mỗi việc là một vạch màu, quá số vạch thì "+n". */
const MAX_BARS = 3;

/** Lưới tháng (tuần bắt đầu thứ Hai), gồm vài ngày tháng trước / sau đang lộ ra. */
export default function MonthGrid({ anchor, range, tasksByDay, selected, onSelect }: Props) {
  const styles = useStyles(makeStyles);
  const today = startOfDay(new Date());
  const weeks: Date[][] = [];
  for (let i = 0; i < range.days.length; i += 7) weeks.push(range.days.slice(i, i + 7));

  return (
    <View style={styles.grid}>
      <View style={[styles.weekRow, styles.headerRow]}>
        {WEEKDAY_LABELS.map((label, index) => (
          <Text key={label} style={[styles.weekday, index === 6 && styles.sunday]}>
            {label}
          </Text>
        ))}
      </View>

      <View>
        {/* Một dải nền liền sau cột T7 + CN, nằm dưới các ô. */}
        <View style={styles.weekendBand} pointerEvents="none" />
        {weeks.map((week) => (
          <View key={dayKey(week[0])} style={styles.weekRow}>
            {week.map((day) => {
              const tasks = tasksByDay.get(dayKey(day)) ?? [];
              const outside = day.getMonth() !== anchor.getMonth();
              const isToday = isSameDay(day, today);
              // Chỉ số ngày mờ đi; vạch giữ nguyên để việc quá hạn vẫn nổi.
              const isPast = !outside && day < today;
              const isHoliday = !outside && !!getNgayLe(day);
              const isSelected = isSameDay(day, selected);
              const extra = tasks.length - MAX_BARS;

              return (
                <TouchableOpacity
                  key={dayKey(day)}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (!isSelected) selectionHaptic();
                    onSelect(day);
                  }}
                  style={[styles.cell, isSelected && styles.cellSelected]}
                >
                  <View style={[styles.dayBadge, isToday && styles.todayBadge]}>
                    <Text
                      style={[
                        styles.dayText,
                        outside && styles.outsideText,
                        isPast && styles.pastText,
                        isHoliday && styles.holidayText,
                        isToday && styles.todayText,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </View>
                  <View style={styles.bars}>
                    {tasks.slice(0, MAX_BARS).map((task) => (
                      <View
                        key={task.id}
                        style={[
                          styles.bar,
                          { backgroundColor: getMaMauColor(task.maMau) },
                          task.mauLoai ? [styles.loaiBorder, { borderLeftColor: task.mauLoai }] : null,
                          outside && styles.outsideBar,
                        ]}
                      />
                    ))}
                    {extra > 0 ? (
                      <Text style={styles.more} numberOfLines={1}>
                        +{extra}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    // Viền + mép trên đỏ như card Trang chủ: đỏ là màu nhấn của cả màn Lịch
    // (hôm nay, ngày đang chọn, nút Hôm nay).
    grid: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 6,
      ...getHomeCardChrome({
        borderColor: c.red,
        shadowColor: c.shadow,
        accent: c.red,
      }),
    },
    weekRow: {
      flexDirection: "row",
    },
    headerRow: {
      marginBottom: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
    },
    weekendBand: {
      position: "absolute",
      top: 0,
      bottom: 0,
      right: 0,
      width: `${(2 / 7) * 100}%`,
      borderRadius: 10,
      backgroundColor: c.surfaceAlt,
    },
    weekday: {
      flex: 1,
      textAlign: "center",
      fontSize: 12,
      fontWeight: "700",
      color: c.textSub,
      paddingVertical: 6,
    },
    sunday: {
      color: c.red,
    },
    cell: {
      flex: 1,
      // Cao theo nội dung: hàng tuần tự giãn theo ô nhiều việc nhất, tuần trống
      // thì gọn lại. Đệm dưới giữ chữ "+n" khỏi chạm viền ô đang chọn.
      minHeight: 48,
      alignItems: "center",
      paddingTop: 4,
      paddingBottom: 5,
      paddingHorizontal: 2,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    cellSelected: {
      borderColor: c.red,
      backgroundColor: c.redSurface,
    },
    dayBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
    },
    todayBadge: {
      backgroundColor: c.red,
    },
    dayText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.text,
    },
    outsideText: {
      color: c.textMuted,
    },
    // Đậm hơn ngày ngoài tháng (textMuted) để vẫn thấy tháng bắt đầu từ đâu.
    pastText: {
      color: c.slate,
    },
    // Ngày lễ đỏ như nhãn CN; tên lễ ghi trên thẻ ngày bên dưới.
    holidayText: {
      color: c.red,
    },
    todayText: {
      color: "#FFFFFF",
    },
    bars: {
      alignSelf: "stretch",
      marginTop: 3,
      gap: 3,
    },
    // Vạch 5pt khó nhìn màu, nhất là phần màu loại việc ở đầu vạch.
    bar: {
      height: 6,
      borderRadius: 3,
    },
    loaiBorder: {
      borderLeftWidth: 4,
    },
    outsideBar: {
      opacity: 0.45,
    },
    more: {
      fontSize: 10,
      fontWeight: "700",
      color: c.textSub,
      textAlign: "center",
    },
  });
