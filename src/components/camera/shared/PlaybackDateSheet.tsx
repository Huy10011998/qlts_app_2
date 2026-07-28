import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import BottomSheetModalShell from "../../shared/BottomSheetModalShell";
import { useAppColors, useStyles } from "../../../utils/helpers/colors";
import { makeStyles } from "../CameraPlayback.styles";
import PlaybackTimeSheet from "./PlaybackTimeSheet";
import {
  addMonths,
  formatClock,
  getCalendarDates,
  isSameDay,
  startOfDay,
  startOfMonth,
} from "./cameraPlaybackHelpers";

const WEEK_DAYS = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

type PlaybackDateSheetProps = {
  onClose: () => void;
  onConfirm: (date: Date, startTimeSec: number | null) => void;
  onVisibleMonthChange?: (date: Date) => void;
  recordingDays?: number[];
  selectedDate: Date;
  selectedStartTimeSec: number | null;
  today: Date;
  visible: boolean;
};

export default function PlaybackDateSheet({
  onClose,
  onConfirm,
  onVisibleMonthChange,
  recordingDays = [],
  selectedDate,
  selectedStartTimeSec,
  today,
  visible,
}: PlaybackDateSheetProps) {
  const c = useAppColors();
  const styles = useStyles(makeStyles);
  const [tempDate, setTempDate] = React.useState(selectedDate);
  const [tempStartTimeSec, setTempStartTimeSec] = React.useState<number | null>(
    selectedStartTimeSec,
  );
  const [isTimeSheetVisible, setIsTimeSheetVisible] = React.useState(false);
  const [visibleMonth, setVisibleMonth] = React.useState(() =>
    startOfMonth(selectedDate),
  );

  React.useEffect(() => {
    if (!visible) return;
    setTempDate(selectedDate);
    setTempStartTimeSec(selectedStartTimeSec);
    setVisibleMonth(startOfMonth(selectedDate));
  }, [selectedDate, selectedStartTimeSec, visible]);

  const calendarDates = React.useMemo(
    () => getCalendarDates(visibleMonth),
    [visibleMonth],
  );
  const canGoNextMonth =
    startOfMonth(visibleMonth).getTime() < startOfMonth(today).getTime();
  const monthLabel = `${visibleMonth.getFullYear()}-${String(
    visibleMonth.getMonth() + 1,
  ).padStart(2, "0")}`;
  const recordingDaySet = React.useMemo(
    () => new Set(recordingDays),
    [recordingDays],
  );

  const changeVisibleMonth = React.useCallback(
    (amount: number) => {
      setVisibleMonth((current) => {
        const next = addMonths(current, amount);
        onVisibleMonthChange?.(next);
        return next;
      });
    },
    [onVisibleMonthChange],
  );

  if (isTimeSheetVisible) {
    return (
      <PlaybackTimeSheet
        visible={visible}
        value={tempStartTimeSec}
        onClose={() => setIsTimeSheetVisible(false)}
        onConfirm={(seconds) => {
          setTempStartTimeSec(seconds);
          setIsTimeSheetVisible(false);
          onConfirm(tempDate, seconds);
        }}
      />
    );
  }

  return (
    <BottomSheetModalShell
      visible={visible}
      onClose={onClose}
      closeOnBackdropPress
      sheetStyle={styles.calendarSheet}
      statusBarTranslucent
    >
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          style={styles.calendarHeaderBtn}
          onPress={onClose}
          hitSlop={8}
          accessibilityLabel="Đóng lịch"
        >
          <Ionicons name="close" size={28} color={c.text} />
        </TouchableOpacity>

        <View style={styles.calendarMonthNav}>
          <TouchableOpacity
            style={styles.calendarMonthBtn}
            onPress={() => changeVisibleMonth(-1)}
            accessibilityLabel="Tháng trước"
          >
            <Ionicons name="chevron-back" size={22} color={c.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.calendarMonthText} allowFontScaling={false}>
            {monthLabel}
          </Text>
          <TouchableOpacity
            style={styles.calendarMonthBtn}
            disabled={!canGoNextMonth}
            onPress={() => changeVisibleMonth(1)}
            accessibilityLabel="Tháng sau"
          >
            <Ionicons
              name="chevron-forward"
              size={22}
              color={canGoNextMonth ? c.textSecondary : c.placeholder}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.calendarConfirmBtn}
          onPress={() => onConfirm(tempDate, tempStartTimeSec)}
          accessibilityLabel="Xác nhận ngày"
        >
          <Text style={styles.calendarConfirmText} allowFontScaling={false}>
            OK
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.calendarWeekRow}>
        {WEEK_DAYS.map((day) => (
          <Text
            key={day}
            style={styles.calendarWeekText}
            allowFontScaling={false}
          >
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {calendarDates.map((date) => {
          const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
          const isSelected = isSameDay(date, tempDate);
          const isFuture =
            startOfDay(date).getTime() > startOfDay(today).getTime();

          return (
            <TouchableOpacity
              key={date.toISOString()}
              style={styles.calendarDayCell}
              activeOpacity={0.75}
              disabled={isFuture}
              onPress={() => setTempDate(startOfDay(date))}
              accessibilityLabel={`Chọn ngày ${date.getDate()}`}
            >
              <View
                style={[
                  styles.calendarDayCircle,
                  isSelected && styles.calendarDaySelected,
                ]}
              >
                <Text
                  style={[
                    styles.calendarDayText,
                    (!isCurrentMonth || isFuture) &&
                      styles.calendarDayTextMuted,
                    isSelected && styles.calendarDayTextSelected,
                  ]}
                  allowFontScaling={false}
                >
                  {date.getDate()}
                </Text>
              </View>
              {isCurrentMonth &&
              !isFuture &&
              recordingDaySet.has(date.getDate()) ? (
                <View style={styles.calendarRecordingDot} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={styles.calendarStartTimeRow}
        onPress={() => setIsTimeSheetVisible(true)}
        activeOpacity={0.75}
        accessibilityLabel="Chọn thời gian bắt đầu"
      >
        <Text style={styles.calendarStartTimeLabel} allowFontScaling={false}>
          Thời gian bắt đầu
        </Text>
        <View style={styles.calendarStartTimeValueWrap}>
          <Text style={styles.calendarStartTimeValue} allowFontScaling={false}>
            {tempStartTimeSec === null
              ? "Chưa đặt"
              : formatClock(tempStartTimeSec)}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={c.placeholder} />
        </View>
      </TouchableOpacity>
    </BottomSheetModalShell>
  );
}
