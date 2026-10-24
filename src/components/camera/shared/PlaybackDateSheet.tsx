import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import CalendarPanel from "../../dataPicker/shared/CalendarPanel";
import PickerSheetFrame from "../../dataPicker/shared/PickerSheetFrame";
import { formatLongDate } from "../../dataPicker/shared/calendarGrid";
import {
  AppColors,
  C,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import PlaybackTimeSheet from "./PlaybackTimeSheet";
import { formatClock, startOfDay } from "./cameraPlaybackHelpers";

type PlaybackDateSheetProps = {
  onClose: () => void;
  onConfirm: (date: Date, startTimeSec: number | null) => void;
  /** Lịch chuyển sang tháng khác: nơi gọi nạp `recordingDays` của tháng đó. */
  onVisibleMonthChange?: (date: Date) => void;
  /** Các ngày (1–31) có bản ghi của tháng được nạp gần nhất. */
  recordingDays?: number[];
  selectedDate: Date;
  selectedStartTimeSec: number | null;
  today: Date;
  visible: boolean;
};

type MonthRef = { year: number; month: number };

const monthOf = (date: Date): MonthRef => ({
  year: date.getFullYear(),
  month: date.getMonth(),
});

/**
 * Chọn ngày + giờ bắt đầu xem lại camera. Cùng lịch với mọi ô ngày trong app;
 * riêng ở đây ngày tương lai bị khoá và ngày có bản ghi có chấm đỏ.
 *
 * Bấm "Thời gian bắt đầu" thì sheet giờ thế chỗ sheet lịch; xác nhận giờ là
 * xác nhận luôn cả ngày.
 */
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

  // Mở lại thì bắt đầu lại từ giá trị đang dùng; lịch dựng lại (key mới) để về
  // đúng tháng của ngày đang chọn.
  const [wasVisible, setWasVisible] = React.useState(visible);
  const [session, setSession] = React.useState(0);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setTempDate(selectedDate);
      setTempStartTimeSec(selectedStartTimeSec);
      setIsTimeSheetVisible(false);
      setSession((n) => n + 1);
    }
  }

  /**
   * `recordingDays` chỉ là số ngày, không kèm tháng — phải nhớ tháng nào vừa
   * nhờ nạp để chấm không lọt sang tháng khác. Nơi gọi tự nạp tháng của
   * `selectedDate`, nên đó là mốc ban đầu.
   */
  const markedMonthRef = React.useRef<MonthRef>(monthOf(selectedDate));
  const [markedMonth, setMarkedMonth] = React.useState(markedMonthRef.current);
  const showMonth = React.useCallback(
    (year: number, month: number) => {
      const current = markedMonthRef.current;
      if (current.year === year && current.month === month) return;
      markedMonthRef.current = { year, month };
      setMarkedMonth(markedMonthRef.current);
      onVisibleMonthChange?.(new Date(year, month, 1));
    },
    [onVisibleMonthChange],
  );

  // Lịch luôn mở (và dựng lại khi từ sheet giờ quay về) ở tháng của ngày đang
  // chọn; lần trước lật sang tháng khác rồi đóng thì chấm đang là của tháng đó
  // — nạp lại cho đúng. Chọn ngày thì vẫn trong tháng đang xem nên không nạp.
  React.useEffect(() => {
    if (!visible || isTimeSheetVisible) return;
    showMonth(tempDate.getFullYear(), tempDate.getMonth());
  }, [visible, isTimeSheetVisible, tempDate, showMonth]);

  const recordingDaySet = React.useMemo(
    () => new Set(recordingDays),
    [recordingDays],
  );
  const isMarked = React.useCallback(
    (date: Date) =>
      date.getFullYear() === markedMonth.year &&
      date.getMonth() === markedMonth.month &&
      recordingDaySet.has(date.getDate()),
    [markedMonth, recordingDaySet],
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
    <PickerSheetFrame
      visible={visible}
      title="Ngày xem lại"
      headline={formatLongDate(tempDate)}
      onCancel={onClose}
      onConfirm={() => onConfirm(tempDate, tempStartTimeSec)}
    >
      <CalendarPanel
        key={session}
        value={tempDate}
        onChange={(date) => setTempDate(startOfDay(date))}
        maxDate={today}
        isMarked={isMarked}
        onVisibleMonthChange={showMonth}
      />

      <View style={styles.legendRow}>
        <View style={styles.legendDot} />
        <Text style={styles.legendText}>Ngày có bản ghi</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.startTimeRow, pressed && styles.pressed]}
        onPress={() => setIsTimeSheetVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Chọn thời gian bắt đầu"
      >
        <Ionicons name="time-outline" size={20} color={c.textSecondary} />
        <Text style={styles.startTimeLabel}>Thời gian bắt đầu</Text>
        <Text style={styles.startTimeValue}>
          {tempStartTimeSec === null ? "Chưa đặt" : formatClock(tempStartTimeSec)}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={c.placeholder} />
      </Pressable>
    </PickerSheetFrame>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    legendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 8,
      marginTop: 2,
    },
    legendDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: C.red,
    },
    legendText: {
      fontSize: 12,
      color: c.textSub,
    },
    startTimeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 12,
      paddingHorizontal: 14,
      minHeight: 52,
      borderRadius: 14,
      backgroundColor: c.surfaceAlt,
    },
    pressed: {
      opacity: 0.7,
    },
    startTimeLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: c.text,
    },
    startTimeValue: {
      fontSize: 15,
      fontWeight: "600",
      color: c.textSecondary,
      fontVariant: ["tabular-nums"],
    },
  });
