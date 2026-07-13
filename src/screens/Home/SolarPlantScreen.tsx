import React, {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Modal,
  View,
  Text as NativeText,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Rect, Circle, Ellipse } from "react-native-svg";
import Ionicons from "react-native-vector-icons/Ionicons";
import { HeaderDetailsModalHeader } from "../../components/header/HeaderDetails";
import AssetTreeNodeItem from "../../components/assets/shared/AssetTreeNodeItem";
import SlideInSidePanel from "../../components/shared/SlideInSidePanel";
import { API_ENDPOINTS } from "../../config";
import { useSlideInPanel } from "../../hooks/useSlideInPanel";
import { callApi } from "../../services/data/callApi";
import type { TreeNode } from "../../types";

import {
  addDays,
  addMonths,
  buildSolarPayload,
  canMoveToNextRange,
  clamp,
  createTodayDateRange,
  DEFAULT_DATA,
  DEFAULT_SOLAR_METER_ID,
  EXPANDED_COMPARATIVE_MOCK_DATA,
  formatLargeMetric,
  formatMetric,
  getDateRangeForPeriod,
  getSolarContentWidth,
  MAX_SOLAR_CONTENT_WIDTH,
  isCurrentPeriodRange,
  mapChiSoTotalToConsumption,
  SOLAR_PLANT_TREE_DATA,
  type CompareMode,
  type ExpandedChart,
  type GraphMode,
  type PeriodTab,
  type PlantWeatherState,
  type SolarApiResponse,
  type SolarDashboardData,
  type SolarDateRange,
  usePlantWeather,
} from "./SolarPlantScreen.helpers";
import { PeriodHeader, SolarDateRangePicker } from "./SolarPlantScreen.date";
import { styles } from "./SolarPlantScreen.styles";
import {
  AreaChart,
  BarChart,
  DonutChart,
  SceneView,
  StatBubble,
  WeatherIcon,
} from "./SolarPlantScreen.visuals";

type SolarTextProps = ComponentProps<typeof NativeText>;

// Keep this dense dashboard readable when the device uses Display Zoom and
// the largest accessibility font. Scope the opt-out to this screen only.
const Text: React.FC<SolarTextProps> = (props) => (
  <NativeText {...props} allowFontScaling={false} />
);

type ExpandedChartModalProps = {
  activeChart: ExpandedChart | null;
  chartWidth: number;
  compareMode: CompareMode;
  data: SolarDashboardData;
  dateRange: SolarDateRange;
  period: PeriodTab;
  visible: boolean;
  onChangeCompareMode: (mode: CompareMode) => void;
  onChangePeriod: (period: PeriodTab) => void;
  onClose: () => void;
  onGoCurrentRange: () => void;
  onNextRange: () => void;
  onOpenDatePicker: () => void;
  onPreviousRange: () => void;
};

const getExpandedChartTitle = (chart: ExpandedChart | null) => {
  if (chart === "production") return "Production";
  if (chart === "consumption") return "Consumption";
  if (chart === "comparative") return "Comparative Production";
  return "Production & Consumption";
};

const ExpandedMetricRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <View style={styles.expandedTooltipMetricRow}>
    <Text style={styles.expandedTooltipLabel}>{label}</Text>
    <Text style={styles.expandedTooltipValue}>{value}</Text>
  </View>
);

const ExpandedLegendItem = ({
  dotStyle,
  label,
}: {
  dotStyle: ComponentProps<typeof View>["style"];
  label: string;
}) => (
  <View style={styles.expandedLegendItem}>
    <View style={[styles.expandedLegendDot, dotStyle]} />
    <Text style={styles.expandedLegendText}>{label}</Text>
  </View>
);

const ExpandedChartModal: React.FC<ExpandedChartModalProps> = ({
  activeChart,
  chartWidth,
  compareMode,
  data,
  dateRange,
  period,
  visible,
  onChangeCompareMode,
  onChangePeriod,
  onClose,
  onGoCurrentRange,
  onNextRange,
  onOpenDatePicker,
  onPreviousRange,
}) => {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const title = getExpandedChartTitle(activeChart);
  const isComparative = activeChart === "comparative";
  const isProduction = activeChart === "production";
  const isConsumption = activeChart === "consumption";
  const isSplitChart = isProduction || isConsumption;
  const markerIndex = 11;
  const productionMarkerValue = data.productionHourly[markerIndex] ?? 0;
  const consumptionMarkerValue = data.consumptionHourly[markerIndex] ?? 0;
  const bottomSpacing = Math.max(insets.bottom, 16);
  const responsiveChartWidth = Math.max(
    240,
    Math.min(chartWidth, windowWidth - 36)
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
            isPastCurrentRange ? event.translationX * 0.2 : event.translationX
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
    ]
  );
  const fallbackChartHeight = isComparative
    ? Math.max(windowHeight - 410 - bottomSpacing, 300)
    : Math.max(windowHeight - 534 - bottomSpacing, 220);
  const nonChartContentHeight = isComparative
    ? 132 + bottomSpacing
    : 250 + bottomSpacing;
  const chartHeight = contentViewportHeight
    ? Math.max(contentViewportHeight - nonChartContentHeight, 220)
    : fallbackChartHeight;

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
        {isComparative ? (
          <View style={styles.expandedCompareTabs}>
            {(["Month", "Quarter", "Year"] as const).map((mode) => (
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
                  {mode}
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
                currentHeight === nextHeight ? currentHeight : nextHeight
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
              {isSplitChart ? (
                <View style={styles.expandedMetricSummary}>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    numberOfLines={1}
                    style={styles.expandedMetricName}
                  >
                    {title}
                  </Text>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    numberOfLines={1}
                    style={styles.expandedMetricTotal}
                  >
                    {isProduction
                      ? formatMetric((data.production ?? 0) / 1000, 2)
                      : formatMetric(data.consumption, 2)}{" "}
                    MWh
                  </Text>
                </View>
              ) : (
                <Text style={styles.expandedTitle}>{title}</Text>
              )}

              {isComparative ? (
                <>
                  <View style={styles.expandedCompareChartWrap}>
                    <BarChart
                      data={EXPANDED_COMPARATIVE_MOCK_DATA}
                      width={responsiveChartWidth}
                      height={chartHeight}
                    />
                  </View>
                  <View style={styles.expandedLegendRow}>
                    <View style={styles.expandedLegendItem}>
                      <View
                        style={[styles.expandedLegendDot, styles.year2025Dot]}
                      />
                      <Text style={styles.expandedLegendText}>2025</Text>
                    </View>
                    <View style={styles.expandedLegendItem}>
                      <View
                        style={[styles.expandedLegendDot, styles.year2026Dot]}
                      />
                      <Text style={styles.expandedLegendText}>2026</Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.expandedTooltipCard}>
                    <Text style={styles.expandedTooltipDate}>
                      {dateRange.fromDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                    {isProduction ? (
                      <>
                        <ExpandedMetricRow
                          label="Production"
                          value={`${formatMetric(productionMarkerValue, 2)} MW`}
                        />
                        <ExpandedMetricRow
                          label="To Home"
                          value={`${formatMetric(
                            productionMarkerValue,
                            2
                          )} MW ${formatMetric(data.toHomePercent)}%`}
                        />
                        <ExpandedMetricRow
                          label="To Grid"
                          value={`${formatMetric(
                            data.toGridWh === 0
                              ? 0
                              : productionMarkerValue *
                                  ((data.toGridPercent ?? 0) / 100),
                            2
                          )} MW ${formatMetric(data.toGridPercent)}%`}
                        />
                      </>
                    ) : isConsumption ? (
                      <>
                        <ExpandedMetricRow
                          label="Consumption"
                          value={`${formatMetric(
                            consumptionMarkerValue,
                            2
                          )} MW`}
                        />
                        <ExpandedMetricRow
                          label="From Solar"
                          value={`${formatMetric(
                            consumptionMarkerValue *
                              ((data.fromSolarPercent ?? 0) / 100),
                            2
                          )} MW ${formatMetric(data.fromSolarPercent)}%`}
                        />
                        <ExpandedMetricRow
                          label="From Grid"
                          value={`${formatMetric(
                            consumptionMarkerValue *
                              ((data.fromGridPercent ?? 0) / 100),
                            2
                          )} MW ${formatMetric(data.fromGridPercent)}%`}
                        />
                      </>
                    ) : (
                      <>
                        <ExpandedMetricRow
                          label="Production"
                          value={`${formatMetric(
                            (data.production ?? 0) / 1000,
                            2
                          )} MWh`}
                        />
                        <ExpandedMetricRow
                          label="Consumption"
                          value={`${formatMetric(data.consumption, 2)} MWh`}
                        />
                        <ExpandedMetricRow
                          label="Self Consumption"
                          value={`${formatMetric(
                            (data.selfConsumptionKwh ?? 0) / 1000,
                            2
                          )} MWh ${formatMetric(data.selfConsumptionPercent)}%`}
                        />
                      </>
                    )}
                  </View>

                  <AreaChart
                    productionData={data.productionHourly}
                    consumptionData={data.consumptionHourly}
                    markerIndex={markerIndex}
                    tooltipValue={
                      isConsumption
                        ? consumptionMarkerValue
                        : productionMarkerValue
                    }
                    showReferenceLine={isSplitChart}
                    variant={
                      activeChart === "production"
                        ? "production"
                        : activeChart === "consumption"
                        ? "consumption"
                        : "merged"
                    }
                    width={responsiveChartWidth}
                    height={chartHeight}
                  />

                  <View style={styles.expandedLegendRow}>
                    {isProduction ? (
                      <>
                        <ExpandedLegendItem
                          dotStyle={styles.productionDot}
                          label={`To Home (${formatMetric(
                            data.toHomePercent
                          )}%)`}
                        />
                        <ExpandedLegendItem
                          dotStyle={styles.toGridDot}
                          label={`To Grid (${formatMetric(
                            data.toGridPercent
                          )}%)`}
                        />
                      </>
                    ) : isConsumption ? (
                      <>
                        <ExpandedLegendItem
                          dotStyle={styles.fromSolarDot}
                          label={`From Solar (${formatMetric(
                            data.fromSolarPercent
                          )}%)`}
                        />
                        <ExpandedLegendItem
                          dotStyle={styles.consumptionDot}
                          label={`From Grid (${formatMetric(
                            data.fromGridPercent
                          )}%)`}
                        />
                      </>
                    ) : (
                      <>
                        <View style={styles.expandedLegendItem}>
                          <View
                            style={[
                              styles.expandedLegendDot,
                              styles.productionDot,
                            ]}
                          />
                          <Text style={styles.expandedLegendText}>
                            Production
                          </Text>
                        </View>
                        <View style={styles.expandedLegendItem}>
                          <View
                            style={[
                              styles.expandedLegendDot,
                              styles.consumptionDot,
                            ]}
                          />
                          <Text style={styles.expandedLegendText}>
                            Consumption
                          </Text>
                        </View>
                        <View style={styles.expandedLegendItem}>
                          <View
                            style={[styles.expandedLegendDot, styles.selfDot]}
                          />
                          <Text style={styles.expandedLegendText}>
                            Self Consumption (
                            {formatMetric(data.selfConsumptionPercent)}
                            %)
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

interface Props {
  data?: SolarDashboardData;
}

type SolarHeroSectionProps = {
  data: SolarDashboardData;
  screenWidth: number;
  weather: PlantWeatherState;
};

const SolarHeroSection: React.FC<SolarHeroSectionProps> = ({
  data,
  screenWidth,
  weather,
}) => {
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

  return (
    <View style={styles.heroSection}>
      <View style={styles.heroContent}>
        <View style={styles.heroTopRow}>
          <View style={styles.productionBlock}>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={styles.prodLabel}
            >
              Production Today
            </Text>
            <Text
              adjustsFontSizeToFit
              allowFontScaling={false}
              minimumFontScale={0.8}
              numberOfLines={1}
              style={styles.prodValue}
            >
              {formatMetric(data.productionToday)}{" "}
              <Text allowFontScaling={false} style={styles.prodUnit}>
                kWh
              </Text>
            </Text>
          </View>
          <View style={styles.weatherRow}>
            {weather.isLoading ? null : (
              <WeatherIcon weatherCode={weather.weatherCode} />
            )}
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={styles.tempText}
            >
              {weather.isLoading ? "-- °C" : `${weather.temperature} °C`}
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
              value={formatMetric(data.toHome, 2)}
              unit="MW"
              label="To Home"
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
              value={formatMetric(data.solarPowerNow)}
              unit="kW"
              label={`Solar Power\nNow`}
              size={heroCenterBubbleSize}
              borderColor="#4caf50"
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
              value={formatMetric(data.fromGrid, 2)}
              unit="MW"
              label="From Grid"
              size={heroSideBubbleSize}
              borderColor="#f5a623"
              borderWidth={2.5}
              valueSize={20}
            />
          </View>

          <View style={styles.sceneWrap}>
            <SceneView width={visualWidth} />
          </View>
        </View>
      </View>
    </View>
  );
};

const EnergyProducedSummary: React.FC<{ data: SolarDashboardData }> = ({
  data,
}) => (
  <View style={styles.energyProducedCard}>
    <View style={styles.epRow}>
      <Text style={styles.sectionTitle}>Energy Produced</Text>
      <Text style={styles.updatedNow}>Updated now</Text>
    </View>
    <View style={styles.epStats}>
      <View style={styles.epItem}>
        <Text style={styles.epLabel}>This Month</Text>
        <Text style={styles.epValue}>
          {formatMetric(data.thisMonth)} <Text style={styles.epUnit}>MWh</Text>
        </Text>
      </View>
      <View style={styles.epDivider} />
      <View style={styles.epItem}>
        <Text style={styles.epLabel}>This Year</Text>
        <Text style={styles.epValue}>
          {formatMetric(data.thisYear)} <Text style={styles.epUnit}>MWh</Text>
        </Text>
      </View>
      <View style={styles.epDivider} />
      <View style={styles.epItem}>
        <Text style={styles.epLabel}>Lifetime</Text>
        <Text style={styles.epValue}>
          {formatMetric(data.lifetime)} <Text style={styles.epUnit}>MWh</Text>
        </Text>
      </View>
    </View>
  </View>
);

function SolarPlantMenuButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.headerButton}>
      <Ionicons name="menu" size={26} color="#fff" />
    </TouchableOpacity>
  );
}

const SolarFullScreen: React.FC<Props> = ({ data = DEFAULT_DATA }) => {
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const contentWidth = getSolarContentWidth(screenWidth);
  const chartWidth = Math.max(260, contentWidth - 32);
  const menuWidth = clamp(screenWidth * 0.6, 280, 420);
  const todayDashboardData = data;
  const [filteredDashboardData, setFilteredDashboardData] =
    useState<SolarDashboardData>(data);
  const [tab, setTab] = useState<PeriodTab>("Day");
  const [graphMode, setGraphMode] = useState<GraphMode>("Merged");
  const [compareMode, setCompareMode] = useState<CompareMode>("Month");
  const [dateRange, setDateRange] =
    useState<SolarDateRange>(createTodayDateRange);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [expandedChart, setExpandedChart] = useState<ExpandedChart | null>(
    null
  );
  const dashboardScrollRef = useRef<ScrollView>(null);
  const dashboardScrollOffset = useRef(0);
  const savedDashboardScrollOffset = useRef(0);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(
    SOLAR_PLANT_TREE_DATA[0]
  );
  const shouldInlineMergedLegend = tab !== "Day";
  const weather = usePlantWeather(todayDashboardData.temperature);
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
      setSelectedNode(node);
      closeMenu();
    },
    [closeMenu]
  );

  const renderHeaderRight = useCallback(
    () => <SolarPlantMenuButton onPress={togglePanel} />,
    [togglePanel]
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
            addMonths(current.fromDate, direction)
          );
        }

        if (tab === "Year") {
          return getDateRangeForPeriod(
            tab,
            new Date(current.fromDate.getFullYear() + direction, 0, 1)
          );
        }

        if (tab === "Week") {
          return getDateRangeForPeriod(
            tab,
            addDays(current.toDate, direction * 7)
          );
        }

        return getDateRangeForPeriod(tab, addDays(current.toDate, direction));
      });
    },
    [tab]
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
    []
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
    let isMounted = true;
    const meterId = Number(selectedNode?.value) || DEFAULT_SOLAR_METER_ID;

    const loadUsageTotal = async () => {
      try {
        const response = await callApi<SolarApiResponse>(
          "POST",
          API_ENDPOINTS.GET_SOLAR,
          buildSolarPayload(meterId, dateRange)
        );
        const usageData = mapChiSoTotalToConsumption(response.data);

        if (!isMounted) return;
        setFilteredDashboardData(usageData ? { ...data, ...usageData } : data);
      } catch {
        if (isMounted) {
          setFilteredDashboardData(data);
        }
      }
    };

    loadUsageTotal();

    return () => {
      isMounted = false;
    };
  }, [data, dateRange, selectedNode?.value]);

  useEffect(() => {
    const selectedPlantName = selectedNode?.text?.trim();

    navigation.setOptions({
      title: selectedPlantName
        ? `CHOLIMEX FOOD - ${selectedPlantName.toLocaleUpperCase("vi-VN")}`
        : "CHOLIMEX FOOD",
      headerRight: renderHeaderRight,
    });
  }, [navigation, renderHeaderRight, selectedNode]);

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
      {SOLAR_PLANT_TREE_DATA.map((node) => (
        <AssetTreeNodeItem
          key={node.index}
          node={node}
          onSelect={handleSelectNode}
          expandAll={true}
          selectedNode={selectedNode}
        />
      ))}
    </SlideInSidePanel>
  );

  return (
    <GestureHandlerRootView style={styles.safe}>
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
      >
        <SolarHeroSection
          data={todayDashboardData}
          screenWidth={screenWidth}
          weather={weather}
        />

        <View style={styles.contentFrame}>
          <EnergyProducedSummary data={todayDashboardData} />
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
            SECTION 2 – Energy Balance
        ════════════════════════════════════════════════ */}
        <View style={[styles.whiteSection, styles.contentFrame]}>
          <Text style={styles.sectionTitle}>Energy Balance</Text>

          {/* Production block */}
          <Text style={styles.balanceSubLabel}>Production</Text>
          <Text style={styles.balanceBigValue}>
            {formatMetric(filteredDashboardData.production)}{" "}
            <Text style={styles.balanceUnit}>kWh</Text>
          </Text>
          {/* green bar */}
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                styles.toHomeBarFill,
                { flex: filteredDashboardData.toHomePercent ?? 0 },
              ]}
            />
            <View
              style={[
                styles.barFill,
                styles.toGridBarFill,
                { flex: filteredDashboardData.toGridPercent ?? 0 },
              ]}
            />
          </View>

          {/* Production donut + legend */}
          <View style={styles.donutRow}>
            <DonutChart
              primaryColor="#4caf50"
              secondaryColor="#42b0e8"
              primaryPct={filteredDashboardData.toHomePercent ?? 0}
              size={90}
            />
            <View style={styles.legendCol}>
              <View style={styles.legendItem}>
                <View style={[styles.dot, styles.balanceToHomeDot]} />
                <Text style={styles.legendLabel}>🏠 To Home</Text>
                <Text style={styles.legendValue}>
                  {formatMetric(filteredDashboardData.toHomeKwh)} kWh (
                  {formatMetric(filteredDashboardData.toHomePercent)}%)
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, styles.balanceToGridDot]} />
                <Text style={styles.legendLabel}>⚡ To Grid</Text>
                <Text style={styles.legendValue}>
                  {formatMetric(filteredDashboardData.toGridWh)} Wh (
                  {formatMetric(filteredDashboardData.toGridPercent)}%)
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.separator} />

          {/* Consumption block */}
          <Text style={styles.balanceSubLabel}>Consumption</Text>
          <Text style={styles.balanceBigValue}>
            {formatMetric(filteredDashboardData.consumption)}{" "}
            <Text style={styles.balanceUnit}>MWh</Text>
          </Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                styles.fromSolarBarFill,
                { flex: filteredDashboardData.fromSolarPercent ?? 0 },
              ]}
            />
            <View
              style={[
                styles.barFill,
                styles.fromGridBarFill,
                { flex: filteredDashboardData.fromGridPercent ?? 0 },
              ]}
            />
          </View>

          {/* Consumption donut + legend */}
          <View style={styles.donutRow}>
            <DonutChart
              primaryColor="#f5a623"
              secondaryColor="#42b0e8"
              primaryPct={filteredDashboardData.fromGridPercent ?? 0}
              size={90}
            />
            <View style={styles.legendCol}>
              <View style={styles.legendItem}>
                <View style={[styles.dot, styles.balanceFromSolarDot]} />
                <Text style={styles.legendLabel}>☀️ From Solar</Text>
                <Text style={styles.legendValue}>
                  {formatMetric(filteredDashboardData.fromSolarKwh)} kWh (
                  {formatMetric(filteredDashboardData.fromSolarPercent)}%)
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, styles.balanceFromGridDot]} />
                <Text style={styles.legendLabel}>⚡ From Grid</Text>
                <Text style={styles.legendValue}>
                  {formatMetric(filteredDashboardData.fromGridMwh)} MWh (
                  {formatMetric(filteredDashboardData.fromGridPercent)}%)
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.selfConsumptionRow}>
            <Text style={styles.selfText}>
              ☀️ Self Consumption{" "}
              <Text style={styles.selfBold}>
                {formatMetric(filteredDashboardData.selfConsumptionKwh)} kWh (
                {formatMetric(filteredDashboardData.selfConsumptionPercent)}%)
              </Text>
            </Text>
          </View>
        </View>

        {/* ════════════════════════════════════════════════
            SECTION 3 – Production & Consumption chart
        ════════════════════════════════════════════════ */}
        <View style={[styles.whiteSection, styles.contentFrame]}>
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
                Merged Graphs
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
                Split Graphs
              </Text>
            </TouchableOpacity>
          </View>

          {graphMode === "Merged" ? (
            <>
              <View style={styles.chartHeaderRow}>
                <Text style={styles.chartTitle}>
                  Production &amp; Consumption
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => openExpandedChart("production-consumption")}
                  style={styles.expandButton}
                >
                  <Text style={styles.expandIcon}>⤢</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.tooltipBubble}>
                <View style={[styles.dot, styles.productionDot]} />
                <Text style={styles.tooltipText}>10:45 0.68 MW</Text>
              </View>

              <AreaChart
                productionData={filteredDashboardData.productionHourly}
                consumptionData={filteredDashboardData.consumptionHourly}
                markerIndex={11}
                tooltipValue={0.68}
                width={chartWidth}
                height={180}
              />

              {shouldInlineMergedLegend ? (
                <View
                  style={[styles.chartLegendRow, styles.chartLegendRowCompact]}
                >
                  <View
                    style={[
                      styles.chartLegendItem,
                      styles.chartLegendItemCompact,
                    ]}
                  >
                    <View
                      style={[
                        styles.checkCircle,
                        styles.checkCircleCompact,
                        styles.productionRing,
                      ]}
                    >
                      <View
                        style={[
                          styles.checkDot,
                          styles.checkDotCompact,
                          styles.productionDot,
                        ]}
                      />
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.chartLegendText,
                        styles.chartLegendTextCompact,
                      ]}
                    >
                      Production
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.chartLegendItem,
                      styles.chartLegendItemCompact,
                    ]}
                  >
                    <View
                      style={[
                        styles.checkCircle,
                        styles.checkCircleCompact,
                        styles.consumptionRing,
                      ]}
                    >
                      <View
                        style={[
                          styles.checkDot,
                          styles.checkDotCompact,
                          styles.consumptionDot,
                        ]}
                      />
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.chartLegendText,
                        styles.chartLegendTextCompact,
                      ]}
                    >
                      Consumption
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.chartLegendItem,
                      styles.chartLegendItemCompact,
                    ]}
                  >
                    <View
                      style={[
                        styles.checkCircle,
                        styles.checkCircleCompact,
                        styles.selfRing,
                      ]}
                    >
                      <View
                        style={[
                          styles.checkDot,
                          styles.checkDotCompact,
                          styles.selfDot,
                        ]}
                      />
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.chartLegendTextMuted,
                        styles.chartLegendTextCompact,
                      ]}
                    >
                      Self Consumption (
                      {formatMetric(
                        filteredDashboardData.selfConsumptionPercent
                      )}
                      %)
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.chartLegendRow}>
                    <View style={styles.chartLegendItem}>
                      <View style={[styles.checkCircle, styles.productionRing]}>
                        <View style={[styles.checkDot, styles.productionDot]} />
                      </View>
                      <Text style={styles.chartLegendText}>Production</Text>
                    </View>
                    <View style={styles.chartLegendItem}>
                      <View
                        style={[styles.checkCircle, styles.consumptionRing]}
                      >
                        <View
                          style={[styles.checkDot, styles.consumptionDot]}
                        />
                      </View>
                      <Text style={styles.chartLegendText}>Consumption</Text>
                    </View>
                  </View>
                  <View style={styles.chartLegendRow}>
                    <View style={styles.chartLegendItem}>
                      <View style={[styles.checkCircle, styles.selfRing]}>
                        <View style={[styles.checkDot, styles.selfDot]} />
                      </View>
                      <Text style={styles.chartLegendTextMuted}>
                        Self Consumption (
                        {formatMetric(
                          filteredDashboardData.selfConsumptionPercent
                        )}
                        %)
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </>
          ) : (
            <>
              <View style={styles.splitChartBlock}>
                <View style={styles.chartHeaderRow}>
                  <Text style={styles.chartTitle}>Production</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => openExpandedChart("production")}
                    style={styles.expandButton}
                  >
                    <Text style={styles.expandIcon}>⤢</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.tooltipBubble}>
                  <View style={[styles.dot, styles.productionDot]} />
                  <Text style={styles.tooltipText}>10:30 0.69 MW</Text>
                </View>
                <AreaChart
                  productionData={filteredDashboardData.productionHourly}
                  consumptionData={filteredDashboardData.consumptionHourly}
                  variant="production"
                  markerIndex={10}
                  tooltipValue={0.69}
                  showReferenceLine
                  width={chartWidth}
                  height={180}
                />
                <View style={styles.chartLegendRow}>
                  <View style={styles.chartLegendItem}>
                    <View style={[styles.checkCircle, styles.productionRing]}>
                      <View style={[styles.checkDot, styles.productionDot]} />
                    </View>
                    <Text style={styles.chartLegendText}>To Home</Text>
                  </View>
                  <View style={styles.chartLegendItem}>
                    <View style={[styles.checkCircle, styles.toGridRing]}>
                      <View style={[styles.checkDot, styles.toGridDot]} />
                    </View>
                    <Text style={styles.chartLegendText}>To Grid</Text>
                  </View>
                </View>
              </View>

              <View style={styles.splitChartBlock}>
                <View style={styles.chartHeaderRow}>
                  <Text style={styles.chartTitle}>Consumption</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => openExpandedChart("consumption")}
                    style={styles.expandButton}
                  >
                    <Text style={styles.expandIcon}>⤢</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.tooltipBubble}>
                  <View style={[styles.dot, styles.consumptionDot]} />
                  <Text style={styles.tooltipText}>10:30 1.44 MW</Text>
                </View>
                <AreaChart
                  productionData={filteredDashboardData.productionHourly}
                  consumptionData={filteredDashboardData.consumptionHourly}
                  variant="consumption"
                  markerIndex={10}
                  tooltipValue={1.44}
                  showReferenceLine
                  width={chartWidth}
                  height={180}
                />
                <View style={styles.chartLegendRow}>
                  <View style={styles.chartLegendItem}>
                    <View style={[styles.checkCircle, styles.fromSolarRing]}>
                      <View style={[styles.checkDot, styles.fromSolarDot]} />
                    </View>
                    <Text style={styles.chartLegendText}>From Solar</Text>
                  </View>
                  <View style={styles.chartLegendItem}>
                    <View style={[styles.checkCircle, styles.consumptionRing]}>
                      <View style={[styles.checkDot, styles.consumptionDot]} />
                    </View>
                    <Text style={styles.chartLegendText}>From Grid</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ════════════════════════════════════════════════
            SECTION 4 – Comparative Production + Environmental
        ════════════════════════════════════════════════ */}
        <View style={[styles.whiteSection, styles.contentFrame]}>
          {/* Comparative Production */}
          <View style={styles.chartHeaderRow}>
            <Text style={styles.chartTitle}>Comparative Production</Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => openExpandedChart("comparative")}
              style={styles.expandButton}
            >
              <Text style={styles.expandIcon}>⤢</Text>
            </TouchableOpacity>
          </View>

          {/* Sub-tabs: Month / Quarter / Year */}
          <View style={styles.subTabRow}>
            {(["Month", "Quarter", "Year"] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.subTab,
                  compareMode === m && styles.subTabActive,
                ]}
                onPress={() => setCompareMode(m)}
              >
                <Text
                  style={[
                    styles.subTabText,
                    compareMode === m && styles.subTabTextActive,
                  ]}
                >
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <BarChart
            data={filteredDashboardData.comparativeData}
            width={chartWidth}
            height={200}
          />

          {/* Legend */}
          <View style={styles.chartLegendRow}>
            <View style={styles.chartLegendItem}>
              <View style={[styles.dot, styles.year2025Dot]} />
              <Text style={styles.chartLegendText}>2025</Text>
            </View>
            <View style={styles.chartLegendItem}>
              <View style={[styles.dot, styles.year2026Dot]} />
              <Text style={styles.chartLegendText}>2026</Text>
            </View>
          </View>
        </View>

        {/* Environmental Benefits */}
        <View style={[styles.whiteSection, styles.contentFrame]}>
          <View style={styles.chartHeaderRow}>
            <Text style={styles.chartTitle}>
              Lifetime Environmental Benefits
            </Text>
            <Text style={styles.infoIcon}>ⓘ</Text>
          </View>
          <View style={styles.envRow}>
            <View style={styles.envItem}>
              {/* smoke stack icon */}
              <Svg width={80} height={72} viewBox="0 0 80 72">
                <Rect
                  x={20}
                  y={32}
                  width={16}
                  height={32}
                  rx={3}
                  fill="#c5d8e8"
                />
                <Rect
                  x={44}
                  y={22}
                  width={16}
                  height={42}
                  rx={3}
                  fill="#b8ccde"
                />
                <Rect
                  x={10}
                  y={44}
                  width={14}
                  height={20}
                  rx={3}
                  fill="#d0dfe8"
                />
                <Ellipse
                  cx={28}
                  cy={18}
                  rx={5}
                  ry={9}
                  fill="#dce8f0"
                  opacity={0.7}
                />
                <Ellipse
                  cx={22}
                  cy={14}
                  rx={4}
                  ry={7}
                  fill="#e8f2f8"
                  opacity={0.6}
                />
                <Ellipse
                  cx={52}
                  cy={10}
                  rx={5}
                  ry={9}
                  fill="#dce8f0"
                  opacity={0.7}
                />
                <Ellipse
                  cx={58}
                  cy={8}
                  rx={4}
                  ry={6}
                  fill="#e8f2f8"
                  opacity={0.6}
                />
              </Svg>
              <Text style={styles.envValue}>
                {formatLargeMetric(filteredDashboardData.co2Saved)}
              </Text>
              <Text style={styles.envLabel}>Kg of CO₂ Emission{"\n"}Saved</Text>
            </View>
            <View style={styles.envItem}>
              {/* car + trees icon */}
              <Svg width={80} height={72} viewBox="0 0 80 72">
                <Rect
                  x={4}
                  y={38}
                  width={56}
                  height={16}
                  rx={4}
                  fill="#b8c8d8"
                />
                <Rect
                  x={10}
                  y={30}
                  width={44}
                  height={16}
                  rx={6}
                  fill="#c8d8e8"
                />
                <Circle cx={18} cy={54} r={8} fill="#8a9ab0" />
                <Circle cx={18} cy={54} r={4} fill="#c0ccda" />
                <Circle cx={46} cy={54} r={8} fill="#8a9ab0" />
                <Circle cx={46} cy={54} r={4} fill="#c0ccda" />
                <Rect
                  x={60}
                  y={20}
                  width={8}
                  height={36}
                  rx={2}
                  fill="#5aaa6a"
                />
                <Ellipse cx={64} cy={18} rx={10} ry={10} fill="#4aaa5a" />
                <Rect
                  x={70}
                  y={28}
                  width={8}
                  height={28}
                  rx={2}
                  fill="#4aaa5a"
                />
                <Ellipse cx={74} cy={26} rx={8} ry={8} fill="#3a9a4a" />
              </Svg>
              <Text style={styles.envValue}>
                {formatLargeMetric(filteredDashboardData.kmDriven)}
              </Text>
              <Text style={styles.envLabel}>km Driven on{"\n"}Sunshine</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      {renderTreePanel()}
      <ExpandedChartModal
        activeChart={expandedChart}
        chartWidth={Math.max(300, contentWidth - 48)}
        compareMode={compareMode}
        data={filteredDashboardData}
        dateRange={dateRange}
        period={tab}
        visible={expandedChart != null}
        onChangeCompareMode={setCompareMode}
        onChangePeriod={handleChangePeriodTab}
        onClose={closeExpandedChart}
        onGoCurrentRange={handleGoCurrentRange}
        onNextRange={handleNextRange}
        onOpenDatePicker={() => setDatePickerVisible(true)}
        onPreviousRange={handlePreviousRange}
      />
      <SolarDateRangePicker
        dateRange={dateRange}
        period={tab}
        visible={datePickerVisible}
        onCancel={() => setDatePickerVisible(false)}
        onConfirm={handleConfirmDateRange}
      />
    </GestureHandlerRootView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

export default SolarFullScreen;
