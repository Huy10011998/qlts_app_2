import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { CongViecItem } from "../../../types/index";
import { AppColors, useStyles } from "../../../utils/helpers/colors";
import { getMaMauColor } from "../shared/workflowConstants";
import { isSameDay } from "../shared/workflowDate";
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
  const today = new Date();
  const weeks: Date[][] = [];
  for (let i = 0; i < range.days.length; i += 7) weeks.push(range.days.slice(i, i + 7));

  return (
    <View style={styles.grid}>
      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label, index) => (
          <Text key={label} style={[styles.weekday, index === 6 && styles.sunday]}>
            {label}
          </Text>
        ))}
      </View>

      {weeks.map((week) => (
        <View key={dayKey(week[0])} style={styles.weekRow}>
          {week.map((day) => {
            const tasks = tasksByDay.get(dayKey(day)) ?? [];
            const outside = day.getMonth() !== anchor.getMonth();
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selected);
            const extra = tasks.length - MAX_BARS;

            return (
              <TouchableOpacity
                key={dayKey(day)}
                activeOpacity={0.7}
                onPress={() => onSelect(day)}
                style={[styles.cell, isSelected && styles.cellSelected]}
              >
                <View style={[styles.dayBadge, isToday && styles.todayBadge]}>
                  <Text
                    style={[
                      styles.dayText,
                      outside && styles.outsideText,
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
                  {extra > 0 ? <Text style={styles.more}>+{extra}</Text> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    grid: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 6,
    },
    weekRow: {
      flexDirection: "row",
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
      minHeight: 64,
      alignItems: "center",
      paddingTop: 4,
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
    todayText: {
      color: "#FFFFFF",
    },
    bars: {
      alignSelf: "stretch",
      marginTop: 3,
      gap: 2,
    },
    bar: {
      height: 5,
      borderRadius: 3,
    },
    loaiBorder: {
      borderLeftWidth: 3,
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
