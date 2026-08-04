import { useEffect, useState } from "react";

import { Dimensions } from "react-native";

import type {
  SolarEnergyData,
  SolarEnergyDetailsData,
  SolarEnvBenefitsData,
  SolarMeterPoint,
  SolarMeterSeries,
  SolarOverviewData,
  SolarPowerDetailsData,
  SolarPowerFlowData,
  SolarSite,
  SolarTimeUnit,
  SolarUnit,
} from "../../services/data/solarApi";
import type { TreeNode } from "../../types";
import { externalFetch } from "../../services/network/externalHttp";

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
  temperature: number | null;
  weatherCode?: number;
  isLoading: boolean;
};

type SolarDateRange = {
  fromDate: Date;
  toDate: Date;
};

/** Nhãn tiếng Việt của 5 kỳ lọc, bám theo quy ước của bản web. */
const PERIOD_TAB_LABELS: Record<PeriodTab, string> = {
  Day: "Hôm nay",
  Week: "Tuần này",
  Month: "Tháng này",
  Year: "Năm nay",
  Billing: "Kỳ hoá đơn",
};

// ─── Định dạng số (1.5 của tài liệu) ─────────────────────────────────────────

/** Không có số thì hiện dấu gạch, KHÔNG hiện 0. */
const NO_VALUE = "—";

/**
 * Màu hai cột của biểu đồ so sánh sản lượng. Khai báo ở đây vì cả biểu đồ (fill
 * của Svg) và chú giải (style của chấm tròn) đều phải dùng đúng một mã màu.
 */
const COMPARE_PREVIOUS_YEAR_COLOR = "#4aa3e0";
const COMPARE_CURRENT_YEAR_COLOR = "#8b5cf6";

const hasNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/**
 * Định dạng số theo kiểu Việt Nam: dấu chấm ngăn nghìn, dấu phẩy thập phân
 * (1.234,56). Tự viết thay vì dùng Intl để số hiển thị giống nhau trên mọi máy.
 */
const formatVnNumber = (value: number, digits = 0) => {
  const fixed = Math.abs(value).toFixed(digits);
  const [intPart, decimalPart] = fixed.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = value < 0 ? "-" : "";

  return decimalPart ? `${sign}${grouped},${decimalPart}` : `${sign}${grouped}`;
};

type MetricParts = { value: string; unit: string };

const NO_METRIC: MetricParts = { value: NO_VALUE, unit: "" };

/**
 * Điện năng: API luôn trả Wh.
 *   |giá trị| >= 1.000.000  ->  MWh, 2 số lẻ
 *   còn lại                 ->  kWh, 0 số lẻ
 */
const formatEnergy = (wh: number | null | undefined): MetricParts => {
  if (!hasNumber(wh)) return NO_METRIC;

  return Math.abs(wh) >= 1_000_000
    ? { value: formatVnNumber(wh / 1_000_000, 2), unit: "MWh" }
    : { value: formatVnNumber(wh / 1_000, 0), unit: "kWh" };
};

/**
 * Công suất: API trả W (sau khi đã quy đổi theo trường `unit` của khối).
 *   |giá trị| >= 1.000.000  ->  MW, 2 số lẻ
 *   còn lại                 ->  kW, 1 số lẻ
 */
const formatPower = (watt: number | null | undefined): MetricParts => {
  if (!hasNumber(watt)) return NO_METRIC;

  return Math.abs(watt) >= 1_000_000
    ? { value: formatVnNumber(watt / 1_000_000, 2), unit: "MW" }
    : { value: formatVnNumber(watt / 1_000, 1), unit: "kW" };
};

/**
 * Công suất luôn quy về MW, 2 số lẻ — KHÔNG tự đổi sang kW như quy tắc 1.5.
 *
 * Biểu đồ công suất trong ngày và tooltip của nó phải giữ một đơn vị cố định:
 * trục Y đã chia theo MW, nếu tooltip lúc thì "0,21 MW" lúc thì "210,0 kW" thì
 * người xem không đối chiếu được với trục. Bản web/app gốc cũng cố định MW ở đây.
 */
const formatPowerMw = (watt: number | null | undefined): MetricParts =>
  hasNumber(watt)
    ? { value: formatVnNumber(watt / 1_000_000, 2), unit: "MW" }
    : NO_METRIC;

/** Tỉ trọng trong biểu đồ: 0 số lẻ. Tỉ lệ so sánh: 2 số lẻ. */
const formatPercent = (percent: number | null | undefined, digits = 0) =>
  hasNumber(percent) ? `${formatVnNumber(percent, digits)}%` : NO_VALUE;

/** Số nguyên lớn (kg CO₂, km) theo định dạng Việt Nam. */
const formatCount = (value: number | null | undefined, digits = 0) =>
  hasNumber(value) ? formatVnNumber(value, digits) : NO_VALUE;

/** `MetricParts` ghép lại thành một chuỗi, dùng cho tooltip / dòng chú giải. */
const formatMetricText = (parts: MetricParts) =>
  parts.unit ? `${parts.value} ${parts.unit}` : parts.value;

const toPercent = (part: number | null, total: number | null) => {
  if (!hasNumber(part) || !hasNumber(total) || total === 0) return null;
  return clamp((part / total) * 100, 0, 100);
};

/** Hệ số quy đổi đơn vị của khối về W hoặc Wh. */
const unitFactor = (unit: SolarUnit | null | undefined) => {
  const normalized = String(unit ?? "").trim().toUpperCase();

  if (normalized === "MW" || normalized === "MWH") return 1_000_000;
  if (normalized === "KW" || normalized === "KWH") return 1_000;
  return 1;
};

const roundTo = (value: number, digits = 2) => Number(value.toFixed(digits));

// ─── Ngày tháng ───────────────────────────────────────────────────────────────

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

const pad2 = (value: number) => String(value).padStart(2, "0");

/**
 * `yyyy-MM-dd` theo giờ máy. Cố tình KHÔNG dùng `toISOString()`: hàm đó đổi về
 * UTC nên ở múi giờ +07 ngày bị lùi lại một hôm.
 */
const formatApiDate = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

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

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * timeUnit gửi cho `dashboard-energy-details`, theo quy ước của bản web:
 * kỳ Năm dùng MONTH, các kỳ còn lại dùng DAY. Khoảng dài hơn 365 ngày PHẢI hạ
 * xuống MONTH vì nhà cung cấp chỉ cho DAY tối đa 1 năm.
 */
const getEnergyDetailsTimeUnit = (
  period: PeriodTab,
  { fromDate, toDate }: SolarDateRange
): SolarTimeUnit => {
  if (period === "Year") return "MONTH";

  const spanDays =
    (startOfDay(toDate).getTime() - startOfDay(fromDate).getTime()) / DAY_MS + 1;

  return spanDays > 365 ? "MONTH" : "DAY";
};

/**
 * `dashboard-power-details` chỉ nhận đúng 1 ngày. Với các kỳ nhiều ngày, lấy
 * ngày cuối của kỳ nhưng không vượt quá hôm nay.
 */
const getPowerDetailsDate = ({ toDate }: SolarDateRange) => {
  const today = startOfDay(new Date());
  const end = startOfDay(toDate);

  return end.getTime() > today.getTime() ? today : end;
};

const formatDisplayDate = (date: Date) =>
  `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;

const formatMonthYear = (date: Date) =>
  `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;

const formatUpdateTimeLabel = (raw: string | null | undefined) => {
  if (!raw) return null;

  // "2026-08-03 09:04:00" — cắt lấy giờ:phút, không parse Date để tránh lệch
  // múi giờ (server trả giờ địa phương của site, không kèm offset).
  const match = /(\d{1,2}):(\d{2})/.exec(raw);
  return match ? `${pad2(Number(match[1]))}:${match[2]}` : null;
};

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

const isFutureDate = (date: Date) =>
  startOfDay(date).getTime() > startOfDay(new Date()).getTime();

const isFutureDateRange = ({ fromDate }: SolarDateRange) =>
  isFutureDate(fromDate);

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
    return "Hôm nay";
  }

  const yesterday = addDays(today, -1);

  if (
    period === "Day" &&
    isSameDate(fromDate, yesterday) &&
    isSameDate(toDate, yesterday)
  ) {
    return "Hôm qua";
  }

  if (period === "Month") {
    return formatMonthYear(fromDate);
  }

  if (period === "Year") {
    return `Năm ${fromDate.getFullYear()}`;
  }

  if (isSameDate(fromDate, toDate)) {
    return formatDisplayDate(fromDate);
  }

  return `${formatDisplayDate(fromDate)} - ${formatDisplayDate(toDate)}`;
};

const formatLongDate = (date: Date) => {
  const weekDay = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"][
    date.getDay()
  ];

  return `${weekDay}, ${formatDisplayDate(date)}`;
};

// ─── Site (danh sách nhà máy) ────────────────────────────────────────────────

/**
 * `get-list-solar` -> `TreeNode` để dùng lại `AssetTreeNodeItem` trong panel
 * chọn nhà máy.
 */
const mapSitesToTreeNodes = (sites: SolarSite[]): TreeNode[] =>
  sites
    .filter((site) => site?.iD_DongHoSolar != null)
    .map((site, index) => ({
      index: index + 1,
      parent: null,
      text: site.siteName?.trim() || `Đồng hồ ${site.iD_DongHoSolar}`,
      value: String(site.iD_DongHoSolar),
      property: "solarPlant",
      expanded: true,
    }));

// ─── Khối 1: dòng năng lượng thời gian thực ──────────────────────────────────

const FLOW_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  IDLE: "Đang nghỉ",
  DISABLED: "Ngưng hoạt động",
};

const mapFlowStatus = (status: string | null | undefined) => {
  const normalized = String(status ?? "").trim().toUpperCase();
  return FLOW_STATUS_LABELS[normalized] ?? (status?.trim() || null);
};

type SolarPowerFlowView = {
  /** Công suất đã quy về W. */
  pvPower: number | null;
  loadPower: number | null;
  gridPower: number | null;
  pvStatus: string | null;
  loadStatus: string | null;
  gridStatus: string | null;
  /** Đang bán điện lên lưới (đọc từ `connections`, KHÔNG suy từ dấu của số). */
  isExportingToGrid: boolean;
  /** Điện mặt trời đang gánh bao nhiêu % mức tiêu thụ. */
  solarSharePercent: number | null;
  hasData: boolean;
};

const mapPowerFlow = (data: SolarPowerFlowData): SolarPowerFlowView => {
  const flow = data?.siteCurrentPowerFlow;
  // Site này trả unit = "kW" chứ KHÔNG phải "W" như tài liệu gốc của nhà cung
  // cấp: cứ mặc định W là hiển thị sai 1000 lần.
  const factor = unitFactor(flow?.unit);

  const toWatt = (value: number | null | undefined) =>
    hasNumber(value) ? value * factor : null;

  const pvPower = toWatt(flow?.PV?.currentPower);
  const loadPower = toWatt(flow?.LOAD?.currentPower);

  return {
    pvPower,
    loadPower,
    gridPower: toWatt(flow?.GRID?.currentPower),
    pvStatus: mapFlowStatus(flow?.PV?.status),
    loadStatus: mapFlowStatus(flow?.LOAD?.status),
    gridStatus: mapFlowStatus(flow?.GRID?.status),
    isExportingToGrid: (flow?.connections ?? []).some(
      (connection) =>
        String(connection?.to ?? "").trim().toUpperCase() === "GRID"
    ),
    solarSharePercent: toPercent(pvPower, loadPower),
    hasData: flow != null,
  };
};

// ─── Khối 2: sản lượng tích luỹ ──────────────────────────────────────────────

type SolarOverviewView = {
  /** Điện năng Wh. */
  today: number | null;
  thisMonth: number | null;
  thisYear: number | null;
  lifetime: number | null;
  /** "cập nhật {giờ}" — đã cắt sẵn HH:mm. */
  updatedAt: string | null;
};

const mapOverview = (data: SolarOverviewData): SolarOverviewView => {
  const overview = data?.overview;
  const energyOf = (value: number | null | undefined) =>
    hasNumber(value) ? value : null;

  return {
    today: energyOf(overview?.lastDayData?.energy),
    thisMonth: energyOf(overview?.lastMonthData?.energy),
    thisYear: energyOf(overview?.lastYearData?.energy),
    lifetime: energyOf(overview?.lifeTimeData?.energy),
    updatedAt: formatUpdateTimeLabel(overview?.lastUpdateTime),
  };
};

// ─── Khối 3: cân bằng năng lượng ─────────────────────────────────────────────

const findMeter = (
  meters: SolarMeterSeries[] | null | undefined,
  type: string
) =>
  meters?.find(
    (meter) => String(meter?.type ?? "").trim().toLowerCase() === type.toLowerCase()
  );

/** Cộng dồn toàn bộ `values` của một meter. Không có điểm nào -> null. */
const sumMeterValues = (
  meters: SolarMeterSeries[] | null | undefined,
  type: string,
  factor: number
) => {
  const values = findMeter(meters, type)?.values;
  if (!values?.length) return null;

  const numbers = values.filter((point) => hasNumber(point?.value));
  if (!numbers.length) return null;

  return numbers.reduce((sum, point) => sum + (point.value as number), 0) * factor;
};

/**
 * Một mốc của chuỗi energy-details: 1 ngày (kỳ Tuần/Tháng) hoặc 1 tháng (kỳ
 * Năm), theo `timeUnit` đã gửi khi gọi API. Đây là nguồn dữ liệu cho biểu đồ cột
 * ở các kỳ dài hơn 1 ngày — power-details chỉ có dữ liệu của đúng 1 ngày nên
 * không dùng được ở đó.
 */
type SolarEnergyBucket = {
  /** Mốc thời gian của bucket; null khi chuỗi ngày của API không đọc được. */
  date: Date | null;
  /** Điện năng Wh. Thiếu số coi là 0 — cột không vẽ, khác với đường biểu đồ. */
  production: number;
  consumption: number;
  selfConsumption: number;
  feedIn: number;
  purchased: number;
};

type SolarEnergyBalanceView = {
  /** Điện năng Wh. */
  production: number | null;
  consumption: number | null;
  selfConsumption: number | null;
  feedIn: number | null;
  purchased: number | null;
  /** Chuỗi theo mốc, để vẽ biểu đồ cột. Rỗng khi API không trả `values`. */
  buckets: SolarEnergyBucket[];
  /** Mốc mới nhất còn số liệu — mốc được nhấn mạnh và hiện trên tooltip. */
  lastBucketIndex: number;
  /** Tỉ trọng trong biểu đồ (0-100). */
  selfOfProductionPercent: number | null;
  feedInPercent: number | null;
  selfOfConsumptionPercent: number | null;
  purchasedPercent: number | null;
  hasData: boolean;
};

/**
 * Dựng chuỗi theo mốc từ 5 meter. Mốc thời gian lấy HỢP của cả 5 chuỗi chứ không
 * lấy riêng một chuỗi làm trục: chuỗi nào cũng có thể thiếu vài mốc, lấy một
 * chuỗi thì mất luôn mốc mà chỉ chuỗi khác có.
 */
const buildEnergyBuckets = (
  meters: SolarMeterSeries[] | null | undefined,
  factor: number
): SolarEnergyBucket[] => {
  const series = {
    production: indexPointsByDate(findMeter(meters, "Production")?.values),
    consumption: indexPointsByDate(findMeter(meters, "Consumption")?.values),
    selfConsumption: indexPointsByDate(
      findMeter(meters, "SelfConsumption")?.values
    ),
    feedIn: indexPointsByDate(findMeter(meters, "FeedIn")?.values),
    purchased: indexPointsByDate(findMeter(meters, "Purchased")?.values),
  };

  // Chuỗi ngày của API là "YYYY-MM-DD HH:mm:ss" nên sắp theo chuỗi là đúng thứ
  // tự thời gian, không cần parse trước khi sắp.
  const dates = Array.from(
    new Set(
      Object.values(series).flatMap((points) => Array.from(points.keys()))
    )
  ).sort();

  return dates.map((date) => ({
    date: parseMeterDate(date),
    production: (series.production.get(date) ?? 0) * factor,
    consumption: (series.consumption.get(date) ?? 0) * factor,
    selfConsumption: (series.selfConsumption.get(date) ?? 0) * factor,
    feedIn: (series.feedIn.get(date) ?? 0) * factor,
    purchased: (series.purchased.get(date) ?? 0) * factor,
  }));
};

const mapEnergyDetails = (
  data: SolarEnergyDetailsData
): SolarEnergyBalanceView => {
  const details = data?.energyDetails;
  const factor = unitFactor(details?.unit);
  const meters = details?.meters;

  const production = sumMeterValues(meters, "Production", factor);
  const consumption = sumMeterValues(meters, "Consumption", factor);
  const selfConsumption = sumMeterValues(meters, "SelfConsumption", factor);
  const feedIn = sumMeterValues(meters, "FeedIn", factor);
  const purchased = sumMeterValues(meters, "Purchased", factor);
  const buckets = buildEnergyBuckets(meters, factor);

  let lastBucketIndex = -1;
  buckets.forEach((bucket, index) => {
    if (bucket.production > 0 || bucket.consumption > 0) {
      lastBucketIndex = index;
    }
  });

  return {
    production,
    consumption,
    selfConsumption,
    feedIn,
    purchased,
    buckets,
    lastBucketIndex,
    selfOfProductionPercent: toPercent(selfConsumption, production),
    feedInPercent: toPercent(feedIn, production),
    selfOfConsumptionPercent: toPercent(selfConsumption, consumption),
    purchasedPercent: toPercent(purchased, consumption),
    hasData:
      production != null ||
      consumption != null ||
      selfConsumption != null ||
      feedIn != null ||
      purchased != null,
  };
};

// ─── Biểu đồ cột năng lượng (kỳ Tuần / Tháng / Năm) ──────────────────────────

/**
 * Ở kỳ dài hơn 1 ngày, biểu đồ vẽ ĐIỆN NĂNG từng mốc (cột) chứ không phải công
 * suất theo thời gian (đường): power-details chỉ trả dữ liệu của đúng một ngày,
 * nên ở kỳ Tuần/Tháng/Năm nó không đại diện cho cả kỳ.
 */
type EnergyChartKind = "merged" | "production" | "consumption";

/** Một đoạn cột: giá trị đã quy về đơn vị hiển thị của biểu đồ. */
type EnergyBarSegment = { color: string; value: number };

type EnergyBarColumn = {
  /** Các đoạn xếp tầng từ dưới lên. */
  stack: EnergyBarSegment[];
  /** Vẽ đè lên cột, hẹp hơn — dùng cho "Tự dùng" nằm trong cột "Tiêu thụ". */
  overlay?: EnergyBarSegment | null;
};

type EnergyBarBucket = {
  label: string;
  /** Các cột đứng cạnh nhau trong cùng một mốc. */
  columns: EnergyBarColumn[];
};

type EnergyBarChartView = {
  buckets: EnergyBarBucket[];
  markerIndex: number;
  /** Nhãn mốc được nhấn mạnh, dùng cho tooltip. */
  markerLabel: string;
  /** Giá trị Wh của mốc đó theo chuỗi chính của biểu đồ. */
  markerValue: number | null;
  unitLabel: string;
};

/**
 * Màu các chuỗi trong biểu đồ cột. PHẢI trùng màu chấm chú giải đang dùng ở khối
 * này (`styles.productionDot`, `styles.consumptionDot`, `styles.selfDot`,
 * `styles.toGridDot`, `styles.fromSolarDot`) — chú giải khác màu cột thì người
 * xem không đối chiếu được.
 */
const ENERGY_BAR_COLORS = {
  production: "#2a78d6",
  /** Cột "Tiêu thụ" để nhạt vì cột "Tự dùng" vẽ đè lên trên. */
  consumption: "#eb683499",
  self: "#1baf7a",
  grid: "#eb6834",
};

/**
 * Đơn vị trục Y chọn MỘT LẦN theo cột cao nhất rồi dùng cho cả biểu đồ. Không
 * dùng `formatEnergy` cho từng cột: mỗi cột ra một đơn vị thì trục Y hết nghĩa.
 */
const energyChartScale = (maxWh: number) => {
  if (maxWh >= 1_000_000_000) return { factor: 1_000_000_000, unit: "GWh" };
  if (maxWh >= 1_000_000) return { factor: 1_000_000, unit: "MWh" };
  return { factor: 1_000, unit: "kWh" };
};

/** Nhãn trục X: kỳ Năm là tháng, kỳ Tháng là ngày trong tháng, còn lại là d/M. */
const formatEnergyBucketLabel = (period: PeriodTab, date: Date | null) => {
  if (!date) return "";
  if (period === "Year") return `T${date.getMonth() + 1}`;
  if (period === "Month" || period === "Billing") return String(date.getDate());

  return `${date.getDate()}/${date.getMonth() + 1}`;
};

/**
 * Nhãn mốc trên tooltip: ghi đủ ngày/tháng-năm, khác nhãn trục X vốn phải cắt
 * ngắn cho vừa chỗ.
 */
const formatEnergyBucketFullLabel = (period: PeriodTab, date: Date | null) => {
  if (!date) return "";

  return period === "Year" ? formatMonthYear(date) : formatDisplayDate(date);
};

const buildEnergyBarChart = (
  balance: SolarEnergyBalanceView | null,
  period: PeriodTab,
  kind: EnergyChartKind
): EnergyBarChartView | null => {
  const source = balance?.buckets ?? [];
  if (!source.length) return null;

  const columnTotal = (bucket: SolarEnergyBucket) =>
    kind === "merged"
      ? Math.max(bucket.production, bucket.consumption)
      : kind === "production"
      ? bucket.selfConsumption + bucket.feedIn
      : bucket.selfConsumption + bucket.purchased;

  const peak = source.reduce(
    (max, bucket) => Math.max(max, columnTotal(bucket)),
    0
  );
  const { factor, unit } = energyChartScale(peak);
  const scale = (wh: number) => roundTo(wh / factor, 6);

  const buckets: EnergyBarBucket[] = source.map((bucket) => ({
    label: formatEnergyBucketLabel(period, bucket.date),
    columns:
      kind === "merged"
        ? [
            {
              stack: [
                {
                  color: ENERGY_BAR_COLORS.production,
                  value: scale(bucket.production),
                },
              ],
            },
            {
              stack: [
                {
                  color: ENERGY_BAR_COLORS.consumption,
                  value: scale(bucket.consumption),
                },
              ],
              overlay: {
                color: ENERGY_BAR_COLORS.self,
                value: scale(bucket.selfConsumption),
              },
            },
          ]
        : [
            {
              // Xếp tầng: phần dùng tại nhà máy ở dưới, phần đi/về lưới ở trên —
              // cộng lại đúng bằng cột Sản xuất (hoặc Tiêu thụ) của mốc đó.
              stack: [
                {
                  // Phần dưới lấy đúng màu chấm chú giải của chính biểu đồ đó:
                  // biểu đồ Sản xuất ghi "Tự dùng" bằng chấm `productionDot`,
                  // còn biểu đồ Tiêu thụ ghi "Từ mặt trời" bằng `fromSolarDot`.
                  color:
                    kind === "production"
                      ? ENERGY_BAR_COLORS.production
                      : ENERGY_BAR_COLORS.self,
                  value: scale(bucket.selfConsumption),
                },
                {
                  color: ENERGY_BAR_COLORS.grid,
                  value: scale(
                    kind === "production" ? bucket.feedIn : bucket.purchased
                  ),
                },
              ],
            },
          ],
  }));

  const markerIndex = balance?.lastBucketIndex ?? -1;
  const marker = markerIndex >= 0 ? source[markerIndex] : null;

  return {
    buckets,
    markerIndex,
    markerLabel: marker
      ? formatEnergyBucketFullLabel(period, marker.date)
      : "",
    markerValue: marker
      ? kind === "consumption"
        ? marker.consumption
        : marker.production
      : null,
    unitLabel: unit,
  };
};

// ─── Khối 4: công suất trong ngày ────────────────────────────────────────────

/** Công suất đỉnh (W) của một ngày, dùng vẽ đường tham chiếu. */
type SolarPowerPeak = {
  production: number | null;
  consumption: number | null;
};

/** Ba mốc giờ được ghi nhãn trên trục X của biểu đồ công suất trong ngày. */
const POWER_X_LABEL_HOURS = [6, 12, 18];

/** Mốc giữa ngày ghi chữ cho dễ đọc, hai mốc còn lại để số giờ. */
const POWER_X_LABEL_TEXT: Record<number, string> = { 12: "Trưa" };

type SolarPowerSeriesView = {
  /** Công suất W tại từng mốc; Production/SelfConsumption thiếu số coi là 0. */
  production: number[];
  selfConsumption: number[];
  /** Consumption thiếu số để TRỐNG, không ép về 0. */
  consumption: (number | null)[];
  /** "HH:mm" của từng mốc, dùng cho tooltip. */
  times: string[];
  /** Nhãn trục X của biểu đồ công suất: chỉ 3 mốc 6 - Trưa - 18. */
  xLabels: { label: string; idx: number }[];
  /**
   * Tổng số mốc của CẢ ngày (kể cả phần chưa tới). Trục X phải trải hết 24 giờ
   * như app nhà cung cấp, phần chưa có số để trống chứ không kéo giãn dữ liệu.
   */
  domainCount: number;
  /** Mốc cuối cùng còn số liệu. */
  lastIndex: number;
  hasData: boolean;
  /** Đỉnh của ngày liền trước; null khi không lấy được. */
  previousDayPeak: SolarPowerPeak | null;
};

const EMPTY_POWER_SERIES: SolarPowerSeriesView = {
  production: [],
  selfConsumption: [],
  consumption: [],
  times: [],
  xLabels: [],
  domainCount: 0,
  lastIndex: -1,
  hasData: false,
  previousDayPeak: null,
};

const parseMeterDate = (raw: string | null | undefined) => {
  if (!raw) return null;

  // "2026-08-03 09:15:00" — parse tay để không phụ thuộc vào cách từng engine
  // đoán múi giờ cho chuỗi có khoảng trắng.
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(raw.trim());
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  );
};

const indexPointsByDate = (points: SolarMeterPoint[] | null | undefined) => {
  const map = new Map<string, number | null>();

  points?.forEach((point) => {
    if (!point?.date) return;
    map.set(point.date, hasNumber(point.value) ? point.value : null);
  });

  return map;
};

const mapPowerDetails = (
  data: SolarPowerDetailsData
): SolarPowerSeriesView => {
  const details = data?.powerDetails;
  const meters = details?.meters;
  const factor = unitFactor(details?.unit);

  // Production có đủ 96 mốc/ngày nên dùng làm trục thời gian chuẩn.
  const timeline =
    findMeter(meters, "Production")?.values ??
    findMeter(meters, "Consumption")?.values ??
    findMeter(meters, "SelfConsumption")?.values ??
    [];

  if (!timeline.length) return EMPTY_POWER_SERIES;

  const productionByDate = indexPointsByDate(findMeter(meters, "Production")?.values);
  const consumptionByDate = indexPointsByDate(
    findMeter(meters, "Consumption")?.values
  );
  const selfByDate = indexPointsByDate(
    findMeter(meters, "SelfConsumption")?.values
  );

  const dates = timeline.map((point) => point?.date ?? "");

  // CẮT ĐUÔI: từ mốc cuối cùng còn số liệu trở đi thì bỏ hết. Giữ lại thì phần
  // còn lại của ngày bị kéo phẳng bằng 0, nhìn như hệ thống chết giữa ngày.
  let lastWithData = -1;
  dates.forEach((date, index) => {
    const hasAny =
      productionByDate.get(date) != null ||
      consumptionByDate.get(date) != null ||
      selfByDate.get(date) != null;

    if (hasAny) lastWithData = index;
  });

  if (lastWithData < 0) return EMPTY_POWER_SERIES;

  const kept = dates.slice(0, lastWithData + 1);
  const production: number[] = [];
  const selfConsumption: number[] = [];
  const consumption: (number | null)[] = [];
  const times: string[] = [];

  // Nhãn trục X lấy trên TOÀN bộ mốc của ngày, không phải phần đã có số: trục
  // luôn trải hết 24 giờ nên mốc 18 phải hiện ngay từ buổi sáng.
  const xLabels: { label: string; idx: number }[] = [];
  dates.forEach((date, index) => {
    const parsed = parseMeterDate(date);

    // Chỉ 3 mốc 6 - Trưa - 18: 96 nhãn "HH:mm" sẽ đè lên nhau, mà mốc 2 giờ/lần
    // cũng còn quá dày; ba mốc này đủ định vị sáng - trưa - chiều.
    if (
      parsed &&
      parsed.getMinutes() === 0 &&
      POWER_X_LABEL_HOURS.includes(parsed.getHours())
    ) {
      xLabels.push({
        label: POWER_X_LABEL_TEXT[parsed.getHours()] ?? pad2(parsed.getHours()),
        idx: index,
      });
    }
  });

  kept.forEach((date, index) => {
    // Ban đêm bằng 0 là đúng với hai chuỗi này.
    production.push((productionByDate.get(date) ?? 0) * factor);
    selfConsumption.push((selfByDate.get(date) ?? 0) * factor);

    const consumed = consumptionByDate.get(date);
    consumption.push(consumed == null ? null : consumed * factor);

    const parsed = parseMeterDate(date);
    times.push(parsed ? `${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}` : "");
  });

  return {
    production,
    selfConsumption,
    consumption,
    times,
    xLabels,
    domainCount: dates.length,
    lastIndex: kept.length - 1,
    hasData: true,
    previousDayPeak: null,
  };
};

/**
 * Công suất đỉnh (W) của một ngày. Dùng cho đường tham chiếu "Đỉnh hôm trước"
 * trong chế độ tách biểu đồ — chỉ cần con số lớn nhất nên không phải dựng cả
 * chuỗi 96 điểm.
 */
const mapPowerDetailsPeak = (data: SolarPowerDetailsData): SolarPowerPeak => {
  const details = data?.powerDetails;
  const factor = unitFactor(details?.unit);

  const peakOf = (type: string) => {
    const values = findMeter(details?.meters, type)?.values;
    if (!values?.length) return null;

    const numbers = values
      .map((point) => point?.value)
      .filter((value): value is number => hasNumber(value));

    return numbers.length ? Math.max(...numbers) * factor : null;
  };

  return {
    production: peakOf("Production"),
    consumption: peakOf("Consumption"),
  };
};

// ─── Khối 5: so sánh sản lượng theo tháng ────────────────────────────────────

type SolarComparativeBucket = {
  label: string;
  previous: number;
  current: number;
};

type SolarComparativeView = {
  previousYear: number;
  currentYear: number;
  /** Sản lượng MWh của 12 tháng, đã điền 0 cho tháng chưa có dữ liệu. */
  months: SolarComparativeBucket[];
  hasData: boolean;
};

/** 12 giá trị MWh theo tháng của một năm. */
const mapEnergyYearToMonths = (data: SolarEnergyData | null) => {
  const energy = data?.energy;
  const factor = unitFactor(energy?.unit);
  const months = Array.from({ length: 12 }, () => 0);
  let hasData = false;

  energy?.values?.forEach((point) => {
    const parsed = parseMeterDate(point?.date);
    if (!parsed || !hasNumber(point?.value)) return;

    // Chia 1.000.000 để vẽ theo MWh.
    months[parsed.getMonth()] += ((point.value as number) * factor) / 1_000_000;
    hasData = true;
  });

  return { months: months.map((value) => roundTo(value, 2)), hasData };
};

const MONTH_LABELS = [
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "T8",
  "T9",
  "T10",
  "T11",
  "T12",
];

const buildComparativeView = (
  previousYear: number,
  currentYear: number,
  previousData: SolarEnergyData | null,
  currentData: SolarEnergyData | null
): SolarComparativeView => {
  const previous = mapEnergyYearToMonths(previousData);
  const current = mapEnergyYearToMonths(currentData);

  return {
    previousYear,
    currentYear,
    months: MONTH_LABELS.map((label, index) => ({
      label,
      // Tháng chưa có dữ liệu để 0, KHÔNG để trống: biểu đồ cột sẽ vỡ khi gặp
      // giá trị rỗng.
      previous: previous.months[index] ?? 0,
      current: current.months[index] ?? 0,
    })),
    hasData: previous.hasData || current.hasData,
  };
};

const QUARTER_LABELS = ["Q1", "Q2", "Q3", "Q4"];

/**
 * Gộp 12 tháng thành nhóm theo chế độ đang chọn. Cả ba chế độ dùng chung dữ
 * liệu tháng nên không phát sinh thêm lượt gọi API.
 */
const aggregateComparative = (
  view: SolarComparativeView,
  mode: CompareMode
): SolarComparativeBucket[] => {
  if (mode === "Month") return view.months;

  if (mode === "Quarter") {
    return QUARTER_LABELS.map((label, quarter) => {
      const slice = view.months.slice(quarter * 3, quarter * 3 + 3);

      return {
        label,
        previous: roundTo(
          slice.reduce((sum, bucket) => sum + bucket.previous, 0),
          2
        ),
        current: roundTo(
          slice.reduce((sum, bucket) => sum + bucket.current, 0),
          2
        ),
      };
    });
  }

  return [
    {
      label: "Cả năm",
      previous: roundTo(
        view.months.reduce((sum, bucket) => sum + bucket.previous, 0),
        2
      ),
      current: roundTo(
        view.months.reduce((sum, bucket) => sum + bucket.current, 0),
        2
      ),
    },
  ];
};

// ─── Khối 6: lợi ích môi trường ──────────────────────────────────────────────

/** 7,24 km lái xe cho mỗi kg CO₂ tránh phát thải. */
const KM_PER_KG_CO2 = 7.24;

type SolarEnvBenefitsView = {
  /** kg CO₂ tránh phát thải. 0 nghĩa là nhà cung cấp không cấu hình hệ số. */
  co2Kg: number | null;
  /** Ước tính, phải hiển thị kèm dấu * cho người xem biết. */
  kmDriven: number | null;
};

const mapEnvBenefits = (
  data: SolarEnvBenefitsData
): SolarEnvBenefitsView => {
  const co2 = data?.envBenefits?.gasEmissionSaved?.co2;
  // Giá trị 0 nghĩa là nhà cung cấp KHÔNG cấu hình hệ số cho khu vực này, không
  // phải hệ thống chưa tạo ra lợi ích -> hiện "—" thay vì 0.
  const co2Kg = hasNumber(co2) && co2 !== 0 ? co2 : null;

  return {
    co2Kg,
    kmDriven: co2Kg == null ? null : co2Kg * KM_PER_KG_CO2,
  };
};

// ─── Thời tiết (Open-Meteo, không tính vào hạn mức của nhà cung cấp) ─────────

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

  const response = await externalFetch(url, { signal });

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

const usePlantWeather = () => {
  const [weather, setWeather] = useState<PlantWeatherState>({
    temperature: null,
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
          temperature: current.temperature,
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
  }, []);

  return weather;
};

export {
  addDays,
  addMonths,
  aggregateComparative,
  buildComparativeView,
  buildEnergyBarChart,
  canMoveToNextRange,
  CHART_WIDTH,
  clamp,
  COMPARE_CURRENT_YEAR_COLOR,
  COMPARE_PREVIOUS_YEAR_COLOR,
  createTodayDateRange,
  endOfDay,
  formatApiDate,
  formatCount,
  formatDateRangeLabel,
  formatDisplayDate,
  formatEnergy,
  formatLongDate,
  formatMetricText,
  formatPercent,
  formatPower,
  formatPowerMw,
  formatVnNumber,
  getCalendarDates,
  getDateRangeForPeriod,
  getEnergyDetailsTimeUnit,
  getPowerDetailsDate,
  getSolarContentWidth,
  getYearGridStart,
  getYearGridYears,
  hasNumber,
  isCurrentPeriodRange,
  isDateInRange,
  isFutureDateRange,
  isFutureMonth,
  isFutureYear,
  isFutureDate,
  isRainWeatherCode,
  isSameDate,
  isStormWeatherCode,
  mapEnergyDetails,
  mapEnvBenefits,
  mapOverview,
  mapPowerDetails,
  mapPowerDetailsPeak,
  mapPowerFlow,
  mapSitesToTreeNodes,
  MAX_SOLAR_CONTENT_WIDTH,
  NO_VALUE,
  PERIOD_TAB_LABELS,
  PERIOD_TABS,
  roundTo,
  SCREEN_WIDTH,
  startOfDay,
  startOfMonth,
  toPercent,
  usePlantWeather,
};

export type {
  CompareMode,
  EnergyBarBucket,
  EnergyBarChartView,
  ExpandedChart,
  GraphMode,
  MetricParts,
  PeriodTab,
  PlantWeatherState,
  SolarComparativeBucket,
  SolarComparativeView,
  SolarDateRange,
  SolarEnergyBalanceView,
  SolarEnergyBucket,
  SolarEnvBenefitsView,
  SolarOverviewView,
  SolarPowerFlowView,
  SolarPowerPeak,
  SolarPowerSeriesView,
};
