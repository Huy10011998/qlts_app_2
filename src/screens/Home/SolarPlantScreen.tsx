import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  useWindowDimensions,
  Modal,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Svg, {
  Rect,
  Circle,
  Ellipse,
  Path,
  Line,
  Polygon,
  Defs,
  LinearGradient,
  Stop,
  G,
  Text as SvgText,
} from "react-native-svg";
import Ionicons from "react-native-vector-icons/Ionicons";
import AssetTreeNodeItem from "../../components/assets/shared/AssetTreeNodeItem";
import SlideInSidePanel from "../../components/shared/SlideInSidePanel";
import { API_ENDPOINTS } from "../../config";
import { useSlideInPanel } from "../../hooks/useSlideInPanel";
import { callApi } from "../../services/data/callApi";
import type { TreeNode } from "../../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 32;
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const SOLAR_PLANT_WEATHER_LOCATION = {
  latitude: 10.8276699,
  longitude: 106.5932193,
};
const WEATHER_REFRESH_MS = 5 * 60 * 1000;
const PERIOD_TABS = ["Day", "Week", "Month", "Year", "Billing"] as const;
const BEN_LUC_SOLAR_METER_ID = 3;
const VINH_LOC_SOLAR_METER_ID = 17;
const DEFAULT_SOLAR_METER_ID = BEN_LUC_SOLAR_METER_ID;

const SOLAR_PLANT_TREE_DATA: TreeNode[] = [
  {
    index: 1,
    parent: null,
    text: "Vĩnh Lộc",
    value: String(VINH_LOC_SOLAR_METER_ID),
    property: "solarPlant",
    expanded: true,
  },
  {
    index: 2,
    parent: null,
    text: "Bến Lức",
    value: String(BEN_LUC_SOLAR_METER_ID),
    property: "solarPlant",
    expanded: true,
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type PeriodTab = (typeof PERIOD_TABS)[number];
type GraphMode = "Merged" | "Split";
type CompareMode = "Month" | "Quarter" | "Year";

type PlantWeatherState = {
  temperature: number;
  weatherCode?: number;
  isLoading: boolean;
};

type SolarApiItem = {
  chiSo?: number | null;
};

type SolarApiResponse = {
  data?: SolarApiItem[];
};

type SolarApiPayload = {
  tuNgay: string;
  denNgay: string;
  iD_DongHoSolar: number;
};

type SolarDateRange = {
  fromDate: Date;
  toDate: Date;
};

export interface SolarDashboardData {
  // Section 1 – Hero
  productionToday: number | null; // kWh
  solarPowerNow: number | null; // kW
  toHome: number | null; // MW
  fromGrid: number | null; // MW
  temperature: number; // °C
  // Section 1 – Energy Produced
  thisMonth: number | null; // MWh
  thisYear: number | null; // MWh
  lifetime: number | null; // MWh
  // Section 2 – Energy Balance
  production: number | null; // kWh
  toHomeKwh: number | null; // kWh
  toHomePercent: number | null; // 0-100
  toGridWh: number | null; // Wh
  toGridPercent: number | null; // 0-100
  consumption: number | null; // MWh
  fromSolarKwh: number | null; // kWh
  fromSolarPercent: number | null; // 0-100
  fromGridMwh: number | null; // MWh
  fromGridPercent: number | null; // 0-100
  selfConsumptionKwh: number | null; // kWh
  selfConsumptionPercent: number | null; // 0-100
  // Section 3 – Production & Consumption chart (hourly MW)
  productionHourly: number[]; // 24 values (0-23h)
  consumptionHourly: number[]; // 24 values (0-23h)
  // Section 3 – Comparative Production (monthly MWh)
  comparativeData: {
    month: string;
    year2025: number;
    year2026: number;
  }[];
  // Section 4 – Environmental
  co2Saved: number | null; // kg (e.g. 283000 → "283k")
  kmDriven: number | null; // km (e.g. 2050000 → "2.05m")
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const DEFAULT_DATA: SolarDashboardData = {
  productionToday: 369,
  solarPowerNow: 272,
  toHome: 1.55,
  fromGrid: 1.28,
  temperature: 29,
  thisMonth: 88.7,
  thisYear: 542,
  lifetime: 724,
  production: 369,
  toHomeKwh: 369,
  toHomePercent: 100,
  toGridWh: 0,
  toGridPercent: 0,
  consumption: 4.16,
  fromSolarKwh: 369,
  fromSolarPercent: 9,
  fromGridMwh: 3.79,
  fromGridPercent: 91,
  selfConsumptionKwh: 369,
  selfConsumptionPercent: 9,
  productionHourly: [
    0, 0, 0, 0, 0, 0, 0.04, 0.08, 0.15, 0.36, 0.28, 0.68, 1.42, 1.55, 1.3, 1.0,
    0.7, 0.4, 0.15, 0.05, 0, 0, 0, 0,
  ],
  consumptionHourly: [
    0.22, 0.24, 0.22, 0.14, 0.14, 0.15, 0.55, 1.05, 1.12, 1.44, 1.5, 1.42, 1.38,
    0.42, 0.4, 0.38, 0.36, 0.34, 0.32, 0.3, 0.28, 0.27, 0.26, 0.27,
  ],
  comparativeData: [
    { month: "Jan", year2025: 88, year2026: 0 },
    { month: "Feb", year2025: 62, year2026: 0 },
    { month: "Mar", year2025: 98, year2026: 0 },
    { month: "Apr", year2025: 90, year2026: 0 },
    { month: "May", year2025: 95, year2026: 0 },
    { month: "Jun", year2025: 88, year2026: 90 },
    { month: "Jul", year2025: 0, year2026: 0 },
    { month: "Aug", year2025: 0, year2026: 0 },
    { month: "Sep", year2025: 0, year2026: 0 },
    { month: "Oct", year2025: 8, year2026: 0 },
    { month: "Nov", year2025: 72, year2026: 0 },
    { month: "Dec", year2025: 90, year2026: 0 },
  ],
  co2Saved: 283000,
  kmDriven: 2050000,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatLarge = (val: number): string => {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}m`;
  if (val >= 1_000) return `${Math.round(val / 1_000)}k`;
  return String(val);
};

const formatMetric = (
  value: number | null | undefined,
  digits?: number
): string => {
  if (typeof value !== "number" || Number.isNaN(value)) return "---";
  return digits == null ? String(value) : value.toFixed(digits);
};

const formatLargeMetric = (value: number | null | undefined): string => {
  if (typeof value !== "number" || Number.isNaN(value)) return "---";
  return formatLarge(value);
};

const roundTo = (value: number, digits = 2) => Number(value.toFixed(digits));

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const endOfDay = (date: Date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  );

const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);

const endOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0, 0, 0, 0, 0);

const startOfYear = (date: Date) =>
  new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);

const endOfYear = (date: Date) =>
  new Date(date.getFullYear(), 11, 31, 0, 0, 0, 0);

const addDays = (date: Date, amount: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
};

const addMonths = (date: Date, amount: number) =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1, 0, 0, 0, 0);

const getDateRangeForPeriod = (
  period: PeriodTab,
  selectedDate: Date
): SolarDateRange => {
  if (period === "Billing") {
    const today = new Date();

    return {
      fromDate: startOfMonth(today),
      toDate: endOfMonth(today),
    };
  }

  if (period === "Week") {
    const toDate = startOfDay(selectedDate);

    return {
      fromDate: addDays(toDate, -6),
      toDate,
    };
  }

  if (period === "Month") {
    return {
      fromDate: startOfMonth(selectedDate),
      toDate: endOfMonth(selectedDate),
    };
  }

  if (period === "Year") {
    return {
      fromDate: startOfYear(selectedDate),
      toDate: endOfYear(selectedDate),
    };
  }

  return {
    fromDate: startOfDay(selectedDate),
    toDate: startOfDay(selectedDate),
  };
};

const createTodayDateRange = (): SolarDateRange => {
  const today = new Date();
  return {
    fromDate: startOfDay(today),
    toDate: startOfDay(today),
  };
};

const formatDisplayDate = (date: Date) =>
  date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const formatShortDate = (date: Date) =>
  `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;

const formatMonthYear = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

const isSameDate = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isDateInRange = (date: Date, { fromDate, toDate }: SolarDateRange) => {
  const time = startOfDay(date).getTime();
  return (
    time >= startOfDay(fromDate).getTime() &&
    time <= startOfDay(toDate).getTime()
  );
};

const getCalendarDates = (visibleMonth: Date) => {
  const monthStart = startOfMonth(visibleMonth);
  const calendarStart = addDays(monthStart, -monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) =>
    addDays(calendarStart, index)
  );
};

const getYearGridStart = (year: number) => year - 1;

const getYearGridYears = (year: number) => {
  const startYear = getYearGridStart(year);

  return Array.from({ length: 12 }, (_, index) => startYear + index);
};

const isFutureDateRange = ({ fromDate }: SolarDateRange) =>
  startOfDay(fromDate).getTime() > startOfDay(new Date()).getTime();

const isFutureMonth = (year: number, monthIndex: number) => {
  const today = new Date();
  const currentMonthStart = startOfMonth(today).getTime();

  return new Date(year, monthIndex, 1).getTime() > currentMonthStart;
};

const isFutureYear = (year: number) => year > new Date().getFullYear();

const canMoveToNextRange = (period: PeriodTab, dateRange: SolarDateRange) => {
  if (period === "Billing") return false;

  if (period === "Month") {
    return !isFutureDateRange(
      getDateRangeForPeriod(period, addMonths(dateRange.fromDate, 1))
    );
  }

  if (period === "Year") {
    return !isFutureDateRange(
      getDateRangeForPeriod(
        period,
        new Date(dateRange.fromDate.getFullYear() + 1, 0, 1)
      )
    );
  }

  if (period === "Week") {
    return !isFutureDateRange(
      getDateRangeForPeriod(period, addDays(dateRange.fromDate, 7))
    );
  }

  return !isFutureDateRange(
    getDateRangeForPeriod(period, addDays(dateRange.toDate, 1))
  );
};

const isCurrentPeriodRange = (period: PeriodTab, dateRange: SolarDateRange) => {
  const currentRange = getDateRangeForPeriod(period, new Date());

  return (
    isSameDate(dateRange.fromDate, currentRange.fromDate) &&
    isSameDate(dateRange.toDate, currentRange.toDate)
  );
};

const formatDateRangeLabel = (
  { fromDate, toDate }: SolarDateRange,
  period: PeriodTab
) => {
  const today = new Date();

  if (
    period === "Day" &&
    isSameDate(fromDate, today) &&
    isSameDate(toDate, today)
  ) {
    return "Today";
  }

  if (period === "Month") {
    return formatMonthYear(fromDate);
  }

  if (period === "Year") {
    return String(fromDate.getFullYear());
  }

  if (period === "Week" || period === "Billing") {
    return `${formatShortDate(fromDate)} - ${formatShortDate(toDate)}`;
  }

  if (isSameDate(fromDate, toDate)) {
    return formatShortDate(fromDate);
  }

  return `${formatShortDate(fromDate)} - ${formatShortDate(toDate)}`;
};

const buildSolarPayload = (
  meterId: number,
  dateRange: SolarDateRange
): SolarApiPayload => ({
  tuNgay: startOfDay(dateRange.fromDate).toISOString(),
  denNgay: endOfDay(dateRange.toDate).toISOString(),
  iD_DongHoSolar: meterId,
});

const mapChiSoTotalToConsumption = (
  items: SolarApiItem[] | undefined
): Pick<SolarDashboardData, "consumption"> | null => {
  if (!items?.length) return null;

  const totalWh = items.reduce(
    (sum, item) => sum + (typeof item.chiSo === "number" ? item.chiSo : 0),
    0
  );

  return {
    consumption: roundTo(totalWh / 1_000_000, 2),
  };
};

const isRainWeatherCode = (weatherCode?: number) =>
  weatherCode != null &&
  ((weatherCode >= 51 && weatherCode <= 67) ||
    (weatherCode >= 80 && weatherCode <= 82));

const isStormWeatherCode = (weatherCode?: number) =>
  weatherCode != null && weatherCode >= 95 && weatherCode <= 99;

type OpenMeteoCurrentResponse = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
};

async function fetchPlantWeather(signal?: AbortSignal) {
  const { latitude, longitude } = SOLAR_PLANT_WEATHER_LOCATION;
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    "&current=temperature_2m,weather_code" +
    "&timezone=Asia%2FHo_Chi_Minh";

  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Weather request failed: ${response.status}`);
  }

  const payload = (await response.json()) as OpenMeteoCurrentResponse;
  const temperature = payload.current?.temperature_2m;

  if (typeof temperature !== "number") {
    throw new Error("Weather response missing temperature");
  }

  return {
    temperature: Math.round(temperature),
    weatherCode: payload.current?.weather_code,
  };
}

const usePlantWeather = (fallbackTemperature: number) => {
  const [weather, setWeather] = useState<PlantWeatherState>({
    temperature: fallbackTemperature,
    weatherCode: undefined,
    isLoading: true,
  });

  useEffect(() => {
    const controller = new AbortController();

    const loadWeather = async () => {
      try {
        const nextWeather = await fetchPlantWeather(controller.signal);
        setWeather({ ...nextWeather, isLoading: false });
      } catch {
        setWeather((current) => ({
          temperature: current.temperature || fallbackTemperature,
          weatherCode: current.weatherCode,
          isLoading: false,
        }));
      }
    };

    loadWeather();
    const intervalId = setInterval(loadWeather, WEATHER_REFRESH_MS);

    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
  }, [fallbackTemperature]);

  return weather;
};

// ─── Weather SVG ─────────────────────────────────────────────────────────────

const WeatherStormy: React.FC = () => (
  <Svg width={52} height={42} viewBox="0 0 52 42">
    {[6, 14, 22, 30, 38, 46].map((x, i) => (
      <Line
        key={i}
        x1={x}
        y1={26 + (i % 2) * 3}
        x2={x - 4}
        y2={42}
        stroke="#7ab8e0"
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.75}
      />
    ))}
    <Ellipse cx={26} cy={16} rx={17} ry={9} fill="white" opacity={0.96} />
    <Ellipse cx={14} cy={19} rx={9} ry={6} fill="white" opacity={0.96} />
    <Ellipse cx={37} cy={19} rx={9} ry={6} fill="white" opacity={0.96} />
    <Polygon points="28,12 23,20 27,20 22,28 32,18 27,18" fill="#f5a623" />
  </Svg>
);

const WeatherRainy: React.FC = () => (
  <Svg width={52} height={42} viewBox="0 0 52 42">
    {[14, 24, 34].map((x, i) => (
      <Line
        key={i}
        x1={x}
        y1={28}
        x2={x - 4}
        y2={40}
        stroke="#61b9e8"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.85}
      />
    ))}
    <Ellipse cx={26} cy={17} rx={17} ry={9} fill="white" opacity={0.96} />
    <Ellipse cx={14} cy={20} rx={9} ry={6} fill="white" opacity={0.96} />
    <Ellipse cx={38} cy={20} rx={9} ry={6} fill="white" opacity={0.96} />
  </Svg>
);

const WeatherSunny: React.FC = () => (
  <Svg width={52} height={42} viewBox="0 0 52 42">
    <Circle cx={27} cy={21} r={10} fill="#ffc447" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
      const rad = (angle * Math.PI) / 180;
      const x1 = 27 + Math.cos(rad) * 15;
      const y1 = 21 + Math.sin(rad) * 15;
      const x2 = 27 + Math.cos(rad) * 20;
      const y2 = 21 + Math.sin(rad) * 20;

      return (
        <Line
          key={angle}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#ffc447"
          strokeWidth={2}
          strokeLinecap="round"
        />
      );
    })}
  </Svg>
);

const WeatherCloudy: React.FC = () => (
  <Svg width={52} height={42} viewBox="0 0 52 42">
    <Circle cx={21} cy={16} r={9} fill="#ffd56a" opacity={0.9} />
    <Ellipse cx={28} cy={22} rx={17} ry={9} fill="white" opacity={0.96} />
    <Ellipse cx={16} cy={24} rx={9} ry={6} fill="white" opacity={0.96} />
    <Ellipse cx={39} cy={24} rx={9} ry={6} fill="white" opacity={0.96} />
  </Svg>
);

const WeatherIcon: React.FC<{ weatherCode?: number }> = ({ weatherCode }) => {
  if (isStormWeatherCode(weatherCode)) {
    return <WeatherStormy />;
  }

  if (isRainWeatherCode(weatherCode)) {
    return <WeatherRainy />;
  }

  if (weatherCode != null && weatherCode >= 1 && weatherCode <= 48) {
    return <WeatherCloudy />;
  }

  return <WeatherSunny />;
};

const DateCalendarIcon: React.FC = () => (
  <Svg width={18} height={18} viewBox="0 0 32 32">
    <Rect
      x={5}
      y={6}
      width={22}
      height={22}
      rx={2.5}
      fill="none"
      stroke="#6EA0F6"
      strokeWidth={1.8}
    />
    <Line x1={5} y1={12} x2={27} y2={12} stroke="#6EA0F6" strokeWidth={1.8} />
    <Line
      x1={11}
      y1={4}
      x2={11}
      y2={9}
      stroke="#6EA0F6"
      strokeWidth={2.1}
      strokeLinecap="round"
    />
    <Line
      x1={21}
      y1={4}
      x2={21}
      y2={9}
      stroke="#6EA0F6"
      strokeWidth={2.1}
      strokeLinecap="round"
    />
    {[11, 16, 21].map((x) =>
      [17, 22].map((y) => (
        <Rect
          key={`${x}-${y}`}
          x={x - 1.2}
          y={y - 1.2}
          width={2.4}
          height={2.4}
          fill="#6EA0F6"
        />
      ))
    )}
    <Rect x={10} y={14.8} width={2.4} height={2.4} fill="#6EA0F6" />
    <Rect x={15} y={14.8} width={2.4} height={2.4} fill="#6EA0F6" />
  </Svg>
);

const DateChevron: React.FC<{
  direction: "left" | "right";
  muted?: boolean;
}> = ({ direction, muted }) => {
  const path =
    direction === "left" ? "M20 7 L12 16 L20 25" : "M12 7 L20 16 L12 25";
  return (
    <Svg width={22} height={24} viewBox="0 0 32 32">
      <Path
        d={path}
        fill="none"
        stroke={muted ? "#969696" : "#6EA0F6"}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

const DateSkipIcon: React.FC<{ muted?: boolean }> = ({ muted }) => (
  <Svg width={25} height={24} viewBox="0 0 34 32">
    <Path
      d="M9 7 L17 16 L9 25"
      fill="none"
      stroke={muted ? "#969696" : "#6EA0F6"}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Line
      x1={23}
      y1={8}
      x2={23}
      y2={24}
      stroke={muted ? "#969696" : "#6EA0F6"}
      strokeWidth={2.4}
      strokeLinecap="round"
    />
  </Svg>
);

// ─── Factory + Tower scene ────────────────────────────────────────────────────

const SceneView: React.FC<{ width?: number }> = ({ width = SCREEN_WIDTH }) => {
  const W = width;
  const H = 145;
  const VIEW_H = 180;
  const factoryX = W * 0.17;
  const factoryY = 86;
  const factoryW = W * 0.52;
  const factoryH = 84;
  const leftWallW = factoryW * 0.48;
  const cabinetX = W * 0.46;
  const cabinetY = 126;
  const cabinetW = 28;
  const panelX = factoryX + 12;
  const panelY = 124;
  const panelCellW = W * 0.035;
  const panelRows = [0, 15, 30];
  const panelLineY = panelY + 15;
  const panelLineStartX = cabinetX - 7;
  const panelLineEndX = panelX + panelCellW * 3 + 8;
  const panelLineSegments = Array.from({ length: 8 }).map((_, i) => {
    const x1 = panelLineStartX - i * 10;
    return {
      x1,
      x2: x1 - 6,
      color: i === 2 || i === 4 ? "#f5a623" : "#12b04f",
    };
  });
  return (
    <Svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${VIEW_H}`}
      preserveAspectRatio="none"
    >
      <Defs>
        <LinearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#d0e4f5" />
          <Stop offset="100%" stopColor="#afc8e0" />
        </LinearGradient>
        <LinearGradient id="roof" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#b8cfe6" />
          <Stop offset="100%" stopColor="#8faec8" />
        </LinearGradient>
      </Defs>

      {/* ── Factory body ── */}
      <Rect
        x={factoryX}
        y={factoryY}
        width={factoryW}
        height={factoryH}
        fill="#edf1f8"
      />
      <Rect
        x={factoryX}
        y={factoryY}
        width={leftWallW}
        height={factoryH}
        fill="#b9d8f5"
      />
      <Polygon
        points={`${factoryX},${factoryY} ${
          factoryX + leftWallW
        },${factoryY} ${factoryX},${factoryY + factoryH}`}
        fill="#8ebcf1"
        opacity={0.55}
      />
      <Polygon
        points={`${factoryX},${factoryY} ${factoryX + W * 0.06},${
          factoryY - 15
        } ${factoryX + leftWallW},${factoryY - 15} ${
          factoryX + leftWallW
        },${factoryY}`}
        fill="#1b2f67"
      />
      <Polygon
        points={`${factoryX + leftWallW},${factoryY} ${factoryX + W * 0.38},${
          factoryY - 15
        } ${factoryX + factoryW},${factoryY - 15} ${
          factoryX + factoryW
        },${factoryY}`}
        fill="#192b5f"
      />
      <Polygon
        points={`${factoryX + leftWallW - 10},${factoryY} ${
          factoryX + leftWallW + 26
        },${factoryY - 15} ${factoryX + leftWallW + 26},${factoryY + 22} ${
          factoryX + leftWallW
        },${factoryY + 22}`}
        fill="#f7f8ff"
      />
      <Line
        x1={factoryX}
        y1={factoryY + factoryH}
        x2={factoryX + factoryW}
        y2={factoryY + factoryH}
        stroke="#6e7f99"
        strokeWidth={2}
      />
      {/* solar panels on factory wall */}
      {panelRows.map((rowOffset) => (
        <G key={rowOffset}>
          {[0, 1, 2].map((cell) => (
            <Rect
              key={cell}
              x={panelX + cell * panelCellW}
              y={panelY + rowOffset}
              width={panelCellW - 1}
              height={10}
              rx={1}
              fill="#fde88d"
              stroke="#5f7896"
              strokeWidth={1}
            />
          ))}
        </G>
      ))}
      {/* center panel with logo (red control cabinet – arrows converge here) */}
      <Rect
        x={cabinetX}
        y={cabinetY}
        width={cabinetW}
        height={44}
        rx={2}
        fill="#eff8ff"
        stroke="#8097b2"
        strokeWidth={1.4}
      />
      <Polygon
        points={`${cabinetX + 14},140 ${cabinetX + 8},152 ${cabinetX + 22},152`}
        fill="#d94444"
      />
      {/* windows right */}
      <Rect x={W * 0.58} y={112} width={22} height={16} rx={2} fill="#ddedf8" />
      <Rect x={W * 0.64} y={112} width={22} height={16} rx={2} fill="#ddedf8" />

      {/* ── Arrows (all converge on the red control cabinet at x≈W*0.46+14, y:118-170) ── */}

      {/* down arrow: solar power → top of the cabinet */}
      {[0, 9, 18, 27, 36, 45, 54, 63].map((y) => (
        <Line
          key={y}
          x1={W * 0.46 + 14}
          y1={36 + y}
          x2={W * 0.46 + 14}
          y2={43 + y}
          stroke="#4caf50"
          strokeWidth={3}
          strokeLinecap="round"
        />
      ))}
      <Polygon
        points={`${cabinetX + 14},126 ${cabinetX + 6},114 ${cabinetX + 22},114`}
        fill="#4caf50"
      />

      {/* left arrow: cabinet → solar panels, with orange energy segments */}
      {panelLineSegments.map((segment, i) => (
        <Line
          key={i}
          x1={Math.max(segment.x1, panelLineEndX)}
          y1={panelLineY}
          x2={Math.max(segment.x2, panelLineEndX)}
          y2={panelLineY}
          stroke={segment.color}
          strokeWidth={4}
          strokeLinecap="round"
        />
      ))}
      <Polygon
        points={`${panelLineEndX},${panelLineY} ${panelLineEndX + 12},${
          panelLineY - 7
        } ${panelLineEndX + 12},${panelLineY + 7}`}
        fill="#4caf50"
      />

      {/* right orange arrow: grid → cabinet, at the vertical center of the cabinet (y=140) */}
      <Line
        x1={W * 0.82}
        y1={panelLineY}
        x2={cabinetX + cabinetW}
        y2={panelLineY}
        stroke="#f5a623"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Polygon
        points={`${cabinetX + cabinetW},${panelLineY} ${
          cabinetX + cabinetW + 11
        },${panelLineY - 6} ${cabinetX + cabinetW + 11},${panelLineY + 6}`}
        fill="#f5a623"
      />

      {/* ── Electric tower ── */}
      <Line
        x1={W * 0.87}
        y1={88}
        x2={W * 0.8}
        y2={168}
        stroke="#9ab0c4"
        strokeWidth={2}
      />
      <Line
        x1={W * 0.87}
        y1={88}
        x2={W * 0.94}
        y2={168}
        stroke="#9ab0c4"
        strokeWidth={2}
      />
      <Line
        x1={W * 0.81}
        y1={110}
        x2={W * 0.93}
        y2={110}
        stroke="#9ab0c4"
        strokeWidth={1.5}
      />
      <Line
        x1={W * 0.8}
        y1={128}
        x2={W * 0.94}
        y2={128}
        stroke="#9ab0c4"
        strokeWidth={1.5}
      />
      <Line
        x1={W * 0.78}
        y1={148}
        x2={W * 0.96}
        y2={148}
        stroke="#9ab0c4"
        strokeWidth={1.5}
      />
      <Line
        x1={W * 0.82}
        y1={98}
        x2={W * 0.92}
        y2={98}
        stroke="#9ab0c4"
        strokeWidth={1.5}
      />
      <Circle cx={W * 0.82} cy={98} r={2} fill="#7a9ab0" />
      <Circle cx={W * 0.92} cy={98} r={2} fill="#7a9ab0" />

      {/* ── Trees ── */}
      {[W * 0.04, W * 0.09, W * 0.15, W * 0.2, W * 0.74, W * 0.78].map(
        (x, i) => {
          const h = 22 + (i % 3) * 8;
          return (
            <Rect
              key={i}
              x={x - 5}
              y={170 - h}
              width={10}
              height={h}
              rx={5}
              fill={i % 2 === 0 ? "#4aaa5a" : "#5aba68"}
              opacity={0.9}
            />
          );
        }
      )}
    </Svg>
  );
};

// ─── Stat Bubble ─────────────────────────────────────────────────────────────

const StatBubble: React.FC<{
  value: string;
  unit: string;
  label?: string;
  size: number;
  borderColor: string;
  borderWidth: number;
  valueSize?: number;
}> = ({
  value,
  unit,
  label,
  size,
  borderColor,
  borderWidth,
  valueSize = 24,
}) => (
  <View
    style={[
      styles.bubble,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        borderColor,
        borderWidth,
      },
    ]}
  >
    <View style={styles.bubbleValueRow}>
      <Text style={[styles.bubbleValue, { fontSize: valueSize }]}>{value}</Text>
      <Text style={styles.bubbleUnit}>{unit}</Text>
    </View>
    {label ? <Text style={styles.bubbleLabel}>{label}</Text> : null}
  </View>
);

// ─── Donut chart ──────────────────────────────────────────────────────────────

const DonutChart: React.FC<{
  primaryColor: string;
  secondaryColor: string;
  primaryPct: number;
  size?: number;
}> = ({ primaryColor, secondaryColor, primaryPct, size = 80 }) => {
  const r = (size - 14) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const strokeW = 10;
  const circ = 2 * Math.PI * r;
  const primary = (primaryPct / 100) * circ;
  const secondary = circ - primary;
  return (
    <Svg width={size} height={size}>
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        stroke={secondaryColor}
        strokeWidth={strokeW}
        fill="none"
      />
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        stroke={primaryColor}
        strokeWidth={strokeW}
        fill="none"
        strokeDasharray={`${primary} ${secondary}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
      />
    </Svg>
  );
};

// ─── Area chart (Production & Consumption) ───────────────────────────────────

const AreaChart: React.FC<{
  productionData: number[];
  consumptionData: number[];
  variant?: "merged" | "production" | "consumption";
  markerIndex?: number;
  tooltipValue?: number;
  showReferenceLine?: boolean;
  width?: number;
  height?: number;
}> = ({
  productionData,
  consumptionData,
  variant = "merged",
  markerIndex = 8,
  tooltipValue,
  showReferenceLine = false,
  width = CHART_WIDTH,
  height = 180,
}) => {
  const padL = 32;
  const padR = 8;
  const padT = 16;
  const padB = 28;
  const W = width - padL - padR;
  const H = height - padT - padB;
  const max = Math.max(...productionData, ...consumptionData, 1.6);
  const N = productionData.length;
  const isMerged = variant === "merged";
  const isProduction = variant === "production";
  const markerValue =
    tooltipValue ??
    (isProduction ? productionData[markerIndex] : consumptionData[markerIndex]);

  const px = (i: number) => padL + (i / (N - 1)) * W;
  const py = (v: number) => padT + H - (v / max) * H;
  const endIndex = markerIndex;
  const getSeriesValue = (
    dataSet: number[],
    index: number,
    isActive: boolean
  ) => (isActive && index === markerIndex ? markerValue : dataSet[index]);
  const linePath = (dataSet: number[], isActive = false) =>
    dataSet
      .slice(0, endIndex + 1)
      .map((_, i) => {
        const value = getSeriesValue(dataSet, i, isActive);
        return `${i === 0 ? "M" : "L"}${px(i)},${py(value)}`;
      })
      .join(" ");
  const areaPath = (dataSet: number[], isActive = false) =>
    `${linePath(dataSet, isActive)} L${px(endIndex)},${padT + H} L${px(0)},${
      padT + H
    } Z`;

  const prodPath = areaPath(productionData, isProduction || isMerged);
  const conPath = areaPath(consumptionData, variant === "consumption");

  const yTicks = [0, 0.4, 0.8, 1.2, 1.6];
  const xLabels = [
    { label: "6", idx: 6 },
    { label: "Noon", idx: 12 },
    { label: "18", idx: 18 },
  ];

  return (
    <Svg width={width} height={height}>
      {/* grid lines */}
      {yTicks.map((v) => (
        <G key={v}>
          <Line
            x1={padL}
            y1={py(v)}
            x2={padL + W}
            y2={py(v)}
            stroke="#e0e0e0"
            strokeWidth={0.8}
          />
          <SvgText
            x={padL - 4}
            y={py(v) + 4}
            fontSize={9}
            fill="#aaa"
            textAnchor="end"
          >
            {v}
          </SvgText>
        </G>
      ))}
      {showReferenceLine ? (
        <>
          <Line
            x1={padL}
            y1={py(isProduction ? 0.68 : 1.55)}
            x2={padL + W}
            y2={py(isProduction ? 0.68 : 1.55)}
            stroke="#8a8a8a"
            strokeWidth={1}
            strokeDasharray="6 7"
          />
          <SvgText
            x={padL + 2}
            y={py(isProduction ? 0.68 : 1.55) + 4}
            fontSize={11}
            fontWeight="600"
            fill="#777"
          >
            -Yesterday's high-
          </SvgText>
        </>
      ) : null}
      {isMerged || variant === "consumption" ? (
        <>
          <Path d={conPath} fill={isMerged ? "#ff8a3040" : "#ff8a304f"} />
          <Path
            d={linePath(consumptionData, variant === "consumption")}
            fill="none"
            stroke="#ff9800"
            strokeWidth={1.5}
          />
        </>
      ) : null}
      {isMerged || isProduction ? (
        <>
          <Path d={prodPath} fill={isMerged ? "#2e86de78" : "#13c96045"} />
          <Path
            d={linePath(productionData, isProduction || isMerged)}
            fill="none"
            stroke={isMerged ? "#1684ff" : "#04b850"}
            strokeWidth={1.5}
          />
        </>
      ) : null}
      {variant === "consumption" ? (
        <>
          <Path d={prodPath} fill="#2e86de78" />
          <Path
            d={linePath(productionData)}
            fill="none"
            stroke="#2e86de"
            strokeWidth={1.5}
          />
        </>
      ) : null}
      {/* x axis */}
      <Line
        x1={padL}
        y1={padT + H}
        x2={padL + W}
        y2={padT + H}
        stroke="#ccc"
        strokeWidth={1}
      />
      {xLabels.map(({ label, idx }) => (
        <SvgText
          key={label}
          x={px(idx)}
          y={padT + H + 14}
          fontSize={10}
          fill="#999"
          textAnchor="middle"
        >
          {label}
        </SvgText>
      ))}
      <SvgText x={padL - 2} y={padT + H + 14} fontSize={9} fill="#aaa">
        MW
      </SvgText>
      <Line
        x1={px(markerIndex)}
        y1={padT}
        x2={px(markerIndex)}
        y2={padT + H}
        stroke="#333"
        strokeWidth={2}
      />
      <Circle
        cx={px(markerIndex)}
        cy={py(markerValue)}
        r={5}
        fill="white"
        stroke={isProduction || isMerged ? "#04b850" : "#333"}
        strokeWidth={2}
      />
    </Svg>
  );
};

// ─── Bar chart (Comparative Production) ──────────────────────────────────────

const BarChart: React.FC<{
  data: SolarDashboardData["comparativeData"];
  width?: number;
  height?: number;
}> = ({ data, width = CHART_WIDTH, height = 180 }) => {
  const padL = 40;
  const padR = 8;
  const padT = 16;
  const padB = 32;
  const W = width - padL - padR;
  const H = height - padT - padB;
  const max = Math.max(...data.flatMap((d) => [d.year2025, d.year2026]), 10);
  const barW = (W / data.length) * 0.35;
  const yTicks = [30, 60, 90];

  return (
    <Svg width={width} height={height}>
      {yTicks.map((v) => {
        const y = padT + H - (v / max) * H;
        return (
          <G key={v}>
            <Line
              x1={padL}
              y1={y}
              x2={padL + W}
              y2={y}
              stroke="#e8e8e8"
              strokeWidth={0.8}
            />
            <SvgText
              x={padL - 4}
              y={y + 4}
              fontSize={9}
              fill="#bbb"
              textAnchor="end"
            >
              {v}
            </SvgText>
          </G>
        );
      })}
      {data.map((d, i) => {
        const cx = padL + (i + 0.5) * (W / data.length);
        const y25 = padT + H - (d.year2025 / max) * H;
        const y26 = padT + H - (d.year2026 / max) * H;
        return (
          <G key={d.month}>
            {d.year2025 > 0 && (
              <Rect
                x={cx - barW - 1}
                y={y25}
                width={barW}
                height={padT + H - y25}
                rx={2}
                fill="#4e5ab5"
              />
            )}
            {d.year2026 > 0 && (
              <Rect
                x={cx + 1}
                y={y26}
                width={barW}
                height={padT + H - y26}
                rx={2}
                fill="#42b0e8"
              />
            )}
            <SvgText
              x={cx}
              y={padT + H + 18}
              fontSize={9}
              fill="#aaa"
              textAnchor="middle"
            >
              {d.month}
            </SvgText>
          </G>
        );
      })}
      <Line
        x1={padL}
        y1={padT + H}
        x2={padL + W}
        y2={padT + H}
        stroke="#ddd"
        strokeWidth={1}
      />
      <SvgText
        x={padL - 8}
        y={padT + H + 8}
        fontSize={9}
        fill="#9fb0c8"
        textAnchor="end"
      >
        MWh
      </SvgText>
    </Svg>
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
  const heroVisualHeight = clamp(screenWidth * 0.58, 200, 245);
  const heroCenterBubbleSize = clamp(screenWidth * 0.31, 108, 126);
  const heroSideBubbleSize = clamp(screenWidth * 0.23, 82, 90);
  const heroSideBubbleTop = clamp(screenWidth * 0.17, 54, 72);
  const heroToHomeLeft = clamp(screenWidth * 0.08, 24, 40);
  const heroFromGridLeft = screenWidth * 0.87 - heroSideBubbleSize / 2;

  return (
    <View style={styles.heroSection}>
      <View style={styles.heroTopRow}>
        <View>
          <Text style={styles.prodLabel}>Production Today</Text>
          <Text style={styles.prodValue}>
            {formatMetric(data.productionToday)}{" "}
            <Text style={styles.prodUnit}>kWh</Text>
          </Text>
        </View>
        <View style={styles.weatherRow}>
          {weather.isLoading ? null : (
            <WeatherIcon weatherCode={weather.weatherCode} />
          )}
          <Text style={styles.tempText}>
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
            { transform: [{ translateX: -heroCenterBubbleSize / 2 }] },
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
          <SceneView width={screenWidth} />
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

const PeriodHeader: React.FC<PeriodHeaderProps> = ({
  activeTab,
  canGoNextRange,
  dateRange,
  isCurrentRange,
  onChangeTab,
  onGoCurrentRange,
  onNextRange,
  onOpenDatePicker,
  onPreviousRange,
}) => (
  <View style={styles.stickyPeriodHeader}>
    <View style={styles.tabBar}>
      {PERIOD_TABS.map((tab) => (
        <TouchableOpacity
          key={tab}
          onPress={() => onChangeTab(tab)}
          style={styles.tabItem}
        >
          {activeTab === tab ? (
            <View style={styles.tabActiveChip}>
              <Text style={styles.tabActiveText}>{tab}</Text>
            </View>
          ) : (
            <Text style={styles.tabText}>{tab}</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
    <View style={styles.dateNav}>
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

type SolarDateRangePickerProps = {
  dateRange: SolarDateRange;
  onCancel: () => void;
  onConfirm: (dateRange: SolarDateRange) => void;
  period: PeriodTab;
  visible: boolean;
};

const SolarDateRangePicker: React.FC<SolarDateRangePickerProps> = ({
  dateRange,
  onCancel,
  onConfirm,
  period,
  visible,
}) => {
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

  const monthLabel = visibleMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const selectedTitle =
    period === "Month" || period === "Billing"
      ? tempRange.fromDate.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        })
      : period === "Year"
      ? String(tempRange.fromDate.getFullYear())
      : isSameDate(tempRange.fromDate, tempRange.toDate)
      ? tempRange.fromDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      : `${formatDisplayDate(tempRange.fromDate)} - ${formatDisplayDate(
          tempRange.toDate
        )}`;
  const calendarDates = getCalendarDates(visibleMonth);
  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
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
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.calendarOverlay}>
        <View style={styles.calendarDialog}>
          <Text style={styles.calendarTitle}>Select date</Text>
          <View style={styles.calendarSelectedRow}>
            <Text style={styles.calendarSelectedText}>{selectedTitle}</Text>
            <Ionicons name="pencil-outline" size={28} color="#333" />
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
                <Ionicons name="chevron-up" size={25} color="#888" />
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
                <Ionicons name="chevron-down" size={25} color="#888" />
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

                  return (
                    <TouchableOpacity
                      key={date.toISOString()}
                      style={[
                        styles.calendarDayCell,
                        isInRange && styles.calendarDayInRange,
                      ]}
                      activeOpacity={0.75}
                      onPress={() => handleSelectDate(date)}
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
                            !isCurrentMonth && styles.calendarDayMuted,
                            isSelected && styles.calendarDaySelectedText,
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
              <Text style={styles.calendarActionText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={styles.calendarActionBtn}
            >
              <Text style={styles.calendarActionText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

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
  const chartWidth = screenWidth - 32;
  const menuWidth = screenWidth * 0.6;
  const todayDashboardData = data;
  const [filteredDashboardData, setFilteredDashboardData] =
    useState<SolarDashboardData>(data);
  const [tab, setTab] = useState<PeriodTab>("Day");
  const [graphMode, setGraphMode] = useState<GraphMode>("Merged");
  const [compareMode, setCompareMode] = useState<CompareMode>("Month");
  const [dateRange, setDateRange] =
    useState<SolarDateRange>(createTodayDateRange);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
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
        setFilteredDashboardData(
          usageData ? { ...data, ...usageData } : data
        );
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
    <View style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[2]}
      >
        <SolarHeroSection
          data={todayDashboardData}
          screenWidth={screenWidth}
          weather={weather}
        />

        <EnergyProducedSummary data={todayDashboardData} />

        <PeriodHeader
          activeTab={tab}
          canGoNextRange={canMoveToNextRange(tab, dateRange)}
          dateRange={dateRange}
          isCurrentRange={isCurrentPeriodRange(tab, dateRange)}
          onChangeTab={handleChangePeriodTab}
          onGoCurrentRange={handleGoCurrentRange}
          onNextRange={() => shiftDateRange(1)}
          onOpenDatePicker={() => setDatePickerVisible(true)}
          onPreviousRange={() => shiftDateRange(-1)}
        />

        {/* ════════════════════════════════════════════════
            SECTION 2 – Energy Balance
        ════════════════════════════════════════════════ */}
        <View style={styles.whiteSection}>
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
        <View style={styles.whiteSection}>
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
                <Text style={styles.expandIcon}>⤢</Text>
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
                      <View
                        style={[styles.checkCircle, styles.productionRing]}
                      >
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
                  <Text style={styles.expandIcon}>⤢</Text>
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
                  <Text style={styles.expandIcon}>⤢</Text>
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
        <View style={styles.whiteSection}>
          {/* Comparative Production */}
          <View style={styles.chartHeaderRow}>
            <Text style={styles.chartTitle}>Comparative Production</Text>
            <Text style={styles.expandIcon}>⤢</Text>
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
        <View style={styles.whiteSection}>
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
      <SolarDateRangePicker
        dateRange={dateRange}
        period={tab}
        visible={datePickerVisible}
        onCancel={() => setDatePickerVisible(false)}
        onConfirm={handleConfirmDateRange}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f6fa" },
  scroll: { flex: 1 },
  headerButton: {
    paddingHorizontal: 5,
  },
  menuScrollContent: {
    paddingBottom: 12,
  },

  // Hero section
  heroSection: { backgroundColor: "#a8d8f2", overflow: "hidden" },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  prodLabel: { fontSize: 14, fontWeight: "600", color: "#2a4060" },
  prodValue: {
    fontSize: 36,
    fontWeight: "700",
    color: "#1a3050",
    lineHeight: 43,
  },
  prodUnit: { fontSize: 19, fontWeight: "400" },
  weatherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  tempText: { fontSize: 20, fontWeight: "600", color: "#2a3c50" },

  // Hero visual
  heroVisual: {
    position: "relative",
  },
  sceneWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -4,
  },
  toHomeBubblePosition: {
    position: "absolute",
    zIndex: 2,
  },
  solarPowerBubblePosition: {
    position: "absolute",
    top: 0,
    left: "50%",
    zIndex: 3,
  },
  fromGridBubblePosition: {
    position: "absolute",
    zIndex: 2,
  },
  bubble: {
    backgroundColor: "rgba(255,255,255,0.88)",
    justifyContent: "center",
    alignItems: "center",
  },
  bubbleValueRow: { flexDirection: "row", alignItems: "flex-end" },
  bubbleValue: { fontWeight: "600", color: "#5a7a9a" },
  bubbleUnit: {
    fontSize: 11,
    color: "#7a9ab0",
    marginBottom: 3,
    marginLeft: 2,
  },
  bubbleLabel: {
    fontSize: 10,
    color: "#6a8aa8",
    textAlign: "center",
    lineHeight: 14,
    marginTop: 2,
  },

  // Energy Produced
  energyProducedCard: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  epRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1a2a3a" },
  updatedNow: { fontSize: 12, color: "#aaa" },
  epStats: { flexDirection: "row", alignItems: "center" },
  epItem: { flex: 1, alignItems: "center" },
  epLabel: { fontSize: 12, color: "#888", marginBottom: 2 },
  epValue: { fontSize: 20, fontWeight: "700", color: "#1a2a3a" },
  epUnit: { fontSize: 12, fontWeight: "400", color: "#666" },
  epDivider: { width: 1, height: 36, backgroundColor: "#e8e8e8" },

  // Tabs
  stickyPeriodHeader: {
    backgroundColor: "white",
    zIndex: 10,
    elevation: 4,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#f0f0f5",
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  tabItem: { flex: 1, alignItems: "center" },
  tabActiveChip: {
    backgroundColor: "#4285f4",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  tabActiveText: { color: "white", fontWeight: "600", fontSize: 13 },
  tabText: { color: "#666", fontSize: 13 },

  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    minHeight: 60,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eeeeee",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d9d9d9",
  },
  dateNavSide: {
    width: 72,
    minHeight: 48,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  dateNavRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 14,
  },
  dateNavIconButton: {
    minWidth: 24,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  dateNavIconButtonDisabled: {
    opacity: 0.45,
  },
  dateNavCenter: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dateNavCenterText: {
    fontSize: 15,
    lineHeight: 20,
    color: "#6EA0F6",
    fontWeight: "300",
  },
  calendarOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 24,
  },
  calendarDialog: {
    width: "100%",
    maxWidth: 420,
    minHeight: 456,
    borderRadius: 18,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  calendarTitle: {
    color: "#333",
    fontSize: 18,
    fontWeight: "600",
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  calendarSelectedRow: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#dddddd",
  },
  calendarSelectedText: {
    flex: 1,
    color: "#333",
    fontSize: 34,
    fontWeight: "400",
    marginRight: 16,
  },
  calendarMonthRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
  },
  calendarMonthText: {
    color: "#777",
    fontSize: 20,
    fontWeight: "400",
  },
  calendarMonthControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 28,
  },
  calendarMonthButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarMonthButtonDisabled: {
    opacity: 0.35,
  },
  calendarWeekRow: {
    flexDirection: "row",
    paddingHorizontal: 28,
    marginTop: 8,
  },
  calendarWeekText: {
    flex: 1,
    color: "#333",
    fontSize: 20,
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 28,
    paddingTop: 18,
  },
  calendarDayCell: {
    width: `${100 / 7}%`,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayInRange: {
    backgroundColor: "#eaf1ff",
  },
  calendarDayCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDaySelected: {
    backgroundColor: "#5d8ff6",
  },
  calendarDayText: {
    color: "#777",
    fontSize: 22,
    fontWeight: "400",
  },
  calendarDayMuted: {
    color: "#c7c7c7",
  },
  calendarDaySelectedText: {
    color: "#fff",
  },
  calendarOptionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    minHeight: 280,
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  calendarOptionCell: {
    width: "25%",
    height: 76,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarOptionCircle: {
    minWidth: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  calendarOptionSelected: {
    backgroundColor: "#5d8ff6",
  },
  calendarOptionDisabled: {
    opacity: 0.35,
  },
  calendarOptionText: {
    color: "#333",
    fontSize: 22,
    fontWeight: "400",
  },
  calendarOptionSelectedText: {
    color: "#fff",
  },
  calendarOptionDisabledText: {
    color: "#9a9a9a",
  },
  calendarActionRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    gap: 28,
  },
  calendarActionBtn: {
    minWidth: 64,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarActionText: {
    color: "#6EA0F6",
    fontSize: 18,
  },

  // White sections
  whiteSection: {
    backgroundColor: "white",
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  // Energy Balance
  balanceSubLabel: {
    fontSize: 14,
    color: "#555",
    marginTop: 12,
    marginBottom: 4,
  },
  balanceBigValue: {
    fontSize: 36,
    fontWeight: "700",
    color: "#1a2a3a",
    lineHeight: 44,
  },
  balanceUnit: { fontSize: 18, fontWeight: "400", color: "#666" },
  barTrack: {
    flexDirection: "row",
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    marginVertical: 10,
    backgroundColor: "#eee",
  },
  barFill: { height: 10 },
  toHomeBarFill: { backgroundColor: "#4caf50" },
  toGridBarFill: { backgroundColor: "#42b0e8" },
  fromSolarBarFill: { backgroundColor: "#42b0e8" },
  fromGridBarFill: { backgroundColor: "#f5a623" },
  donutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginVertical: 8,
  },
  legendCol: { flex: 1, gap: 10 },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  balanceToHomeDot: { backgroundColor: "#4caf50" },
  balanceToGridDot: { backgroundColor: "#42b0e8" },
  balanceFromSolarDot: { backgroundColor: "#42b0e8" },
  balanceFromGridDot: { backgroundColor: "#f5a623" },
  year2025Dot: { backgroundColor: "#42b0e8" },
  year2026Dot: { backgroundColor: "#4e5ab5" },
  legendLabel: { fontSize: 13, color: "#555", flex: 1 },
  legendValue: { fontSize: 13, color: "#333", fontWeight: "500" },
  separator: { height: 1, backgroundColor: "#eee", marginVertical: 14 },
  selfConsumptionRow: { marginTop: 12 },
  selfText: { fontSize: 13, color: "#555" },
  selfBold: { fontWeight: "700", color: "#1a2a3a" },
  productionDot: { backgroundColor: "#04b850" },
  productionRing: { borderColor: "#04b850" },
  consumptionDot: { backgroundColor: "#ff9800" },
  consumptionRing: { borderColor: "#ff9800" },
  toGridDot: { backgroundColor: "#16b8cc" },
  toGridRing: { borderColor: "#16b8cc" },
  fromSolarDot: { backgroundColor: "#2e86de" },
  fromSolarRing: { borderColor: "#2e86de" },
  selfDot: { backgroundColor: "#2e86de" },
  selfRing: { borderColor: "#2e86de" },

  // Chart
  chartHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  chartTitle: { fontSize: 15, fontWeight: "700", color: "#1a2a3a" },
  expandIcon: { fontSize: 18, color: "#888" },
  infoIcon: { fontSize: 18, color: "#999" },

  tooltipBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#222",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: "center",
    marginBottom: 4,
  },
  tooltipText: { color: "white", fontSize: 13, fontWeight: "500" },
  splitChartBlock: {
    marginTop: 18,
  },

  chartLegendRow: {
    flexDirection: "row",
    gap: 20,
    marginTop: 10,
    flexWrap: "wrap",
  },
  chartLegendRowCompact: {
    gap: 10,
    flexWrap: "nowrap",
  },
  chartLegendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  chartLegendItemCompact: { gap: 4, flexShrink: 1 },
  chartLegendText: { fontSize: 13, color: "#444" },
  chartLegendTextMuted: { fontSize: 13, color: "#888" },
  chartLegendTextCompact: { fontSize: 11, flexShrink: 1 },
  chartLegendTextSmall: { fontSize: 12, color: "#888", lineHeight: 17 },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleCompact: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  checkDot: { width: 10, height: 10, borderRadius: 5 },
  checkDotCompact: { width: 8, height: 8, borderRadius: 4 },

  // Toggle Merged/Split
  toggleRow: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#4285f4",
    overflow: "hidden",
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "white",
  },
  toggleBtnActive: { backgroundColor: "#eef3ff" },
  toggleText: { fontSize: 14, color: "#555" },
  toggleTextActive: { color: "#4285f4", fontWeight: "600" },

  // Sub-tabs
  subTabRow: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#4285f4",
    overflow: "hidden",
    marginBottom: 8,
  },
  subTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "white",
  },
  subTabActive: { backgroundColor: "#eef3ff" },
  subTabText: { fontSize: 13, color: "#555" },
  subTabTextActive: { color: "#4285f4", fontWeight: "600" },

  // Environmental
  envRow: { flexDirection: "row", marginTop: 12 },
  envItem: { flex: 1, alignItems: "center", gap: 4 },
  envValue: { fontSize: 30, fontWeight: "700", color: "#1a2a3a" },
  envLabel: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    lineHeight: 18,
  },
});

export default SolarFullScreen;
