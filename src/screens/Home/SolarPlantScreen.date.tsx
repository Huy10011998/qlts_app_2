import { useSeparatorColor, useStyles } from "../../utils/helpers/colors";
import React, { type ComponentProps, useState } from "react";
import {
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import CalendarPanel, {
  type CalendarPickLevel,
} from "../../components/dataPicker/shared/CalendarPanel";
import PickerSheetFrame from "../../components/dataPicker/shared/PickerSheetFrame";
import {
  formatDateRangeLabel,
  formatDisplayDate,
  getDateRangeForPeriod,
  isSameDate,
  PERIOD_TAB_LABELS,
  PERIOD_TABS,
  startOfDay,
  type PeriodTab,
  type SolarDateRange,
} from "./SolarPlantScreen.helpers";
import { makeStyles } from "./SolarPlantScreen.styles";
import { UnscaledText } from "../../utils/helpers/textScaling";
import {
  DateCalendarIcon,
  DateChevron,
  DateSkipIcon,
} from "./SolarPlantScreen.visuals";
import { AppAlert } from "../../components/ui/AppAlert";

type SolarTextProps = ComponentProps<typeof Text>;

/**
 * Chữ không phóng to theo cỡ chữ hệ thống.
 *
 * Chỉ dùng cho những chỗ hình học đã khoá cứng: ô lịch tròn (`calendarDayCircle`
 * 46px, `calendarOptionCircle` 76px) và hàng tab kỳ — hàng này tự tính một cỡ
 * chữ chung cho cả 5 nhãn nên không được để hệ điều hành can thiệp. Mọi chữ
 * khác trong màn dùng `Text` thường để đi theo cài đặt cỡ chữ của người dùng.
 */
const FixedText: React.FC<SolarTextProps> = (props) => (
  <UnscaledText {...props} allowFontScaling={false} />
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
            {/* `collapsable={false}`: trên Android (kiến trúc cũ) View chỉ có
                bo góc mà không có nền sẽ bị gộp vào cha, đến khi tab được chọn
                thì view dựng lại chỉ nhận mỗi nền mới nên chip xanh mất bo 4
                góc. Giữ view luôn tồn tại thì bo góc không rơi. */}
            <View
              collapsable={false}
              style={[
                styles.tabChip,
                activeTab === tab && styles.tabChipActive,
              ]}
            >
              <FixedText
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
              </FixedText>
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

const PICKER_TITLES: Record<PeriodTab, string> = {
  Day: "Chọn ngày",
  Week: "Chọn tuần",
  Month: "Chọn tháng",
  Year: "Chọn năm",
  Billing: "Chọn kỳ hoá đơn",
};

/** Kỳ theo tháng / năm thì bấm ô tháng / năm là chọn luôn. */
const PICK_LEVELS: Record<PeriodTab, CalendarPickLevel> = {
  Day: "day",
  Week: "day",
  Month: "month",
  Year: "year",
  Billing: "month",
};

/**
 * Chọn kỳ xem số liệu, dùng chung lịch với mọi ô ngày trong app. Ngày / tháng /
 * năm chưa tới bị khoá (chưa có số liệu); kỳ tuần là 7 ngày tính tới ngày chọn,
 * tô thành một dải trên lịch.
 */
export const SolarDateRangePicker: React.FC<SolarDateRangePickerProps> = ({
  dateRange,
  onCancel,
  onConfirm,
  period,
  visible,
}) => {
  const [tempRange, setTempRange] = useState<SolarDateRange>(dateRange);

  // Mở lại thì bắt đầu từ kỳ đang xem; lịch dựng lại (key mới) để về đúng trang.
  const [wasVisible, setWasVisible] = useState(visible);
  const [session, setSession] = useState(0);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setTempRange(dateRange);
      setSession((n) => n + 1);
    }
  }

  const handleConfirm = () => {
    if (startOfDay(tempRange.fromDate) > startOfDay(tempRange.toDate)) {
      AppAlert.alert("Lỗi", "Từ ngày không được lớn hơn Đến ngày.");
      return;
    }

    onConfirm({
      fromDate: startOfDay(tempRange.fromDate),
      toDate: startOfDay(tempRange.toDate),
    });
  };

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

  return (
    <PickerSheetFrame
      visible={visible}
      title={PICKER_TITLES[period]}
      headline={selectedTitle}
      onCancel={onCancel}
      onConfirm={handleConfirm}
    >
      <CalendarPanel
        key={session}
        // Kỳ tuần neo ở ngày cuối (ngày người dùng bấm), các kỳ khác ở ngày đầu.
        value={period === "Week" ? tempRange.toDate : tempRange.fromDate}
        onChange={(date) => setTempRange(getDateRangeForPeriod(period, date))}
        pickLevel={PICK_LEVELS[period]}
        range={
          period === "Week"
            ? { from: tempRange.fromDate, to: tempRange.toDate }
            : null
        }
        maxDate={startOfDay(new Date())}
      />
    </PickerSheetFrame>
  );
};
