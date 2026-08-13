import {
  useAppColors,
  useSeparatorColor,
  useStyles,
} from "../../utils/helpers/colors";
import React, { type ComponentProps, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Text as NativeText,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import {
  addMonths,
  formatDateRangeLabel,
  formatDisplayDate,
  getCalendarDates,
  getDateRangeForPeriod,
  getYearGridStart,
  getYearGridYears,
  isDateInRange,
  isFutureDate,
  isFutureDateRange,
  isFutureMonth,
  isFutureYear,
  isSameDate,
  PERIOD_TAB_LABELS,
  PERIOD_TABS,
  startOfDay,
  startOfMonth,
  type PeriodTab,
  type SolarDateRange,
} from "./SolarPlantScreen.helpers";
import { makeStyles } from "./SolarPlantScreen.styles";
import {
  DateCalendarIcon,
  DateChevron,
  DateSkipIcon,
} from "./SolarPlantScreen.visuals";

type SolarTextProps = ComponentProps<typeof NativeText>;

const Text: React.FC<SolarTextProps> = (props) => (
  <NativeText {...props} allowFontScaling={false} />
);

/**
 * Cỡ chữ của hàng 5 tab kỳ, chọn theo bề ngang màn hình.
 *
 * Tính một lần cho cả hàng thay vì để mỗi nhãn tự co (`adjustsFontSizeToFit`):
 * để tự co thì chỉ nhãn dài mới nhỏ lại, cả hàng thành mỗi chữ một cỡ. Vẫn giữ
 * `adjustsFontSizeToFit` làm lưới an toàn cho máy hẹp bất thường.
 */
export const getPeriodTabFontSize = (screenWidth: number) => {
  if (screenWidth >= 400) return 13;
  if (screenWidth >= 360) return 12;

  return 11;
};

type PeriodHeaderProps = {
  activeTab: PeriodTab;
  canGoNextRange: boolean;
  isCurrentRange: boolean;
  onChangeTab: (tab: PeriodTab) => void;
  onGoCurrentRange: () => void;
  dateRange: SolarDateRange;
  onNextRange: () => void;
  onOpenDatePicker: () => void;
  onPreviousRange: () => void;
};

export const PeriodHeader: React.FC<PeriodHeaderProps> = ({
  activeTab,
  canGoNextRange,
  dateRange,
  isCurrentRange,
  onChangeTab,
  onGoCurrentRange,
  onNextRange,
  onOpenDatePicker,
  onPreviousRange,
}) => {
  const styles = useStyles(makeStyles);
  const separatorColor = useSeparatorColor();
  const { width: screenWidth } = useWindowDimensions();
  const tabFontSize = getPeriodTabFontSize(screenWidth);

  return (
    <View style={styles.stickyPeriodHeader}>
      <View style={styles.tabBar}>
        {PERIOD_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => onChangeTab(tab)}
            style={styles.tabItem}
          >
            {/* Tab thường và tab đang chọn dùng CHUNG một lớp đệm, chỉ khác nền.
                Trước đây chỉ tab đang chọn mới có đệm nên riêng nó hụt mất 20px
                bề ngang, đủ để "Tháng này" xuống dòng trong khi các tab khác thì
                không. */}
            <View
              style={[
                styles.tabChip,
                activeTab === tab && styles.tabChipActive,
              ]}
            >
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                numberOfLines={1}
                style={[
                  styles.tabText,
                  { fontSize: tabFontSize },
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {PERIOD_TAB_LABELS[tab]}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <View
        style={[
          styles.dateNav,
          { borderTopColor: separatorColor, borderBottomColor: separatorColor },
        ]}
      >
        <TouchableOpacity
          style={styles.dateNavSide}
          activeOpacity={0.7}
          onPress={onPreviousRange}
        >
          <DateChevron direction="left" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateNavCenter}
          activeOpacity={0.7}
          onPress={onOpenDatePicker}
        >
          <DateCalendarIcon />
          <Text style={styles.dateNavCenterText}>
            {formatDateRangeLabel(dateRange, activeTab)}
          </Text>
        </TouchableOpacity>

        <View style={[styles.dateNavSide, styles.dateNavRight]}>
          <TouchableOpacity
            style={[
              styles.dateNavIconButton,
              isCurrentRange && styles.dateNavIconButtonDisabled,
            ]}
            activeOpacity={0.7}
            disabled={!canGoNextRange}
            onPress={onNextRange}
          >
            <DateChevron direction="right" muted={isCurrentRange} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.dateNavIconButton,
              isCurrentRange && styles.dateNavIconButtonDisabled,
            ]}
            activeOpacity={0.7}
            onPress={onGoCurrentRange}
          >
            <DateSkipIcon muted={isCurrentRange} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

type SolarDateRangePickerProps = {
  dateRange: SolarDateRange;
  onCancel: () => void;
  onConfirm: (dateRange: SolarDateRange) => void;
  period: PeriodTab;
  visible: boolean;
};

export const SolarDateRangePicker: React.FC<SolarDateRangePickerProps> = ({
  dateRange,
  onCancel,
  onConfirm,
  period,
  visible,
}) => {
  const c = useAppColors();
  const styles = useStyles(makeStyles);
  const separatorColor = useSeparatorColor();
  const [tempRange, setTempRange] = useState<SolarDateRange>(dateRange);
  const [visibleMonth, setVisibleMonth] = useState(
    startOfMonth(dateRange.fromDate)
  );
  const [visibleYear, setVisibleYear] = useState(
    dateRange.fromDate.getFullYear()
  );

  useEffect(() => {
    if (visible) {
      setTempRange(dateRange);
      setVisibleMonth(startOfMonth(dateRange.fromDate));
      setVisibleYear(dateRange.fromDate.getFullYear());
    }
  }, [dateRange, visible]);

  const handleConfirm = () => {
    if (startOfDay(tempRange.fromDate) > startOfDay(tempRange.toDate)) {
      Alert.alert("Lỗi", "Từ ngày không được lớn hơn Đến ngày.");
      return;
    }

    onConfirm({
      fromDate: startOfDay(tempRange.fromDate),
      toDate: startOfDay(tempRange.toDate),
    });
  };

  const handleSelectDate = (date: Date) => {
    // Không có số liệu cho ngày chưa tới; chặn ngay ở lịch thay vì để API trả về
    // khoảng trống.
    if (isFutureDate(date)) return;

    setTempRange(getDateRangeForPeriod(period, date));
  };

  const handleSelectMonth = (monthIndex: number) => {
    if (isFutureMonth(visibleYear, monthIndex)) return;

    setTempRange(
      getDateRangeForPeriod(period, new Date(visibleYear, monthIndex, 1))
    );
  };

  const handleSelectYear = (year: number) => {
    if (isFutureYear(year)) return;

    setTempRange(getDateRangeForPeriod(period, new Date(year, 0, 1)));
  };

  const monthLabel = `Tháng ${
    visibleMonth.getMonth() + 1
  }/${visibleMonth.getFullYear()}`;
  const selectedTitle =
    period === "Month" || period === "Billing"
      ? `Tháng ${
          tempRange.fromDate.getMonth() + 1
        }/${tempRange.fromDate.getFullYear()}`
      : period === "Year"
      ? String(tempRange.fromDate.getFullYear())
      : isSameDate(tempRange.fromDate, tempRange.toDate)
      ? formatDisplayDate(tempRange.fromDate)
      : `${formatDisplayDate(tempRange.fromDate)} - ${formatDisplayDate(
          tempRange.toDate
        )}`;
  const calendarDates = getCalendarDates(visibleMonth);
  const weekDays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const monthNames = [
    "Th 1",
    "Th 2",
    "Th 3",
    "Th 4",
    "Th 5",
    "Th 6",
    "Th 7",
    "Th 8",
    "Th 9",
    "Th 10",
    "Th 11",
    "Th 12",
  ];
  const yearGridYears = getYearGridYears(visibleYear);
  const isMonthPicker = period === "Month" || period === "Billing";
  const isYearPicker = period === "Year";
  const canGoNextCalendarPage = isYearPicker
    ? getYearGridStart(visibleYear) + 12 <= new Date().getFullYear()
    : isMonthPicker
    ? visibleYear < new Date().getFullYear()
    : !isFutureDateRange({
        fromDate: addMonths(visibleMonth, 1),
        toDate: addMonths(visibleMonth, 1),
      });

  return (
    <Modal
      transparent
      statusBarTranslucent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.calendarOverlay}>
        <View style={styles.calendarDialog}>
          <Text style={styles.calendarTitle}>Chọn ngày</Text>
          <View
            style={[
              styles.calendarSelectedRow,
              { borderBottomColor: separatorColor },
            ]}
          >
            <Text style={styles.calendarSelectedText}>{selectedTitle}</Text>
            <Ionicons name="pencil-outline" size={28} color={c.text} />
          </View>

          <View style={styles.calendarMonthRow}>
            <Text style={styles.calendarMonthText}>
              {isYearPicker
                ? `${getYearGridStart(visibleYear)} - ${
                    getYearGridStart(visibleYear) + 11
                  }`
                : isMonthPicker
                ? String(visibleYear)
                : monthLabel}
            </Text>
            <View style={styles.calendarMonthControls}>
              <TouchableOpacity
                style={styles.calendarMonthButton}
                onPress={() => {
                  if (isYearPicker) {
                    setVisibleYear((current) => current - 12);
                    return;
                  }

                  if (isMonthPicker) {
                    setVisibleYear((current) => current - 1);
                    return;
                  }

                  setVisibleMonth((current) => addMonths(current, -1));
                }}
              >
                <Ionicons name="chevron-up" size={25} color={c.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.calendarMonthButton,
                  !canGoNextCalendarPage && styles.calendarMonthButtonDisabled,
                ]}
                disabled={!canGoNextCalendarPage}
                onPress={() => {
                  if (isYearPicker) {
                    setVisibleYear((current) => current + 12);
                    return;
                  }

                  if (isMonthPicker) {
                    setVisibleYear((current) => current + 1);
                    return;
                  }

                  setVisibleMonth((current) => addMonths(current, 1));
                }}
              >
                <Ionicons name="chevron-down" size={25} color={c.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {isMonthPicker ? (
            <View style={styles.calendarOptionGrid}>
              {monthNames.map((monthName, monthIndex) => {
                const isSelected =
                  tempRange.fromDate.getFullYear() === visibleYear &&
                  tempRange.fromDate.getMonth() === monthIndex;
                const isDisabled = isFutureMonth(visibleYear, monthIndex);

                return (
                  <TouchableOpacity
                    key={monthName}
                    style={styles.calendarOptionCell}
                    activeOpacity={0.75}
                    disabled={isDisabled}
                    onPress={() => handleSelectMonth(monthIndex)}
                  >
                    <View
                      style={[
                        styles.calendarOptionCircle,
                        isSelected && styles.calendarOptionSelected,
                        isDisabled && styles.calendarOptionDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarOptionText,
                          isSelected && styles.calendarOptionSelectedText,
                          isDisabled && styles.calendarOptionDisabledText,
                        ]}
                      >
                        {monthName}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : isYearPicker ? (
            <View style={styles.calendarOptionGrid}>
              {yearGridYears.map((year) => {
                const isSelected = tempRange.fromDate.getFullYear() === year;
                const isDisabled = isFutureYear(year);

                return (
                  <TouchableOpacity
                    key={year}
                    style={styles.calendarOptionCell}
                    activeOpacity={0.75}
                    disabled={isDisabled}
                    onPress={() => handleSelectYear(year)}
                  >
                    <View
                      style={[
                        styles.calendarOptionCircle,
                        isSelected && styles.calendarOptionSelected,
                        isDisabled && styles.calendarOptionDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarOptionText,
                          isSelected && styles.calendarOptionSelectedText,
                          isDisabled && styles.calendarOptionDisabledText,
                        ]}
                      >
                        {year}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <>
              <View style={styles.calendarWeekRow}>
                {weekDays.map((day, index) => (
                  <Text key={`${day}-${index}`} style={styles.calendarWeekText}>
                    {day}
                  </Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {calendarDates.map((date) => {
                  const isCurrentMonth =
                    date.getMonth() === visibleMonth.getMonth();
                  const isStart = isSameDate(date, tempRange.fromDate);
                  const isEnd = isSameDate(date, tempRange.toDate);
                  const isSelected = isStart || isEnd;
                  const isInRange = isDateInRange(date, tempRange);
                  const isDisabled = isFutureDate(date);

                  return (
                    <TouchableOpacity
                      key={date.toISOString()}
                      style={[
                        styles.calendarDayCell,
                        isInRange && styles.calendarDayInRange,
                      ]}
                      activeOpacity={0.75}
                      disabled={isDisabled}
                      onPress={() => handleSelectDate(date)}
                    >
                      <View
                        style={[
                          styles.calendarDayCircle,
                          isSelected && styles.calendarDaySelected,
                          isDisabled && styles.calendarDayDisabled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            !isCurrentMonth && styles.calendarDayMuted,
                            isSelected && styles.calendarDaySelectedText,
                            isDisabled && styles.calendarDayDisabledText,
                          ]}
                        >
                          {date.getDate()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.calendarActionRow}>
            <TouchableOpacity
              onPress={onCancel}
              style={styles.calendarActionBtn}
            >
              <Text style={styles.calendarActionText}>Huỷ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={styles.calendarActionBtn}
            >
              <Text style={styles.calendarActionText}>Đồng ý</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
