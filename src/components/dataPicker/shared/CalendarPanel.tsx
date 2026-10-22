import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { pickerTickHaptic } from "./pickerHaptic";
import {
  buildMonthCells,
  clampDay,
  DayLimits,
  dayKey,
  formatLongDate,
  formatMonthTitle,
  isDayOutOfRange,
  isMonthOutOfRange,
  isSameDay,
  isYearOutOfRange,
  makeDay,
  shiftMonth,
  SUNDAY_COLUMN,
  WEEKDAY_LABELS,
  withYearMonth,
  YEAR_PAGE_SIZE,
  yearPageStartFor,
} from "./calendarGrid";
import {
  AppColors,
  C,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import { useReduceMotion } from "../../../hooks/useReduceMotion";

/**
 * Cấp chọn cuối cùng: `day` (mặc định) — chọn tháng/năm chỉ để đi tới ngày;
 * `month` / `year` — bấm ô tháng / năm là chọn luôn (Điện mặt trời theo tháng,
 * theo năm).
 */
export type CalendarPickLevel = "day" | "month" | "year";

type CalendarPanelProps = DayLimits & {
  /** Ngày đang chọn (với cấp tháng / năm: ngày bất kỳ trong tháng / năm đó). */
  value: Date;
  onChange: (date: Date) => void;
  pickLevel?: CalendarPickLevel;
  /**
   * Tô dải nền cho cả khoảng (tuần của Điện mặt trời). Bỏ trống thì chỉ khoanh
   * tròn ngày `value`.
   */
  range?: { from: Date; to: Date } | null;
  /** Chấm nhỏ dưới số ngày (Camera xem lại: ngày có bản ghi). */
  isMarked?: (date: Date) => boolean;
  /** Lưới ngày vừa chuyển sang tháng khác (không gọi lúc mở). */
  onVisibleMonthChange?: (year: number, month: number) => void;
};

type ViewMode = "days" | "months" | "years";

const ROW_HEIGHT = 46;
const CIRCLE_SIZE = 40;
const WEEKDAY_ROW_HEIGHT = 30;
/** Lưới ngày cao cố định 6 hàng; lưới tháng / năm dùng chung chiều cao này. */
const GRID_HEIGHT = WEEKDAY_ROW_HEIGHT + ROW_HEIGHT * 6;
/** Vuốt ngang quá ngần này thì lật trang. */
const SWIPE_DISTANCE = 40;

const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => `Tháng ${i + 1}`);
const MODE_FOR_LEVEL: Record<CalendarPickLevel, ViewMode> = {
  day: "days",
  month: "months",
  year: "years",
};
const TODAY_LABELS: Record<CalendarPickLevel, string> = {
  day: "Hôm nay",
  month: "Tháng này",
  year: "Năm nay",
};

const today = () => {
  const now = new Date();
  return makeDay(now.getFullYear(), now.getMonth(), now.getDate());
};

/**
 * Lịch tháng dùng chung của mọi bộ chọn ngày trong app (ô ngày của form, lịch
 * Điện mặt trời, Camera xem lại).
 *
 * Bấm tiêu đề để chuyển ngày → tháng → năm; vuốt ngang để lật trang. Ngày ngoài
 * `minDate` / `maxDate` mờ đi và không bấm được, trang nằm trọn ngoài khoảng thì
 * không lật tới.
 *
 * Trạng thái xem (tháng nào, lưới nào) chỉ khởi tạo lúc mount — nơi dùng đặt
 * `key` mới mỗi lần mở để bắt đầu lại từ `value`.
 */
export default function CalendarPanel({
  value,
  onChange,
  pickLevel = "day",
  range,
  minDate,
  maxDate,
  isMarked,
  onVisibleMonthChange,
}: CalendarPanelProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const noMotion = useReduceMotion() === true;
  const limits: DayLimits = { minDate, maxDate };

  const [mode, setMode] = useState<ViewMode>(MODE_FOR_LEVEL[pickLevel]);
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [yearPageStart, setYearPageStart] = useState(
    yearPageStartFor(value.getFullYear())
  );

  const now = today();
  const todayAllowed = !isDayOutOfRange(now, limits);
  const cells = useMemo(
    () => buildMonthCells(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  // Báo tháng của lưới ngày cho nơi dùng (Camera tải ngày có bản ghi theo
  // tháng). Ghi nhớ tháng đã báo để không báo trùng.
  const reportedRef = useRef({ year: viewYear, month: viewMonth });
  const setView = (year: number, month: number) => {
    setViewYear(year);
    setViewMonth(month);
    const reported = reportedRef.current;
    if (reported.year !== year || reported.month !== month) {
      reportedRef.current = { year, month };
      onVisibleMonthChange?.(year, month);
    }
  };

  // -1: nội dung mới trượt vào từ trái, 1: từ phải, 0: đứng yên.
  const slide = useRef(new Animated.Value(0)).current;
  const playSlide = (direction: number) => {
    if (noMotion) return;
    slide.setValue(direction);
    Animated.timing(slide, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const canGo = (delta: number) => {
    if (mode === "days") {
      const next = shiftMonth(viewYear, viewMonth, delta);
      return !isMonthOutOfRange(next.year, next.month, limits);
    }
    if (mode === "months") return !isYearOutOfRange(viewYear + delta, limits);

    const start = yearPageStart + delta * YEAR_PAGE_SIZE;
    const end = start + YEAR_PAGE_SIZE - 1;
    return !(
      (minDate && end < minDate.getFullYear()) ||
      (maxDate && start > maxDate.getFullYear())
    );
  };

  const goPage = (delta: number) => {
    if (!canGo(delta)) return;
    if (mode === "days") {
      const next = shiftMonth(viewYear, viewMonth, delta);
      setView(next.year, next.month);
    } else if (mode === "months") {
      setViewYear((y) => y + delta);
    } else {
      setYearPageStart((y) => y + delta * YEAR_PAGE_SIZE);
    }
    playSlide(delta);
  };

  // PanResponder đọc hàm qua ref: nó chỉ được tạo một lần, còn `goPage` đổi
  // theo mỗi lần render.
  const goPageRef = useRef(goPage);
  goPageRef.current = goPage;
  const swipe = useRef(
    PanResponder.create({
      // Chỉ giành cử chỉ khi đã rõ là vuốt ngang — chạm nhẹ vẫn là bấm ngày.
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx <= -SWIPE_DISTANCE) goPageRef.current(1);
        else if (g.dx >= SWIPE_DISTANCE) goPageRef.current(-1);
      },
    })
  ).current;

  const selectDay = (date: Date) => {
    if (isDayOutOfRange(date, limits)) return;
    if (!isSameDay(date, value)) pickerTickHaptic();
    onChange(date);
  };

  const selectMonth = (month: number) => {
    if (isMonthOutOfRange(viewYear, month, limits)) return;
    pickerTickHaptic();
    if (pickLevel === "month") {
      onChange(makeDay(viewYear, month, 1));
      return;
    }
    onChange(clampDay(withYearMonth(value, viewYear, month), limits));
    setView(viewYear, month);
    setMode("days");
  };

  const selectYear = (year: number) => {
    if (isYearOutOfRange(year, limits)) return;
    pickerTickHaptic();
    if (pickLevel === "year") {
      onChange(makeDay(year, 0, 1));
      return;
    }
    setViewYear(year);
    setMode("months");
  };

  const goToday = () => {
    pickerTickHaptic();
    const year = now.getFullYear();
    if (pickLevel === "year") {
      onChange(makeDay(year, 0, 1));
      setYearPageStart(yearPageStartFor(year));
      setMode("years");
    } else if (pickLevel === "month") {
      onChange(makeDay(year, now.getMonth(), 1));
      setViewYear(year);
      setMode("months");
    } else {
      onChange(now);
      setView(year, now.getMonth());
      setMode("days");
    }
  };

  const toggleMode = () => {
    if (mode === "years") {
      setMode(pickLevel === "month" ? "months" : "days");
    } else if (mode === "months") {
      setYearPageStart(yearPageStartFor(viewYear));
      setMode("years");
    } else {
      setMode("months");
    }
  };

  const showingToday =
    pickLevel === "year"
      ? value.getFullYear() === now.getFullYear() &&
        now.getFullYear() >= yearPageStart &&
        now.getFullYear() < yearPageStart + YEAR_PAGE_SIZE
      : pickLevel === "month"
      ? mode === "months" &&
        viewYear === now.getFullYear() &&
        value.getFullYear() === now.getFullYear() &&
        value.getMonth() === now.getMonth()
      : mode === "days" &&
        isSameDay(value, now) &&
        viewYear === now.getFullYear() &&
        viewMonth === now.getMonth();

  const navTitle =
    mode === "days"
      ? formatMonthTitle(viewYear, viewMonth)
      : mode === "months"
      ? `Năm ${viewYear}`
      : `${yearPageStart} – ${yearPageStart + YEAR_PAGE_SIZE - 1}`;
  // Chọn theo năm thì không còn cấp nào để chuyển.
  const canToggle = pickLevel !== "year";
  const canPrev = canGo(-1);
  const canNext = canGo(1);

  const slideStyle = {
    opacity: slide.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [0, 1, 0],
    }),
    transform: [
      {
        translateX: slide.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-28, 0, 28],
        }),
      },
    ],
  };

  const fromKey = dayKey(range ? range.from : value);
  const toKey = dayKey(range ? range.to : value);
  const hasBand = fromKey !== toKey;

  const options =
    mode === "months"
      ? MONTH_LABELS.map((label, month) => ({
          key: label,
          label,
          selected:
            value.getFullYear() === viewYear && value.getMonth() === month,
          current: now.getFullYear() === viewYear && now.getMonth() === month,
          disabled: isMonthOutOfRange(viewYear, month, limits),
          onPress: () => selectMonth(month),
        }))
      : Array.from({ length: YEAR_PAGE_SIZE }, (_, i) => {
          const year = yearPageStart + i;
          return {
            key: String(year),
            label: String(year),
            selected: value.getFullYear() === year,
            current: now.getFullYear() === year,
            disabled: isYearOutOfRange(year, limits),
            onPress: () => selectYear(year),
          };
        });

  return (
    <View>
      <View style={styles.navRow}>
        <Pressable
          onPress={canToggle ? toggleMode : undefined}
          disabled={!canToggle}
          hitSlop={6}
          accessibilityRole={canToggle ? "button" : "header"}
          accessibilityLabel={
            canToggle ? `${navTitle}, đổi cách chọn` : navTitle
          }
          style={({ pressed }) => [
            styles.navTitleButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.navTitle}>{navTitle}</Text>
          {canToggle ? (
            <Ionicons
              name={mode === MODE_FOR_LEVEL[pickLevel] ? "chevron-down" : "chevron-up"}
              size={18}
              color={c.textSecondary}
            />
          ) : null}
        </Pressable>

        <View style={styles.navActions}>
          {showingToday || !todayAllowed ? null : (
            <Pressable
              onPress={goToday}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.todayChip,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.todayChipText}>{TODAY_LABELS[pickLevel]}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => goPage(-1)}
            disabled={!canPrev}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Trang trước"
            accessibilityState={{ disabled: !canPrev }}
            style={({ pressed }) => [
              styles.arrowButton,
              pressed && styles.arrowPressed,
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={canPrev ? c.text : c.placeholder}
            />
          </Pressable>
          <Pressable
            onPress={() => goPage(1)}
            disabled={!canNext}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Trang sau"
            accessibilityState={{ disabled: !canNext }}
            style={({ pressed }) => [
              styles.arrowButton,
              pressed && styles.arrowPressed,
            ]}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={canNext ? c.text : c.placeholder}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.gridArea} {...swipe.panHandlers}>
        <Animated.View style={[styles.gridArea, slideStyle]}>
          {mode === "days" ? (
            <>
              <View style={styles.weekRow}>
                {WEEKDAY_LABELS.map((label, column) => (
                  <Text
                    key={label}
                    style={[
                      styles.weekLabel,
                      column === SUNDAY_COLUMN && styles.sundayText,
                    ]}
                  >
                    {label}
                  </Text>
                ))}
              </View>
              <View style={styles.dayGrid}>
                {cells.map((date, index) => {
                  if (!date) {
                    return <View key={`blank-${index}`} style={styles.dayCell} />;
                  }

                  const key = dayKey(date);
                  const isStart = key === fromKey;
                  const isEnd = key === toKey;
                  const selected = isStart || isEnd;
                  const inBand = hasBand && key >= fromKey && key <= toKey;
                  const disabled = isDayOutOfRange(date, limits);
                  const isToday = isSameDay(date, now);
                  const isSunday = index % 7 === SUNDAY_COLUMN;
                  const marked = !!isMarked?.(date);

                  return (
                    <Pressable
                      key={date.getDate()}
                      onPress={() => selectDay(date)}
                      disabled={disabled}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled }}
                      accessibilityLabel={formatLongDate(date)}
                      style={styles.dayCell}
                    >
                      {({ pressed }) => (
                        <>
                          {inBand ? (
                            <View
                              style={[
                                styles.band,
                                isStart && styles.bandStart,
                                isEnd && styles.bandEnd,
                              ]}
                            />
                          ) : null}
                          <View
                            style={[
                              styles.dayCircle,
                              isToday && !disabled && styles.todayCircle,
                              pressed && !selected && styles.dayPressed,
                              selected && styles.selectedCircle,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayText,
                                isSunday && styles.sundayText,
                                isToday && styles.todayText,
                                disabled && styles.disabledText,
                                selected && styles.selectedText,
                              ]}
                            >
                              {date.getDate()}
                            </Text>
                            {marked ? (
                              <View
                                testID="calendar-mark"
                                style={[
                                  styles.markDot,
                                  selected && styles.markDotSelected,
                                ]}
                              />
                            ) : null}
                          </View>
                        </>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <View style={styles.optionGrid}>
              {options.map((option) => (
                <View key={option.key} style={styles.optionCell}>
                  <Pressable
                    onPress={option.onPress}
                    disabled={option.disabled}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: option.selected,
                      disabled: option.disabled,
                    }}
                    style={({ pressed }) => [
                      styles.optionPill,
                      option.current && !option.disabled && styles.optionCurrent,
                      option.disabled && styles.optionDisabled,
                      pressed && styles.pressed,
                      option.selected && styles.selectedCircle,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        option.current && styles.todayText,
                        option.disabled && styles.disabledText,
                        option.selected && styles.selectedText,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    navRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingLeft: 8,
      marginBottom: 6,
    },
    navTitleButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 8,
      paddingRight: 8,
      flexShrink: 1,
    },
    navTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
    },
    navActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    todayChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.redSurface,
      marginRight: 4,
    },
    todayChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: C.red,
    },
    arrowButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
    },
    arrowPressed: {
      backgroundColor: c.surfaceAlt,
    },
    pressed: {
      opacity: 0.6,
    },
    gridArea: {
      height: GRID_HEIGHT,
    },
    weekRow: {
      flexDirection: "row",
      height: WEEKDAY_ROW_HEIGHT,
      alignItems: "center",
    },
    weekLabel: {
      flex: 1,
      textAlign: "center",
      fontSize: 12,
      fontWeight: "600",
      color: c.textMuted,
    },
    dayGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    dayCell: {
      width: `${100 / 7}%`,
      height: ROW_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
    },
    // Dải nền của khoảng ngày: cao bằng vòng tròn, nằm sau nó. Ô đầu / cuối chỉ
    // tô nửa phía trong để dải bắt đầu và kết thúc đúng tâm vòng tròn.
    band: {
      position: "absolute",
      top: (ROW_HEIGHT - CIRCLE_SIZE) / 2,
      height: CIRCLE_SIZE,
      left: 0,
      right: 0,
      backgroundColor: c.redSurface,
    },
    bandStart: {
      left: "50%",
    },
    bandEnd: {
      right: "50%",
    },
    dayCircle: {
      width: CIRCLE_SIZE,
      height: CIRCLE_SIZE,
      borderRadius: CIRCLE_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    dayPressed: {
      backgroundColor: c.surfaceAlt,
    },
    todayCircle: {
      borderWidth: 1.5,
      borderColor: C.red,
    },
    selectedCircle: {
      backgroundColor: C.red,
      borderColor: C.red,
    },
    dayText: {
      fontSize: 15,
      fontWeight: "500",
      color: c.text,
      fontVariant: ["tabular-nums"],
    },
    sundayText: {
      color: C.red,
    },
    todayText: {
      color: C.red,
      fontWeight: "700",
    },
    disabledText: {
      color: c.textMuted,
      fontWeight: "400",
      opacity: 0.5,
    },
    selectedText: {
      color: C.onBrand,
      fontWeight: "700",
      opacity: 1,
    },
    markDot: {
      position: "absolute",
      bottom: 5,
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: C.red,
    },
    markDotSelected: {
      backgroundColor: C.onBrand,
    },
    optionGrid: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      alignContent: "space-around",
      paddingVertical: 8,
    },
    optionCell: {
      width: "33.333%",
      paddingHorizontal: 6,
      paddingVertical: 6,
    },
    optionPill: {
      height: 48,
      borderRadius: 14,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    optionCurrent: {
      borderWidth: 1.5,
      borderColor: C.red,
    },
    optionDisabled: {
      backgroundColor: "transparent",
    },
    optionText: {
      fontSize: 15,
      fontWeight: "600",
      color: c.text,
    },
  });
