import { useEffect, useState } from "react";

import { Dimensions } from "react-native";

import type { TreeNode } from "../../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 32;
const MAX_SOLAR_CONTENT_WIDTH = 720;
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const getSolarContentWidth = (screenWidth: number) => screenWidth;
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
type ExpandedChart =
  | "production-consumption"
  | "production"
  | "consumption"
  | "comparative";

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

const EXPANDED_COMPARATIVE_MOCK_DATA: SolarDashboardData["comparativeData"] = [
  { month: "Jan", year2025: 0, year2026: 88 },
  { month: "Feb", year2025: 0, year2026: 62 },
  { month: "Mar", year2025: 0, year2026: 108 },
  { month: "Apr", year2025: 0, year2026: 98 },
  { month: "May", year2025: 0, year2026: 101 },
  { month: "Jun", year2025: 0, year2026: 104 },
  { month: "Jul", year2025: 0, year2026: 14 },
  { month: "Aug", year2025: 0, year2026: 0 },
  { month: "Sep", year2025: 0, year2026: 0 },
  { month: "Oct", year2025: 8, year2026: 0 },
  { month: "Nov", year2025: 72, year2026: 0 },
  { month: "Dec", year2025: 90, year2026: 0 },
];

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

export {
  addDays,
  addMonths,
  BEN_LUC_SOLAR_METER_ID,
  buildSolarPayload,
  canMoveToNextRange,
  CHART_WIDTH,
  clamp,
  createTodayDateRange,
  DEFAULT_DATA,
  DEFAULT_SOLAR_METER_ID,
  EXPANDED_COMPARATIVE_MOCK_DATA,
  formatDateRangeLabel,
  formatDisplayDate,
  formatLargeMetric,
  formatMetric,
  getCalendarDates,
  getDateRangeForPeriod,
  getSolarContentWidth,
  getYearGridStart,
  getYearGridYears,
  isCurrentPeriodRange,
  isDateInRange,
  isFutureDateRange,
  isFutureMonth,
  isFutureYear,
  isRainWeatherCode,
  isSameDate,
  isStormWeatherCode,
  mapChiSoTotalToConsumption,
  MAX_SOLAR_CONTENT_WIDTH,
  PERIOD_TABS,
  roundTo,
  SCREEN_WIDTH,
  SOLAR_PLANT_TREE_DATA,
  startOfDay,
  startOfMonth,
  usePlantWeather,
};

export type {
  CompareMode,
  ExpandedChart,
  GraphMode,
  PeriodTab,
  PlantWeatherState,
  SolarApiResponse,
  SolarDateRange,
};
