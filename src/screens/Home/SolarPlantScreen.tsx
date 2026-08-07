import React, {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  View,
  Text as NativeText,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import LinearGradient from "react-native-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Rect, Circle, Ellipse } from "react-native-svg";
import Ionicons from "react-native-vector-icons/Ionicons";
import { HeaderDetailsModalHeader } from "../../components/header/HeaderDetails";
import AssetTreeNodeItem from "../../components/assets/shared/AssetTreeNodeItem";
import SlideInSidePanel from "../../components/shared/SlideInSidePanel";
import { usePermission } from "../../hooks/usePermission";
import { useSlideInPanel } from "../../hooks/useSlideInPanel";
import {
  SOLAR_DASHBOARD_PERMISSION,
  SOLAR_NO_PERMISSION_MESSAGE,
} from "../../services/data/solarApi";
import type { TreeNode } from "../../types";
import {
  C,
  useAppColors,
  useHairlineBorderColor,
  useSeparatorColor,
  useStyles,
} from "../../utils/helpers/colors";

import {
  addDays,
  addMonths,
  aggregateComparative,
  buildEnergyBarChart,
  canMoveToNextRange,
  clamp,
  createTodayDateRange,
  formatCount,
  formatEnergy,
  formatLongDate,
  formatMetricText,
  formatPercent,
  formatPower,
  formatPowerMw,
  getDateRangeForPeriod,
  getSolarContentWidth,
  hasNumber,
  MAX_SOLAR_CONTENT_WIDTH,
  isCurrentPeriodRange,
  NO_VALUE,
  type CompareMode,
  type EnergyBarChartView,
  type ExpandedChart,
  type GraphMode,
  type MetricParts,
  type PeriodTab,
  type PlantWeatherState,
  type SolarComparativeView,
  type SolarDateRange,
  type SolarEnergyBalanceView,
  type SolarEnvBenefitsView,
  type SolarOverviewView,
  type SolarPowerFlowView,
  type SolarPowerSeriesView,
  usePlantWeather,
} from "./SolarPlantScreen.helpers";
import { PeriodHeader, SolarDateRangePicker } from "./SolarPlantScreen.date";
import { makeStyles } from "./SolarPlantScreen.styles";
import {
  areaChartMarkerX,
  AreaChart,
  BalanceBar,
  BarChart,
  ChartSkeleton,
  ChartTransition,
  DonutChart,
  EnergyBarChart,
  SceneView,
  StatBubble,
  WeatherIcon,
} from "./SolarPlantScreen.visuals";
import { getPlantSceneImage } from "./shared/plantScenes";
import {
  useSolarDashboard,
  type SolarBlockState,
} from "./shared/useSolarDashboard";

type SolarTextProps = ComponentProps<typeof NativeText>;

// Keep this dense dashboard readable when the device uses Display Zoom and
// the largest accessibility font. Scope the opt-out to this screen only.
const Text: React.FC<SolarTextProps> = (props) => (
  <NativeText {...props} allowFontScaling={false} />
);

const EMPTY_MESSAGE = "Không có dữ liệu";

/**
 * Viên nhãn mốc không hiển thị được "—" như các ô số, nên lúc chưa có chuỗi dữ
 * liệu phải nói rõ đang tải — KHÔNG dùng "Không có dữ liệu", vì lúc đó chưa biết
 * là không có hay chưa về. Khung chờ của biểu đồ thì hiện vòng xoay, không chữ.
 */
const EMPTY_LOADING_MESSAGE = "Đang tải…";

/**
 * Nhãn đường kẻ tham chiếu. Không dùng "hôm qua" vì biểu đồ có thể đang xem một
 * ngày trong quá khứ, lúc đó mốc so sánh là ngày liền trước ngày đó.
 */
const PREVIOUS_DAY_PEAK_LABEL = "Đỉnh hôm trước";

/**
 * W -> MW cho biểu đồ công suất. Trục Y cố định MW để mốc trục không nhảy đơn vị
 * giữa các ngày, khớp với `formatPowerMw` dùng cho tooltip.
 */
const toMegawatt = (watt: number | null) =>
  watt == null || !Number.isFinite(watt) ? null : watt / 1_000_000;

const POWER_CHART_UNIT = "MW";

/** Chiều cao biểu đồ trong màn chính, dùng chung cho biểu đồ thật và khung chờ. */
const INLINE_CHART_HEIGHT = 180;
const COMPARE_CHART_HEIGHT = 200;

/**
 * Chiều cao khung chờ = đúng chiều cao mà cả cụm biểu đồ sẽ chiếm khi có số
 * (viên tooltip + biểu đồ + hàng chú giải). Lệch vài pixel thì chấp nhận được,
 * điều phải tránh là khối co lại còn một dòng chữ rồi bung ra đẩy cả trang.
 */
const TOOLTIP_PILL_HEIGHT = 36;
const LEGEND_ROW_HEIGHT = 34;
/** Trong modal không có nút phóng to nên hàng tiêu đề chỉ cao bằng chữ + 8. */
const MODAL_TITLE_ROW_HEIGHT = 28;

// ─── Trạng thái tải / lỗi của một khối ───────────────────────────────────────

/**
 * Vạch mảnh chạy trên viền khối khi làm mới. Số cũ được giữ nguyên, không làm
 * mờ hay xoá — nhìn rất khó chịu.
 */
const RefreshBar: React.FC = () => {
  const styles = useStyles(makeStyles);
  const progress = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    // Chạy đều (linear) chứ không ease: vạch tiến độ vô định mà đầu vòng nào cũng
    // chậm lại rồi vọt lên sẽ thành giật từng nhịp.
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    animation.start();
    return () => animation.stop();
  }, [progress]);

  return (
    <View
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      pointerEvents="none"
      style={styles.refreshBar}
    >
      <Animated.View
        style={[
          styles.refreshBarFill,
          {
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-trackWidth * 0.4, trackWidth],
                }),
              },
            ],
          },
        ]}
      >
        {/* Hai đầu vạch mờ dần nên lúc trượt ra/vào mép khối không thấy cắt ngang. */}
        <LinearGradient
          colors={["#2a78d600", "#2a78d6", "#2a78d600"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.refreshBarGradient}
        />
      </Animated.View>
    </View>
  );
};

/**
 * Trạng thái chiếm cả màn: đang lấy danh sách nhà máy, chưa có quyền, hoặc chưa
 * cấu hình nhà máy nào. Ba trạng thái này là thứ đầu tiên người dùng thấy khi vào
 * màn nên dùng chung một khung có nhận diện, không phải spinner trơ trên nền xám.
 */
const SolarFullScreenState: React.FC<{
  action?: React.ReactNode;
  iconColor?: string;
  iconName: string;
  isLoading?: boolean;
  message?: string | null;
}> = ({ action, iconColor, iconName, isLoading, message }) => {
  const styles = useStyles(makeStyles);
  const appColors = useAppColors();

  return (
    <View style={[styles.safe, styles.fullScreenState]}>
      <View style={styles.fullScreenBadge}>
        <Ionicons name={iconName} size={46} color={iconColor ?? C.amber} />
      </View>
      {isLoading ? (
        <ActivityIndicator
          color={appColors.accent}
          size="small"
          style={styles.fullScreenSpinner}
        />
      ) : null}
      {message ? (
        <Text style={styles.fullScreenStateText}>{message}</Text>
      ) : null}
      {action}
    </View>
  );
};

/**
 * Viên nhãn mốc đang xem, đặt ngay trên biểu đồ: mốc thời gian + giá trị. Ở kỳ
 * Ngày là "giờ + công suất", ở các kỳ còn lại là "ngày/tháng + điện năng".
 */
const ChartMarkerPill: React.FC<{
  dotStyle: ComponentProps<typeof View>["style"];
  text: string;
  /** Hoành độ đường kẻ dọc trong biểu đồ; không truyền thì viên nhãn ở giữa. */
  markerX?: number | null;
  chartWidth?: number;
}> = ({ dotStyle, text, markerX, chartWidth }) => {
  const styles = useStyles(makeStyles);
  // Cần biết bề rộng thật của viên nhãn mới canh được tâm nó vào mốc, mà bề rộng
  // đó phụ thuộc nội dung nên phải đo sau khi render.
  const [pillWidth, setPillWidth] = useState(0);
  const offsetX =
    markerX == null || chartWidth == null || pillWidth === 0
      ? null
      : clamp(markerX - pillWidth / 2, 0, Math.max(chartWidth - pillWidth, 0));

  return (
    <View
      onLayout={(event) =>
        setPillWidth(Math.round(event.nativeEvent.layout.width))
      }
      style={[
        styles.tooltipBubble,
        offsetX != null && { alignSelf: "flex-start", marginLeft: offsetX },
      ]}
    >
      <View style={[styles.dot, dotStyle]} />
      <Text style={styles.tooltipText}>{text}</Text>
    </View>
  );
};

type ChartLegendEntry = {
  dotStyle: ComponentProps<typeof View>["style"];
  label: string;
  /** Chữ nhạt hơn cho dòng phụ (ví dụ "Tự dùng"). */
  muted?: boolean;
  /** Có vòng tròn viền quanh chấm; không truyền thì chỉ là chấm tròn. */
  ringStyle?: ComponentProps<typeof View>["style"];
};

/**
 * Chú giải của biểu đồ. Một component duy nhất cho cả biểu đồ trong màn và biểu
 * đồ phóng to — trước đây mỗi chỗ tự dựng lại markup nên hai bên trông khác nhau.
 */
const ChartLegend: React.FC<{
  /** Bản gọn: chấm nhỏ, chữ nhỏ, một hàng không xuống dòng. */
  compact?: boolean;
  entries: ChartLegendEntry[];
}> = ({ compact, entries }) => {
  const styles = useStyles(makeStyles);

  return (
    <View
      style={[styles.chartLegendRow, compact && styles.chartLegendRowCompact]}
    >
      {entries.map((entry) => (
        <View
          key={entry.label}
          style={[
            styles.chartLegendItem,
            compact && styles.chartLegendItemCompact,
          ]}
        >
          {entry.ringStyle ? (
            <View
              style={[
                styles.checkCircle,
                compact && styles.checkCircleCompact,
                entry.ringStyle,
              ]}
            >
              <View
                style={[
                  styles.checkDot,
                  compact && styles.checkDotCompact,
                  entry.dotStyle,
                ]}
              />
            </View>
          ) : (
            <View style={[styles.dot, entry.dotStyle]} />
          )}
          <Text
            numberOfLines={compact ? 1 : undefined}
            style={[
              entry.muted
                ? styles.chartLegendTextMuted
                : styles.chartLegendText,
              compact && styles.chartLegendTextCompact,
            ]}
          >
            {entry.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

/**
 * Nội dung chú giải của cả 4 biểu đồ, dựng một lần rồi dùng cho cả màn chính và
 * modal phóng to — hai bên phải ghi y hệt nhau, kể cả phần phần trăm.
 */
const useChartLegendEntries = (
  balance: SolarEnergyBalanceView | null,
  compare?: SolarComparativeView | null,
) => {
  const styles = useStyles(makeStyles);

  return {
    compare: [
      {
        dotStyle: styles.year2025Dot,
        label: String(compare?.previousYear ?? NO_VALUE),
      },
      {
        dotStyle: styles.year2026Dot,
        label: String(compare?.currentYear ?? NO_VALUE),
      },
    ] as ChartLegendEntry[],
    consumption: [
      {
        dotStyle: styles.fromSolarDot,
        label: `Từ mặt trời (${formatPercent(
          balance?.selfOfConsumptionPercent,
        )})`,
        ringStyle: styles.fromSolarRing,
      },
      {
        dotStyle: styles.consumptionDot,
        label: `Mua từ lưới (${formatPercent(balance?.purchasedPercent)})`,
        ringStyle: styles.consumptionRing,
      },
    ] as ChartLegendEntry[],
    merged: [
      {
        dotStyle: styles.productionDot,
        label: "Sản xuất",
        ringStyle: styles.productionRing,
      },
      {
        dotStyle: styles.consumptionDot,
        label: "Tiêu thụ",
        ringStyle: styles.consumptionRing,
      },
      {
        dotStyle: styles.selfDot,
        label: `Tự dùng (${formatPercent(balance?.selfOfConsumptionPercent)})`,
        muted: true,
        ringStyle: styles.selfRing,
      },
    ] as ChartLegendEntry[],
    production: [
      {
        dotStyle: styles.productionDot,
        label: `Tự dùng (${formatPercent(balance?.selfOfProductionPercent)})`,
        ringStyle: styles.productionRing,
      },
      {
        dotStyle: styles.toGridDot,
        label: `Phát lên lưới (${formatPercent(balance?.feedInPercent)})`,
        ringStyle: styles.toGridRing,
      },
    ] as ChartLegendEntry[],
  };
};

/**
 * Một cụm biểu đồ trong màn: hàng tiêu đề, viên nhãn mốc, biểu đồ, chú giải.
 *
 * Hàng tiêu đề nằm NGOÀI phần khung chờ. Trước đây nó nằm trong nên lúc đổi kỳ
 * cả tiêu đề lẫn nút phóng to biến mất rồi hiện lại — cú nhảy dễ thấy nhất khi
 * chuyển Ngày → Tuần. Khung chờ cao đúng bằng phần nó thay thế (viên nhãn +
 * biểu đồ + số hàng chú giải) nên trang không bị đẩy.
 */
const PowerChartPanel: React.FC<{
  animationKey: string;
  /** Biểu đồ đã dựng sẵn — cột hay vùng do phía gọi quyết định. */
  chart: React.ReactNode;
  chartWidth: number;
  isLoading: boolean;
  /** Đã có dữ liệu ĐÚNG kỳ đang chọn để vẽ hay chưa. */
  isReady: boolean;
  legend: ChartLegendEntry[];
  legendCompact?: boolean;
  markerDotStyle: ComponentProps<typeof View>["style"];
  markerText: string;
  /** Hoành độ mốc đang xem để viên nhãn nằm ngay trên đường kẻ dọc. */
  markerX?: number | null;
  onExpand: () => void;
  title: string;
  /** Tổng điện năng của cả kỳ; không truyền thì không hiện. */
  total?: string | null;
}> = ({
  animationKey,
  chart,
  chartWidth,
  isLoading,
  isReady,
  legend,
  legendCompact,
  markerDotStyle,
  markerText,
  markerX,
  onExpand,
  title,
  total,
}) => {
  const styles = useStyles(makeStyles);
  // Bản đầy đủ xếp 2 mục một hàng; bản gọn dồn hết vào một hàng.
  const legendRowCount = legendCompact ? 1 : Math.ceil(legend.length / 2);

  return (
    <>
      <View style={styles.chartHeaderRow}>
        <Text style={styles.chartTitle}>{title}</Text>
        {total ? <Text style={styles.chartHeaderTotal}>{total}</Text> : null}
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onExpand}
          style={styles.expandButton}
        >
          <Text style={styles.expandIcon}>⤢</Text>
        </TouchableOpacity>
      </View>

      {isReady ? (
        <>
          <ChartMarkerPill
            chartWidth={chartWidth}
            dotStyle={markerDotStyle}
            markerX={markerX}
            text={markerText}
          />
          <ChartTransition animationKey={animationKey}>{chart}</ChartTransition>
          {legendCompact ? (
            <ChartLegend compact entries={legend} />
          ) : (
            <>
              <ChartLegend entries={legend.slice(0, 2)} />
              {legend.length > 2 ? (
                <ChartLegend entries={legend.slice(2)} />
              ) : null}
            </>
          )}
        </>
      ) : (
        <ChartSkeleton
          height={
            TOOLTIP_PILL_HEIGHT +
            INLINE_CHART_HEIGHT +
            LEGEND_ROW_HEIGHT * legendRowCount
          }
          isLoading={isLoading}
          message={EMPTY_MESSAGE}
          width={chartWidth}
        />
      )}
    </>
  );
};

/** Hộp lỗi nhỏ màu đỏ nhạt bên trong khối, nội dung là message trả về. */
const BlockError: React.FC<{ message?: string | null }> = ({ message }) => {
  const styles = useStyles(makeStyles);

  if (!message) return null;

  return (
    <View style={styles.blockErrorBox}>
      <Text style={styles.blockErrorText}>{message}</Text>
    </View>
  );
};

// ─── Modal biểu đồ toàn màn ──────────────────────────────────────────────────

type ExpandedChartModalProps = {
  activeChart: ExpandedChart | null;
  balance: SolarEnergyBalanceView | null;
  chartWidth: number;
  compare: SolarComparativeView | null;
  compareMode: CompareMode;
  dateRange: SolarDateRange;
  /**
   * Biểu đồ cột của kỳ dài hơn 1 ngày. `null` ở kỳ Ngày — lúc đó vẽ biểu đồ vùng
   * theo công suất như cũ.
   */
  energyChart: EnergyBarChartView | null;
  /**
   * Đã có dữ liệu ĐÚNG kỳ/khoảng ngày đang chọn hay chưa. Chưa thì dựng khung
   * chờ — không vẽ số của kỳ trước, vì đổi kỳ/đổi ngày mà vẽ số cũ thì người
   * dùng thấy biểu đồ nhảy một nhịp sai rồi mới đúng.
   */
  isChartReady: boolean;
  /** Khối dữ liệu của biểu đồ đang mở còn đang tải hay không. */
  isLoading: boolean;
  period: PeriodTab;
  power: SolarPowerSeriesView | null;
  visible: boolean;
  /**
   * Hộp thoại chọn ngày phải nằm TRONG modal này. iOS chỉ hiển thị được một
   * modal tại một thời điểm: đặt lịch làm anh em của modal toàn màn thì bấm chọn
   * ngày sẽ không thấy gì, đóng modal xong lịch mới hiện ra ở màn ngoài.
   */
  children?: React.ReactNode;
  onChangeCompareMode: (mode: CompareMode) => void;
  onChangePeriod: (period: PeriodTab) => void;
  onClose: () => void;
  onGoCurrentRange: () => void;
  onNextRange: () => void;
  onOpenDatePicker: () => void;
  onPreviousRange: () => void;
};

const getExpandedChartTitle = (chart: ExpandedChart | null) => {
  if (chart === "production") return "Sản xuất";
  if (chart === "consumption") return "Tiêu thụ";
  if (chart === "comparative") return "So sánh sản lượng";
  return "Sản xuất & Tiêu thụ";
};

const ExpandedChartModal: React.FC<ExpandedChartModalProps> = ({
  activeChart,
  balance,
  chartWidth,
  compare,
  compareMode,
  dateRange,
  energyChart,
  isChartReady,
  isLoading,
  period,
  power,
  visible,
  children,
  onChangeCompareMode,
  onChangePeriod,
  onClose,
  onGoCurrentRange,
  onNextRange,
  onOpenDatePicker,
  onPreviousRange,
}) => {
  const styles = useStyles(makeStyles);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const hairlineBorderColor = useHairlineBorderColor();
  const title = getExpandedChartTitle(activeChart);
  const isComparative = activeChart === "comparative";
  const isProduction = activeChart === "production";
  const isConsumption = activeChart === "consumption";
  const isSplitChart = isProduction || isConsumption;
  const markerIndex = power?.lastIndex ?? -1;
  const markerTime = markerIndex >= 0 ? power?.times[markerIndex] : null;
  const productionMw = useMemo(
    () => (power?.production ?? []).map(toMegawatt),
    [power],
  );
  const consumptionMw = useMemo(
    () => (power?.consumption ?? []).map(toMegawatt),
    [power],
  );
  const selfMw = useMemo(
    () => (power?.selfConsumption ?? []).map(toMegawatt),
    [power],
  );
  const bottomSpacing = Math.max(insets.bottom, 16);
  const responsiveChartWidth = Math.max(
    240,
    Math.min(chartWidth, windowWidth - 36),
  );
  const canGoNext = canMoveToNextRange(period, dateRange);
  const [contentViewportHeight, setContentViewportHeight] = useState(0);
  const swipeTranslateX = useRef(new Animated.Value(0)).current;
  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .enabled(!isComparative)
        .activeOffsetX([-15, 15])
        .failOffsetY([-10, 10])
        .onUpdate((event) => {
          // Match the directions observed on-device: the user's right swipe
          // reaches the negative translation branch, which must be the guarded
          // next-range direction when the current range is Today.
          const isPastCurrentRange = !canGoNext && event.translationX < 0;
          swipeTranslateX.setValue(
            isPastCurrentRange ? event.translationX * 0.2 : event.translationX,
          );
        })
        .onEnd((event) => {
          const threshold = windowWidth * 0.3;
          const moveToPrevious = event.translationX > threshold;
          const moveToNext = event.translationX < -threshold && canGoNext;

          if (moveToNext || moveToPrevious) {
            Animated.timing(swipeTranslateX, {
              toValue: moveToPrevious ? windowWidth : -windowWidth,
              duration: 250,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (!finished) return;
              swipeTranslateX.setValue(0);
              if (moveToNext) onNextRange();
              else onPreviousRange();
            });
          } else {
            Animated.spring(swipeTranslateX, {
              toValue: 0,
              tension: 100,
              friction: 10,
              useNativeDriver: true,
            }).start();
          }
        }),
    [
      canGoNext,
      isComparative,
      onNextRange,
      onPreviousRange,
      swipeTranslateX,
      windowWidth,
    ],
  );
  /**
   * Phần nội dung KHÔNG phải biểu đồ, dựng từ chính các hằng số bố cục của màn:
   * hàng tiêu đề + viên nhãn mốc + chú giải. Trước đây là số 250/132 cứng tính
   * theo thẻ số cũ, giờ nội dung nhẹ hơn nên biểu đồ được cao thêm.
   */
  const nonChartContentHeight =
    MODAL_TITLE_ROW_HEIGHT +
    (isComparative ? 0 : TOOLTIP_PILL_HEIGHT) +
    // Chú giải của biểu đồ gộp có 3 mục, ở máy hẹp có thể xuống 2 hàng.
    LEGEND_ROW_HEIGHT * (isComparative ? 1 : 2) +
    bottomSpacing +
    24;
  const fallbackChartHeight = Math.max(
    windowHeight - 320 - nonChartContentHeight,
    isComparative ? 300 : 220,
  );
  const chartHeight = contentViewportHeight
    ? Math.max(contentViewportHeight - nonChartContentHeight, 220)
    : fallbackChartHeight;
  // Giữ lại tham chiếu để `BarChart` (đã memo) không phải dựng lại cột mỗi lần
  // modal render vì lý do khác.
  const comparativeBuckets = useMemo(
    () => (compare ? aggregateComparative(compare, compareMode) : []),
    [compare, compareMode],
  );
  /**
   * Chuyển cảnh chỉ chạy khi người dùng đổi thứ đang xem, không chạy theo mỗi
   * lượt số về — xem `ChartTransition`.
   */
  const chartTransitionKey = isComparative
    ? `compare-${compareMode}`
    : `${activeChart}-${period}-${dateRange.fromDate.getTime()}`;
  const legendEntries = useChartLegendEntries(balance, compare);

  /**
   * Ô đầu của thẻ số: kỳ Ngày là công suất tại mốc, các kỳ còn lại là điện năng
   * của mốc (cột) — `power-details` không được gọi ở những kỳ đó.
   */
  /** Xem `dayMarkerX` ở màn chính: viên nhãn phải nằm trên đường kẻ dọc. */
  const expandedMarkerX =
    energyChart || markerIndex < 0
      ? null
      : areaChartMarkerX(
          responsiveChartWidth,
          markerIndex,
          Math.max(power?.domainCount ?? 0, productionMw.length),
        );

  const markerMetricText = (series: (number | null)[] | undefined) =>
    energyChart
      ? formatMetricText(formatEnergy(energyChart.markerValue))
      : formatMetricText(
          formatPowerMw(
            markerIndex >= 0 ? series?.[markerIndex] ?? null : null,
          ),
        );

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent
      visible={visible}
    >
      <GestureHandlerRootView style={styles.expandedSafe}>
        <HeaderDetailsModalHeader title={title} onBack={onClose} />
        {/* Swipe đổi ngày trả `translateX` về 0 ngay, còn số thì về sau vài trăm
            ms; không có vạch này người dùng tưởng cử chỉ không ăn. */}
        <View style={styles.expandedRefreshHost}>
          {isLoading ? <RefreshBar /> : null}
        </View>
        {isComparative ? (
          <View
            style={[
              styles.expandedCompareTabs,
              { borderColor: hairlineBorderColor },
            ]}
          >
            {COMPARE_MODES.map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => onChangeCompareMode(mode)}
                style={[
                  styles.expandedCompareTab,
                  compareMode === mode && styles.expandedCompareTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.expandedCompareTabText,
                    compareMode === mode && styles.expandedCompareTabTextActive,
                  ]}
                >
                  {COMPARE_MODE_LABELS[mode]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <PeriodHeader
            activeTab={period}
            canGoNextRange={canMoveToNextRange(period, dateRange)}
            dateRange={dateRange}
            isCurrentRange={isCurrentPeriodRange(period, dateRange)}
            onChangeTab={onChangePeriod}
            onGoCurrentRange={onGoCurrentRange}
            onNextRange={onNextRange}
            onOpenDatePicker={onOpenDatePicker}
            onPreviousRange={onPreviousRange}
          />
        )}

        <GestureDetector gesture={swipeGesture}>
          <Animated.View
            onLayout={(event) => {
              const nextHeight = Math.round(event.nativeEvent.layout.height);
              setContentViewportHeight((currentHeight) =>
                currentHeight === nextHeight ? currentHeight : nextHeight,
              );
            }}
            style={[
              styles.expandedContent,
              { transform: [{ translateX: swipeTranslateX }] },
            ]}
          >
            <ScrollView
              bounces={false}
              contentContainerStyle={[
                styles.expandedContentContainer,
                { paddingBottom: bottomSpacing + 8 },
              ]}
              showsVerticalScrollIndicator={false}
              style={styles.expandedContent}
            >
              {/* Hàng tiêu đề y như trong màn: tên biểu đồ + tổng của cả kỳ.
                  Không có nút phóng to vì đang ở chính chế độ phóng to. */}
              <View style={styles.chartHeaderRow}>
                <Text style={styles.chartTitle}>{title}</Text>
                {isSplitChart ? (
                  <Text style={styles.chartHeaderTotal}>
                    {formatMetricText(
                      formatEnergy(
                        isProduction
                          ? balance?.production
                          : balance?.consumption,
                      ),
                    )}
                  </Text>
                ) : null}
              </View>

              {isComparative ? (
                <>
                  <View style={styles.expandedCompareChartWrap}>
                    <ChartTransition
                      animationKey={`${chartTransitionKey}-${
                        isChartReady ? "ready" : "wait"
                      }`}
                    >
                      {isChartReady ? (
                        <BarChart
                          data={comparativeBuckets}
                          previousLabel={
                            compare?.previousYear != null
                              ? String(compare.previousYear)
                              : undefined
                          }
                          currentLabel={
                            compare?.currentYear != null
                              ? String(compare.currentYear)
                              : undefined
                          }
                          width={responsiveChartWidth}
                          height={chartHeight}
                        />
                      ) : (
                        <ChartSkeleton
                          height={chartHeight}
                          isLoading={isLoading}
                          message={EMPTY_MESSAGE}
                          width={responsiveChartWidth}
                        />
                      )}
                    </ChartTransition>
                  </View>
                  <ChartLegend entries={legendEntries.compare} />
                </>
              ) : (
                <>
                  {/* Viên nhãn mốc giống hệt trong màn, thay cho thẻ số cũ:
                      phần trăm và tổng của cả kỳ đã có ở hàng tiêu đề và ở
                      chú giải bên dưới. */}
                  <ChartMarkerPill
                    chartWidth={responsiveChartWidth}
                    dotStyle={
                      isConsumption
                        ? styles.consumptionDot
                        : styles.productionDot
                    }
                    markerX={expandedMarkerX}
                    text={
                      !isChartReady
                        ? EMPTY_LOADING_MESSAGE
                        : energyChart
                        ? `${energyChart.markerLabel} ${formatMetricText(
                            formatEnergy(energyChart.markerValue),
                          )}`
                        : `${
                            markerTime
                              ? `${formatLongDate(
                                  dateRange.fromDate,
                                )} · ${markerTime}`
                              : formatLongDate(dateRange.fromDate)
                          } ${markerMetricText(
                            isConsumption
                              ? power?.consumption
                              : power?.production,
                          )}`
                    }
                  />

                  <ChartTransition
                    // Thêm trạng thái sẵn-sàng vào khoá để lúc số về, biểu đồ mờ
                    // vào thay cho khung chờ chứ không hiện đột ngột.
                    animationKey={`${chartTransitionKey}-${
                      isChartReady ? "ready" : "wait"
                    }`}
                  >
                    {!isChartReady ? (
                      <ChartSkeleton
                        height={chartHeight}
                        isLoading={isLoading}
                        message={EMPTY_MESSAGE}
                        width={responsiveChartWidth}
                      />
                    ) : energyChart ? (
                      <EnergyBarChart
                        buckets={energyChart.buckets}
                        markerIndex={energyChart.markerIndex}
                        unitLabel={energyChart.unitLabel}
                        width={responsiveChartWidth}
                        height={chartHeight}
                      />
                    ) : (
                      <AreaChart
                        productionData={productionMw}
                        consumptionData={consumptionMw}
                        selfData={selfMw}
                        unitLabel={POWER_CHART_UNIT}
                        markerIndex={markerIndex}
                        xLabels={power?.xLabels}
                        domainCount={power?.domainCount}
                        referenceValue={
                          // Đường tham chiếu chỉ có nghĩa khi biểu đồ tách riêng
                          // một chuỗi; ở biểu đồ gộp thì không biết nó thuộc
                          // chuỗi nào.
                          isProduction
                            ? toMegawatt(
                                power?.previousDayPeak?.production ?? null,
                              )
                            : isConsumption
                            ? toMegawatt(
                                power?.previousDayPeak?.consumption ?? null,
                              )
                            : null
                        }
                        referenceLabel={PREVIOUS_DAY_PEAK_LABEL}
                        variant={
                          isProduction
                            ? "production"
                            : isConsumption
                            ? "consumption"
                            : "merged"
                        }
                        width={responsiveChartWidth}
                        height={chartHeight}
                      />
                    )}
                  </ChartTransition>

                  <ChartLegend
                    entries={
                      isProduction
                        ? legendEntries.production
                        : isConsumption
                        ? legendEntries.consumption
                        : legendEntries.merged
                    }
                  />
                </>
              )}
            </ScrollView>
          </Animated.View>
        </GestureDetector>
        {children}
      </GestureHandlerRootView>
    </Modal>
  );
};

// ─── Khối 1: dòng năng lượng thời gian thực ──────────────────────────────────

const COMPARE_MODES = ["Month", "Quarter", "Year"] as const;

const COMPARE_MODE_LABELS: Record<CompareMode, string> = {
  Month: "Theo tháng",
  Quarter: "Theo quý",
  Year: "Cả năm",
};

type SolarHeroSectionProps = {
  flow: SolarBlockState<SolarPowerFlowView>;
  overview: SolarBlockState<SolarOverviewView>;
  /** Tên nhà máy đang xem, để lấy đúng ảnh nền. */
  plantName?: string | null;
  screenWidth: number;
  weather: PlantWeatherState;
};

const SolarHeroSection: React.FC<SolarHeroSectionProps> = ({
  flow,
  overview,
  plantName,
  screenWidth,
  weather,
}) => {
  const styles = useStyles(makeStyles);
  const contentWidth = getSolarContentWidth(screenWidth);
  const visualWidth = Math.min(contentWidth, MAX_SOLAR_CONTENT_WIDTH);
  const visualInset = (contentWidth - visualWidth) / 2;
  const heroVisualHeight = clamp(visualWidth * 0.58, 200, 245);
  const heroCenterBubbleSize = clamp(visualWidth * 0.31, 108, 126);
  const heroSideBubbleSize = clamp(visualWidth * 0.23, 82, 90);
  const heroSideBubbleTop = clamp(visualWidth * 0.17, 54, 72);
  const heroToHomeLeft = visualInset + clamp(visualWidth * 0.08, 24, 40);
  const heroSolarPowerLeft =
    visualInset + visualWidth * 0.46 + 14 - heroCenterBubbleSize / 2;
  const heroFromGridLeft =
    visualInset + visualWidth * 0.87 - heroSideBubbleSize / 2;

  const flowData = flow.data;
  const todayEnergy: MetricParts = formatEnergy(overview.data?.today);
  const loadPower = formatPower(flowData?.loadPower ?? null);
  const pvPower = formatPower(flowData?.pvPower ?? null);
  const gridPower = formatPower(flowData?.gridPower ?? null);
  // Chiều mua/bán đọc từ mảng connections, KHÔNG suy từ dấu của số: mọi
  // currentPower đều là số dương kể cả khi đang bán điện.
  const gridLabel = flowData?.isExportingToGrid
    ? "Bán lên lưới"
    : "Mua từ lưới";

  return (
    <View style={[styles.heroSection, styles.blockShell]}>
      {flow.isLoading || overview.isLoading ? <RefreshBar /> : null}
      <View style={styles.heroContent}>
        <View style={styles.heroTopRow}>
          <View style={styles.productionBlock}>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={styles.prodLabel}
            >
              Sản lượng hôm nay
            </Text>
            <Text
              adjustsFontSizeToFit
              allowFontScaling={false}
              minimumFontScale={0.8}
              numberOfLines={1}
              style={styles.prodValue}
            >
              {todayEnergy.value}{" "}
              <Text allowFontScaling={false} style={styles.prodUnit}>
                {todayEnergy.unit}
              </Text>
            </Text>
          </View>
          <View style={styles.weatherRow}>
            {weather.isLoading || weather.temperature == null ? null : (
              <WeatherIcon weatherCode={weather.weatherCode} />
            )}
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={styles.tempText}
            >
              {weather.temperature == null
                ? `${NO_VALUE} °C`
                : `${weather.temperature} °C`}
            </Text>
          </View>
        </View>

        <View style={[styles.heroVisual, { height: heroVisualHeight }]}>
          <View
            style={[
              styles.toHomeBubblePosition,
              { top: heroSideBubbleTop, left: heroToHomeLeft },
            ]}
          >
            <StatBubble
              value={loadPower.value}
              unit={loadPower.unit}
              label="Nhà máy"
              size={heroSideBubbleSize}
              borderColor="#cccccc"
              borderWidth={2}
              valueSize={20}
            />
          </View>

          <View
            style={[
              styles.solarPowerBubblePosition,
              { left: heroSolarPowerLeft },
            ]}
          >
            <StatBubble
              value={pvPower.value}
              unit={pvPower.unit}
              label={`Điện mặt trời\nhiện tại`}
              size={heroCenterBubbleSize}
              borderColor="#1baf7a"
              borderWidth={4}
              valueSize={27}
            />
          </View>

          <View
            style={[
              styles.fromGridBubblePosition,
              { top: heroSideBubbleTop, left: heroFromGridLeft },
            ]}
          >
            <StatBubble
              value={gridPower.value}
              unit={gridPower.unit}
              label={gridLabel}
              size={heroSideBubbleSize}
              borderColor="#eb6834"
              borderWidth={2.5}
              valueSize={20}
            />
          </View>

          <View style={styles.sceneWrap}>
            <SceneView
              plantImage={getPlantSceneImage(plantName)}
              width={visualWidth}
            />
          </View>
        </View>

        {/* Dòng tổng kết nằm ngay dưới mép ảnh nhà máy nên phải có nền riêng,
            không thì chữ dính vào ảnh và đọc rất khó. */}
        {flowData?.solarSharePercent != null ? (
          <View style={styles.flowSummaryPill}>
            <Ionicons name="sunny" size={15} color={C.amber} />
            <Text numberOfLines={2} style={styles.flowSummaryText}>
              Điện mặt trời đang chiếm{" "}
              <Text style={styles.flowSummaryValue}>
                {formatPercent(flowData.solarSharePercent)}
              </Text>{" "}
              mức sử dụng
            </Text>
          </View>
        ) : null}

        {/* Lỗi của khối overview hiển thị ở khối "Sản lượng tích luỹ" ngay bên
            dưới, ở đây chỉ báo lỗi của dòng năng lượng. */}
        {flow.error ? (
          <View style={styles.contentFrame}>
            <BlockError message={flow.error} />
          </View>
        ) : null}
      </View>
    </View>
  );
};

// ─── Khối 2: sản lượng tích luỹ ──────────────────────────────────────────────

const EnergyProducedSummary: React.FC<{
  block: SolarBlockState<SolarOverviewView>;
}> = ({ block }) => {
  const styles = useStyles(makeStyles);
  const separatorColor = useSeparatorColor();
  const data = block.data;

  const items: { label: string; parts: MetricParts }[] = [
    { label: "Tháng này", parts: formatEnergy(data?.thisMonth) },
    { label: "Năm nay", parts: formatEnergy(data?.thisYear) },
    { label: "Từ đầu", parts: formatEnergy(data?.lifetime) },
  ];

  return (
    <View
      style={[
        styles.energyProducedCard,
        styles.blockShell,
        { borderBottomColor: separatorColor },
      ]}
    >
      {block.isLoading ? <RefreshBar /> : null}
      <View style={styles.epRow}>
        <Text style={styles.sectionTitle}>Sản lượng tích luỹ</Text>
        <Text style={styles.updatedNow}>
          {data?.updatedAt ? `cập nhật ${data.updatedAt}` : ""}
        </Text>
      </View>
      <View style={styles.epStats}>
        {items.map((item, index) => (
          <React.Fragment key={item.label}>
            {index > 0 ? <View style={styles.epDivider} /> : null}
            <View style={styles.epItem}>
              <Text style={styles.epLabel}>{item.label}</Text>
              <Text style={styles.epValue}>
                {item.parts.value}{" "}
                <Text style={styles.epUnit}>{item.parts.unit}</Text>
              </Text>
            </View>
          </React.Fragment>
        ))}
      </View>
      <BlockError message={block.error} />
    </View>
  );
};

// ─── Nút header ──────────────────────────────────────────────────────────────

function SolarPlantHeaderActions({
  isRefreshing,
  onOpenMenu,
  onRefresh,
}: {
  isRefreshing: boolean;
  onOpenMenu: () => void;
  onRefresh: () => void;
}) {
  const styles = useStyles(makeStyles);
  const spin = useRef(new Animated.Value(0)).current;

  // Quay hết một vòng rồi mới dừng: cắt giữa vòng thì icon đứng nghiêng, nhìn như
  // bị treo. Vòng cuối chạy nốt sau khi `isRefreshing` đã về false.
  useEffect(() => {
    if (!isRefreshing) return;

    let isActive = true;
    const spinOnce = () => {
      spin.setValue(0);
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && isActive) spinOnce();
      });
    };

    spinOnce();

    return () => {
      isActive = false;
    };
  }, [isRefreshing, spin]);

  return (
    <View style={styles.headerActions}>
      <TouchableOpacity
        onPress={onRefresh}
        style={styles.headerButton}
        disabled={isRefreshing}
        accessibilityRole="button"
        accessibilityLabel="Làm mới dữ liệu nhà máy"
        accessibilityState={{ busy: isRefreshing }}
      >
        <Animated.View
          style={
            isRefreshing
              ? {
                  transform: [
                    {
                      rotate: spin.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "360deg"],
                      }),
                    },
                  ],
                }
              : undefined
          }
        >
          <Ionicons name="refresh-outline" size={22} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onOpenMenu}
        style={styles.headerButton}
        accessibilityRole="button"
        accessibilityLabel="Chọn nhà máy"
      >
        <Ionicons name="menu" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

/**
 * Dải báo mất mạng. Số cũ vẫn giữ trên màn, chỉ nói rõ là có thể đã cũ — khi có
 * mạng lại `useSolarDashboard` tự tải lại nên không cần nút thao tác.
 */
const OfflineNotice: React.FC<{ message: string }> = ({ message }) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.offlineBar}>
      <Ionicons name="cloud-offline-outline" size={16} color={C.redDeep} />
      <Text style={styles.offlineText}>{message}</Text>
    </View>
  );
};

// ─── Màn hình ────────────────────────────────────────────────────────────────

const SolarFullScreen: React.FC = () => {
  const styles = useStyles(makeStyles);
  const appColors = useAppColors();
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const { canView, loaded: permissionsLoaded } = usePermission();
  const contentWidth = getSolarContentWidth(screenWidth);
  const chartWidth = Math.max(260, contentWidth - 32);
  const menuWidth = clamp(screenWidth * 0.6, 280, 420);

  const [tab, setTab] = useState<PeriodTab>("Day");
  const [graphMode, setGraphMode] = useState<GraphMode>("Merged");
  const [compareMode, setCompareMode] = useState<CompareMode>("Month");
  const [dateRange, setDateRange] =
    useState<SolarDateRange>(createTodayDateRange);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [expandedChart, setExpandedChart] = useState<ExpandedChart | null>(
    null,
  );
  const dashboardScrollRef = useRef<ScrollView>(null);
  const dashboardScrollOffset = useRef(0);
  const savedDashboardScrollOffset = useRef(0);
  const shouldInlineMergedLegend = tab !== "Day";
  const weather = usePlantWeather();

  const hasSolarPermission = canView(SOLAR_DASHBOARD_PERMISSION);
  const {
    blocks,
    isOffline,
    offlineMessage,
    refresh,
    selectSite,
    selectedSite,
    siteError,
    siteStatus,
    sites,
  } = useSolarDashboard({
    enabled: hasSolarPermission,
    period: tab,
    dateRange,
  });

  const balance = blocks.balance.data;
  const power = blocks.power.data;
  const compare = blocks.compare.data;
  const env = blocks.env.data;

  const {
    closePanel: closeMenu,
    togglePanel,
    translateAnim: slideAnim,
    visible: menuVisible,
  } = useSlideInPanel({
    initialOffset: menuWidth,
  });

  const handleSelectNode = useCallback(
    (node: TreeNode) => {
      selectSite(node);
      closeMenu();
    },
    [closeMenu, selectSite],
  );

  /**
   * Kéo-để-tải-lại là thao tác chủ động nên gọi thẳng `refresh`, bỏ qua chốt
   * giãn nhịp 5 phút của các lượt tải lại tự động.
   */
  const handlePullRefresh = useCallback(async () => {
    setIsPullRefreshing(true);

    try {
      await refresh();
    } finally {
      setIsPullRefreshing(false);
    }
  }, [refresh]);

  // Nút làm mới trên header dùng đúng lượt tải của kéo-để-làm-mới, nên vòng xoay
  // của `RefreshControl` cũng chạy theo và không có hai đường tải song song.
  const renderHeaderRight = useCallback(
    () => (
      <SolarPlantHeaderActions
        isRefreshing={isPullRefreshing}
        onOpenMenu={togglePanel}
        onRefresh={handlePullRefresh}
      />
    ),
    [handlePullRefresh, isPullRefreshing, togglePanel],
  );

  const shiftDateRange = useCallback(
    (direction: -1 | 1) => {
      setDateRange((current) => {
        if (tab === "Billing") {
          return getDateRangeForPeriod(tab, new Date());
        }

        if (tab === "Month") {
          return getDateRangeForPeriod(
            tab,
            addMonths(current.fromDate, direction),
          );
        }

        if (tab === "Year") {
          return getDateRangeForPeriod(
            tab,
            new Date(current.fromDate.getFullYear() + direction, 0, 1),
          );
        }

        if (tab === "Week") {
          return getDateRangeForPeriod(
            tab,
            addDays(current.toDate, direction * 7),
          );
        }

        return getDateRangeForPeriod(tab, addDays(current.toDate, direction));
      });
    },
    [tab],
  );

  const handlePreviousRange = useCallback(() => {
    shiftDateRange(-1);
  }, [shiftDateRange]);

  const handleNextRange = useCallback(() => {
    shiftDateRange(1);
  }, [shiftDateRange]);

  const handleConfirmDateRange = useCallback(
    (nextDateRange: SolarDateRange) => {
      setDateRange(nextDateRange);
      setDatePickerVisible(false);
    },
    [],
  );

  const handleChangePeriodTab = useCallback((nextTab: PeriodTab) => {
    setTab(nextTab);
    setDateRange(getDateRangeForPeriod(nextTab, new Date()));
  }, []);

  const openExpandedChart = useCallback((chart: ExpandedChart) => {
    savedDashboardScrollOffset.current = dashboardScrollOffset.current;
    setTab("Day");
    setDateRange(getDateRangeForPeriod("Day", new Date()));
    setExpandedChart(chart);
  }, []);

  const closeExpandedChart = useCallback(() => {
    const savedOffset = savedDashboardScrollOffset.current;
    setExpandedChart(null);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        dashboardScrollRef.current?.scrollTo({
          y: savedOffset,
          animated: false,
        });
      });
    });
  }, []);

  const handleGoCurrentRange = useCallback(() => {
    setDateRange(getDateRangeForPeriod(tab, new Date()));
  }, [tab]);

  useEffect(() => {
    const selectedPlantName = selectedSite?.text?.trim();

    navigation.setOptions({
      title: selectedPlantName
        ? `CHOLIMEX FOOD - ${selectedPlantName.toLocaleUpperCase("vi-VN")}`
        : "CHOLIMEX FOOD",
      headerRight: renderHeaderRight,
    });
  }, [navigation, renderHeaderRight, selectedSite]);

  // Biểu đồ công suất vẽ theo MW; API trả W nên quy đổi ở đây.
  const productionMw = useMemo(
    () => (power?.production ?? []).map(toMegawatt),
    [power],
  );
  const consumptionMw = useMemo(
    () => (power?.consumption ?? []).map(toMegawatt),
    [power],
  );
  const selfMw = useMemo(
    () => (power?.selfConsumption ?? []).map(toMegawatt),
    [power],
  );
  const markerIndex = power?.lastIndex ?? -1;
  const markerTime = markerIndex >= 0 ? power?.times[markerIndex] : null;
  const comparativeBuckets = useMemo(
    () => (compare ? aggregateComparative(compare, compareMode) : []),
    [compare, compareMode],
  );

  /**
   * Khoá chuyển cảnh của biểu đồ công suất: đổi kỳ, đổi ngày, đổi kiểu gộp/tách
   * thì biểu đồ mờ vào lại. Số về theo lượt tự tải lại KHÔNG đổi khoá này.
   */
  const powerChartTransitionKey = `${tab}-${dateRange.fromDate.getTime()}-${dateRange.toDate.getTime()}-${graphMode}`;

  /**
   * Ở kỳ dài hơn 1 ngày, biểu đồ vẽ ĐIỆN NĂNG từng mốc (cột) lấy từ khối "Cân
   * bằng năng lượng": `power-details` chỉ trả số của đúng một ngày nên vẽ nó ở
   * kỳ Tuần/Tháng/Năm là sai — nó không đại diện cho cả kỳ.
   */
  const energyCharts = useMemo(() => {
    // `isStale` = số đang giữ thuộc kỳ trước. Vẽ nó ra thì đổi Ngày → Tuần sẽ
    // thấy một cột to (dữ liệu một ngày) nhảy lên trước khi có biểu đồ tuần.
    if (tab === "Day" || blocks.balance.isStale) return null;

    const merged = buildEnergyBarChart(balance, tab, "merged");
    const production = buildEnergyBarChart(balance, tab, "production");
    const consumption = buildEnergyBarChart(balance, tab, "consumption");

    return merged && production && consumption
      ? { consumption, merged, production }
      : null;
  }, [balance, blocks.balance.isStale, tab]);

  /** Nhãn viên pill ở kỳ Ngày: "HH:mm  x,xx MW" (công suất tại mốc). */
  const dayMarkerText = (series: (number | null)[] | undefined) =>
    `${markerTime ?? ""} ${formatMetricText(
      formatPowerMw(markerIndex >= 0 ? series?.[markerIndex] ?? null : null),
    )}`;

  /**
   * Hoành độ mốc hiện tại trên biểu đồ vùng, để viên nhãn nằm ngay trên đường kẻ
   * dọc. Biểu đồ cột không cần: mốc của nó luôn là cột cuối.
   */
  const dayMarkerX =
    energyCharts || markerIndex < 0
      ? null
      : areaChartMarkerX(
          chartWidth,
          markerIndex,
          Math.max(power?.domainCount ?? 0, power?.production.length ?? 0),
        );

  /** Nhãn viên pill ở các kỳ còn lại: "dd/MM/yyyy  x,xx MWh" (điện năng mốc). */
  const bucketMarkerText = (chart: EnergyBarChartView) =>
    `${chart.markerLabel} ${formatMetricText(formatEnergy(chart.markerValue))}`;

  /** Biểu đồ cột tương ứng biểu đồ đang mở toàn màn; `null` ở kỳ Ngày. */
  const expandedEnergyChart = useMemo(() => {
    if (
      !energyCharts ||
      expandedChart == null ||
      expandedChart === "comparative"
    ) {
      return null;
    }

    if (expandedChart === "production") return energyCharts.production;
    if (expandedChart === "consumption") return energyCharts.consumption;

    return energyCharts.merged;
  }, [energyCharts, expandedChart]);

  const legendEntries = useChartLegendEntries(balance, compare);

  const isDayPeriod = tab === "Day";
  /**
   * "Đang tải" ở đây gồm cả trường hợp số đang giữ thuộc kỳ khác (`isStale`):
   * lượt gọi cho kỳ mới có thể chưa kịp bắt đầu (các khối chạy tuần tự) nhưng
   * người dùng đã đổi kỳ rồi, lúc đó vẫn phải là khung chờ chứ không phải số cũ.
   */
  const hasPowerChartData = isDayPeriod
    ? Boolean(power?.hasData) && !blocks.power.isStale
    : energyCharts != null;
  const powerChartIsLoading = isDayPeriod
    ? blocks.power.isLoading || blocks.power.isStale
    : blocks.balance.isLoading || blocks.balance.isStale;
  const hasCompareData = Boolean(compare?.hasData) && !blocks.compare.isStale;

  const datePicker = (
    <SolarDateRangePicker
      dateRange={dateRange}
      period={tab}
      visible={datePickerVisible}
      onCancel={() => setDatePickerVisible(false)}
      onConfirm={handleConfirmDateRange}
    />
  );

  const renderTreePanel = () => (
    <SlideInSidePanel
      bodyStyle={styles.menuScrollContent}
      onClose={closeMenu}
      subtitle="Chọn nhà máy để xem dữ liệu"
      title="Danh mục"
      translateX={slideAnim}
      visible={menuVisible}
      width={menuWidth}
    >
      {sites.map((node) => (
        <AssetTreeNodeItem
          key={node.index}
          node={node}
          onSelect={handleSelectNode}
          expandAll={true}
          selectedNode={selectedSite}
        />
      ))}
    </SlideInSidePanel>
  );

  // Bước khởi tạo: chưa có danh sách config thì không được gọi API dữ liệu nào,
  // vì mọi endpoint đều cần ID_DongHoSolar lấy từ đây.
  if (!permissionsLoaded || siteStatus === "loading") {
    return (
      <SolarFullScreenState
        iconName="sunny"
        isLoading
        message="Đang tải dữ liệu điện mặt trời…"
      />
    );
  }

  if (!hasSolarPermission || siteStatus === "forbidden") {
    return (
      <SolarFullScreenState
        // Ổ khoá không phải cảnh báo nên để màu trung tính, đừng dùng vàng như
        // hai trạng thái mặt trời.
        iconColor={appColors.slate}
        iconName="lock-closed"
        message={SOLAR_NO_PERMISSION_MESSAGE}
      />
    );
  }

  if (siteStatus !== "ready") {
    return (
      <SolarFullScreenState
        action={
          siteStatus === "error" ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={refresh}
              style={styles.fullScreenRetryButton}
            >
              <Text style={styles.fullScreenRetryText}>Thử lại</Text>
            </TouchableOpacity>
          ) : null
        }
        iconName="sunny-outline"
        message={siteError}
      />
    );
  }

  return (
    <GestureHandlerRootView style={styles.safe}>
      {isOffline ? <OfflineNotice message={offlineMessage} /> : null}
      <ScrollView
        ref={dashboardScrollRef}
        onScroll={(event) => {
          if (expandedChart == null) {
            dashboardScrollOffset.current = event.nativeEvent.contentOffset.y;
          }
        }}
        scrollEventThrottle={16}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[2]}
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={handlePullRefresh}
            colors={[appColors.accent]}
            tintColor={appColors.accent}
          />
        }
      >
        <SolarHeroSection
          flow={blocks.flow}
          overview={blocks.overview}
          plantName={selectedSite?.text}
          screenWidth={screenWidth}
          weather={weather}
        />

        <View style={styles.contentFrame}>
          <EnergyProducedSummary block={blocks.overview} />
        </View>

        <PeriodHeader
          activeTab={tab}
          canGoNextRange={canMoveToNextRange(tab, dateRange)}
          dateRange={dateRange}
          isCurrentRange={isCurrentPeriodRange(tab, dateRange)}
          onChangeTab={handleChangePeriodTab}
          onGoCurrentRange={handleGoCurrentRange}
          onNextRange={handleNextRange}
          onOpenDatePicker={() => setDatePickerVisible(true)}
          onPreviousRange={handlePreviousRange}
        />

        {/* ════════════════════════════════════════════════
            KHỐI 3 – Cân bằng năng lượng
        ════════════════════════════════════════════════ */}
        <View
          style={[styles.whiteSection, styles.contentFrame, styles.blockShell]}
        >
          {blocks.balance.isLoading ? <RefreshBar /> : null}
          <Text style={styles.sectionTitle}>Cân bằng năng lượng</Text>

          {/* Chưa có số thì các ô hiện "—", KHÔNG che khối bằng khung chờ:
              người dùng vẫn đọc được nhãn và bố cục, ô nào có số trước thì hiện
              trước. Vạch mảnh trên viền khối là dấu hiệu đang tải. */}
          {/* Cụm SẢN XUẤT */}
          <Text style={styles.balanceSubLabel}>Sản xuất</Text>
          <Text style={styles.balanceBigValue}>
            {formatEnergy(balance?.production).value}{" "}
            <Text style={styles.balanceUnit}>
              {formatEnergy(balance?.production).unit}
            </Text>
          </Text>
          <BalanceBar
            segments={[
              {
                fillStyle: styles.toHomeBarFill,
                percent: balance?.selfOfProductionPercent,
              },
              {
                fillStyle: styles.toGridBarFill,
                percent: balance?.feedInPercent,
              },
            ]}
          />

          <View style={styles.donutRow}>
            <DonutChart
              primaryColor="#1baf7a"
              secondaryColor="#eb6834"
              primaryPct={balance?.selfOfProductionPercent ?? 0}
              size={90}
            />
            <View style={styles.legendCol}>
              <View style={styles.legendItem}>
                <View style={[styles.dot, styles.balanceToHomeDot]} />
                <Text style={styles.legendLabel}>🏠 Tự dùng</Text>
                <Text style={styles.legendValue}>
                  {formatMetricText(formatEnergy(balance?.selfConsumption))} (
                  {formatPercent(balance?.selfOfProductionPercent)})
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, styles.balanceToGridDot]} />
                <Text style={styles.legendLabel}>⚡ Phát lên lưới</Text>
                <Text style={styles.legendValue}>
                  {formatMetricText(formatEnergy(balance?.feedIn))} (
                  {formatPercent(balance?.feedInPercent)})
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.separator} />

          {/* Cụm TIÊU THỤ */}
          <Text style={styles.balanceSubLabel}>Tiêu thụ</Text>
          <Text style={styles.balanceBigValue}>
            {formatEnergy(balance?.consumption).value}{" "}
            <Text style={styles.balanceUnit}>
              {formatEnergy(balance?.consumption).unit}
            </Text>
          </Text>
          <BalanceBar
            segments={[
              {
                fillStyle: styles.fromSolarBarFill,
                percent: balance?.selfOfConsumptionPercent,
              },
              {
                fillStyle: styles.fromGridBarFill,
                percent: balance?.purchasedPercent,
              },
            ]}
          />

          <View style={styles.donutRow}>
            <DonutChart
              primaryColor="#eb6834"
              secondaryColor="#1baf7a"
              primaryPct={balance?.purchasedPercent ?? 0}
              size={90}
            />
            <View style={styles.legendCol}>
              <View style={styles.legendItem}>
                <View style={[styles.dot, styles.balanceFromSolarDot]} />
                <Text style={styles.legendLabel}>☀️ Từ mặt trời</Text>
                <Text style={styles.legendValue}>
                  {formatMetricText(formatEnergy(balance?.selfConsumption))} (
                  {formatPercent(balance?.selfOfConsumptionPercent)})
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, styles.balanceFromGridDot]} />
                <Text style={styles.legendLabel}>⚡ Mua từ lưới</Text>
                <Text style={styles.legendValue}>
                  {formatMetricText(formatEnergy(balance?.purchased))} (
                  {formatPercent(balance?.purchasedPercent)})
                </Text>
              </View>
            </View>
          </View>

          {/* Dòng tổng kết này là mức TỰ CHỦ: điện mặt trời gánh được bao
                nhiêu phần mức tiêu thụ, nên chia cho Tiêu thụ. Tỉ trọng chia
                cho Sản xuất đã nằm ở cụm Sản xuất phía trên. */}
          <View style={styles.selfConsumptionRow}>
            <Text style={styles.selfText}>
              ☀️ Tự dùng{" "}
              <Text style={styles.selfBold}>
                {formatMetricText(formatEnergy(balance?.selfConsumption))} (
                {formatPercent(balance?.selfOfConsumptionPercent)})
              </Text>
            </Text>
          </View>

          <BlockError message={blocks.balance.error} />
        </View>

        {/* ════════════════════════════════════════════════
            KHỐI 4 – Công suất trong ngày
        ════════════════════════════════════════════════ */}
        <View
          style={[styles.whiteSection, styles.contentFrame, styles.blockShell]}
        >
          {blocks.power.isLoading ? <RefreshBar /> : null}
          {/* Graph mode toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                graphMode === "Merged" && styles.toggleBtnActive,
              ]}
              onPress={() => setGraphMode("Merged")}
            >
              <Text
                style={[
                  styles.toggleText,
                  graphMode === "Merged" && styles.toggleTextActive,
                ]}
              >
                Gộp biểu đồ
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                graphMode === "Split" && styles.toggleBtnActive,
              ]}
              onPress={() => setGraphMode("Split")}
            >
              <Text
                style={[
                  styles.toggleText,
                  graphMode === "Split" && styles.toggleTextActive,
                ]}
              >
                Tách biểu đồ
              </Text>
            </TouchableOpacity>
          </View>

          {graphMode === "Merged" ? (
            <PowerChartPanel
              animationKey={powerChartTransitionKey}
              chart={
                energyCharts ? (
                  <EnergyBarChart
                    buckets={energyCharts.merged.buckets}
                    markerIndex={energyCharts.merged.markerIndex}
                    unitLabel={energyCharts.merged.unitLabel}
                    width={chartWidth}
                    height={INLINE_CHART_HEIGHT}
                  />
                ) : (
                  <AreaChart
                    productionData={productionMw}
                    consumptionData={consumptionMw}
                    selfData={selfMw}
                    unitLabel={POWER_CHART_UNIT}
                    markerIndex={markerIndex}
                    xLabels={power?.xLabels}
                    domainCount={power?.domainCount}
                    width={chartWidth}
                    height={INLINE_CHART_HEIGHT}
                  />
                )
              }
              chartWidth={chartWidth}
              isLoading={powerChartIsLoading}
              isReady={hasPowerChartData}
              legend={legendEntries.merged}
              // Kỳ Ngày còn thêm phần trăm nên chú giải xuống 2 hàng; các kỳ còn
              // lại dùng bản gọn một hàng.
              legendCompact={shouldInlineMergedLegend}
              markerDotStyle={styles.productionDot}
              markerX={dayMarkerX}
              markerText={
                energyCharts
                  ? bucketMarkerText(energyCharts.merged)
                  : dayMarkerText(power?.production)
              }
              onExpand={() => openExpandedChart("production-consumption")}
              title="Sản xuất & Tiêu thụ"
            />
          ) : (
            <>
              <View style={styles.splitChartBlock}>
                <PowerChartPanel
                  animationKey={powerChartTransitionKey}
                  chart={
                    energyCharts ? (
                      <EnergyBarChart
                        buckets={energyCharts.production.buckets}
                        markerIndex={energyCharts.production.markerIndex}
                        unitLabel={energyCharts.production.unitLabel}
                        width={chartWidth}
                        height={INLINE_CHART_HEIGHT}
                      />
                    ) : (
                      <AreaChart
                        productionData={productionMw}
                        consumptionData={consumptionMw}
                        variant="production"
                        unitLabel={POWER_CHART_UNIT}
                        markerIndex={markerIndex}
                        xLabels={power?.xLabels}
                        domainCount={power?.domainCount}
                        referenceValue={toMegawatt(
                          power?.previousDayPeak?.production ?? null,
                        )}
                        referenceLabel={PREVIOUS_DAY_PEAK_LABEL}
                        width={chartWidth}
                        height={INLINE_CHART_HEIGHT}
                      />
                    )
                  }
                  chartWidth={chartWidth}
                  isLoading={powerChartIsLoading}
                  isReady={hasPowerChartData}
                  legend={legendEntries.production}
                  markerDotStyle={styles.productionDot}
                  markerX={dayMarkerX}
                  markerText={
                    energyCharts
                      ? bucketMarkerText(energyCharts.production)
                      : dayMarkerText(power?.production)
                  }
                  onExpand={() => openExpandedChart("production")}
                  title="Sản xuất"
                  /* Tổng điện năng của cả kỳ. Khác đơn vị với biểu đồ bên dưới ở
                     kỳ Ngày (MWh chứ không phải MW) vì đây là điện năng cộng dồn,
                     còn biểu đồ là công suất từng mốc. */
                  total={formatMetricText(formatEnergy(balance?.production))}
                />
              </View>

              <View style={styles.splitChartBlock}>
                <PowerChartPanel
                  animationKey={powerChartTransitionKey}
                  chart={
                    energyCharts ? (
                      <EnergyBarChart
                        buckets={energyCharts.consumption.buckets}
                        markerIndex={energyCharts.consumption.markerIndex}
                        unitLabel={energyCharts.consumption.unitLabel}
                        width={chartWidth}
                        height={INLINE_CHART_HEIGHT}
                      />
                    ) : (
                      <AreaChart
                        productionData={productionMw}
                        consumptionData={consumptionMw}
                        variant="consumption"
                        unitLabel={POWER_CHART_UNIT}
                        markerIndex={markerIndex}
                        xLabels={power?.xLabels}
                        domainCount={power?.domainCount}
                        referenceValue={toMegawatt(
                          power?.previousDayPeak?.consumption ?? null,
                        )}
                        referenceLabel={PREVIOUS_DAY_PEAK_LABEL}
                        width={chartWidth}
                        height={INLINE_CHART_HEIGHT}
                      />
                    )
                  }
                  chartWidth={chartWidth}
                  isLoading={powerChartIsLoading}
                  isReady={hasPowerChartData}
                  legend={legendEntries.consumption}
                  markerDotStyle={styles.consumptionDot}
                  markerX={dayMarkerX}
                  markerText={
                    energyCharts
                      ? bucketMarkerText(energyCharts.consumption)
                      : dayMarkerText(power?.consumption)
                  }
                  onExpand={() => openExpandedChart("consumption")}
                  title="Tiêu thụ"
                  total={formatMetricText(formatEnergy(balance?.consumption))}
                />
              </View>
            </>
          )}

          <BlockError message={blocks.power.error} />
        </View>

        {/* ════════════════════════════════════════════════
            KHỐI 5 – So sánh sản lượng
        ════════════════════════════════════════════════ */}
        <View
          style={[styles.whiteSection, styles.contentFrame, styles.blockShell]}
        >
          {blocks.compare.isLoading ? <RefreshBar /> : null}
          <View style={styles.chartHeaderRow}>
            <Text style={styles.chartTitle}>So sánh sản lượng</Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => openExpandedChart("comparative")}
              style={styles.expandButton}
            >
              <Text style={styles.expandIcon}>⤢</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.subTabRow}>
            {COMPARE_MODES.map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.subTab,
                  compareMode === mode && styles.subTabActive,
                ]}
                onPress={() => setCompareMode(mode)}
              >
                <Text
                  style={[
                    styles.subTabText,
                    compareMode === mode && styles.subTabTextActive,
                  ]}
                >
                  {COMPARE_MODE_LABELS[mode]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Khối này chỉ đổi khi sang NĂM khác, nên đổi Ngày ↔ Tuần ↔ Tháng
              trong cùng năm thì `isStale` vẫn false và biểu đồ đứng yên. */}
          {!hasCompareData ? (
            <ChartSkeleton
              height={COMPARE_CHART_HEIGHT + LEGEND_ROW_HEIGHT}
              isLoading={blocks.compare.isLoading || blocks.compare.isStale}
              message={EMPTY_MESSAGE}
              width={chartWidth}
            />
          ) : (
            <>
              <ChartTransition animationKey={`compare-${compareMode}`}>
                <BarChart
                  data={comparativeBuckets}
                  previousLabel={
                    compare?.previousYear != null
                      ? String(compare.previousYear)
                      : undefined
                  }
                  currentLabel={
                    compare?.currentYear != null
                      ? String(compare.currentYear)
                      : undefined
                  }
                  width={chartWidth}
                  height={COMPARE_CHART_HEIGHT}
                />
              </ChartTransition>

              <ChartLegend entries={legendEntries.compare} />
            </>
          )}

          <BlockError message={blocks.compare.error} />
        </View>

        {/* ════════════════════════════════════════════════
            KHỐI 6 – Lợi ích môi trường
        ════════════════════════════════════════════════ */}
        <View
          style={[styles.whiteSection, styles.contentFrame, styles.blockShell]}
        >
          {blocks.env.isLoading ? <RefreshBar /> : null}
          <View style={styles.chartHeaderRow}>
            <Text style={styles.chartTitle}>Lợi ích môi trường tích luỹ</Text>
            <Text style={styles.infoIcon}>ⓘ</Text>
          </View>
          <EnvBenefitsRow data={env} />

          <BlockError message={blocks.env.error} />
        </View>
      </ScrollView>
      {renderTreePanel()}
      <ExpandedChartModal
        activeChart={expandedChart}
        balance={balance}
        chartWidth={Math.max(300, contentWidth - 48)}
        compare={compare}
        compareMode={compareMode}
        dateRange={dateRange}
        energyChart={expandedEnergyChart}
        isChartReady={
          expandedChart === "comparative" ? hasCompareData : hasPowerChartData
        }
        isLoading={
          expandedChart === "comparative"
            ? blocks.compare.isLoading
            : blocks.power.isLoading || blocks.balance.isLoading
        }
        period={tab}
        power={power}
        visible={expandedChart != null}
        onChangeCompareMode={setCompareMode}
        onChangePeriod={handleChangePeriodTab}
        onClose={closeExpandedChart}
        onGoCurrentRange={handleGoCurrentRange}
        onNextRange={handleNextRange}
        onOpenDatePicker={() => setDatePickerVisible(true)}
        onPreviousRange={handlePreviousRange}
      >
        {datePicker}
      </ExpandedChartModal>
      {/* Ngoài modal toàn màn thì lịch phải render ở đây, còn khi modal đang mở
          thì nó nằm bên trong (iOS không xếp chồng hai modal). */}
      {expandedChart == null ? datePicker : null}
    </GestureHandlerRootView>
  );
};

// ─── Khối 6: hai ô minh hoạ ──────────────────────────────────────────────────

const EnvBenefitsRow: React.FC<{ data: SolarEnvBenefitsView | null }> = ({
  data,
}) => {
  const styles = useStyles(makeStyles);
  /** Kg → tấn, km → triệu km để con số hiển thị ngắn gọn. */
  const co2Tons = hasNumber(data?.co2Kg) ? data!.co2Kg! / 1_000 : null;
  const kmMillions = hasNumber(data?.kmDriven)
    ? data!.kmDriven! / 1_000_000
    : null;

  return (
    <View style={styles.envRow}>
      <View style={styles.envItem}>
        {/* smoke stack icon */}
        <Svg width={80} height={72} viewBox="0 0 80 72">
          <Rect x={20} y={32} width={16} height={32} rx={3} fill="#c5d8e8" />
          <Rect x={44} y={22} width={16} height={42} rx={3} fill="#b8ccde" />
          <Rect x={10} y={44} width={14} height={20} rx={3} fill="#d0dfe8" />
          <Ellipse cx={28} cy={18} rx={5} ry={9} fill="#dce8f0" opacity={0.7} />
          <Ellipse cx={22} cy={14} rx={4} ry={7} fill="#e8f2f8" opacity={0.6} />
          <Ellipse cx={52} cy={10} rx={5} ry={9} fill="#dce8f0" opacity={0.7} />
          <Ellipse cx={58} cy={8} rx={4} ry={6} fill="#e8f2f8" opacity={0.6} />
        </Svg>
        <View style={styles.envValueRow}>
          <Text style={styles.envValue}>{formatCount(co2Tons)}</Text>
          <Text style={styles.envUnit}>tấn</Text>
        </View>
        <Text style={styles.envLabel}>CO₂ tránh{"\n"}phát thải</Text>
      </View>
      <View style={styles.envItem}>
        {/* car + trees icon */}
        <Svg width={80} height={72} viewBox="0 0 80 72">
          <Rect x={4} y={38} width={56} height={16} rx={4} fill="#b8c8d8" />
          <Rect x={10} y={30} width={44} height={16} rx={6} fill="#c8d8e8" />
          <Circle cx={18} cy={54} r={8} fill="#8a9ab0" />
          <Circle cx={18} cy={54} r={4} fill="#c0ccda" />
          <Circle cx={46} cy={54} r={8} fill="#8a9ab0" />
          <Circle cx={46} cy={54} r={4} fill="#c0ccda" />
          <Rect x={60} y={20} width={8} height={36} rx={2} fill="#5aaa6a" />
          <Ellipse cx={64} cy={18} rx={10} ry={10} fill="#4aaa5a" />
          <Rect x={70} y={28} width={8} height={28} rx={2} fill="#4aaa5a" />
          <Ellipse cx={74} cy={26} rx={8} ry={8} fill="#3a9a4a" />
        </Svg>
        <View style={styles.envValueRow}>
          <Text style={styles.envValue}>{formatCount(kmMillions, 2)}</Text>
          <Text style={styles.envUnit}>triệu km</Text>
        </View>
        {/* Dấu * cho người xem biết đây là số quy đổi, nhà cung cấp không trả. */}
        <Text style={styles.envLabel}>lái xe bằng{"\n"}điện mặt trời *</Text>
      </View>
    </View>
  );
};

export default SolarFullScreen;
