import { API_ENDPOINTS } from "../../config";
import { getApiErrorMessage } from "../../utils/helpers/api";
import { log } from "../../utils/Logger";
import { callApi } from "./httpClient";

export const SOLAR_DASHBOARD_PERMISSION = "Solar_Dashboard";

export const SOLAR_NO_PERMISSION_MESSAGE =
  "Tài khoản của bạn chưa được cấp quyền xem. Vui lòng liên hệ quản trị hệ thống.";

export const SOLAR_NO_CONFIG_MESSAGE =
  "Chưa có hệ thống điện mặt trời nào được thiết lập, hoặc tài khoản của bạn chưa được cấp quyền xem. Vui lòng liên hệ quản trị hệ thống.";

const SOLAR_FALLBACK_MESSAGE =
  "Tạm thời chưa lấy được dữ liệu, vui lòng thử lại sau";

/** Lỗi đã có sẵn câu tiếng Việt để hiển thị trực tiếp trong khối bị lỗi. */
export class SolarApiError extends Error {
  readonly isPermissionDenied: boolean;

  constructor(message: string, isPermissionDenied = false) {
    super(message);
    this.name = "SolarApiError";
    this.isPermissionDenied = isPermissionDenied;
  }
}

export const getSolarErrorMessage = (error: unknown) =>
  error instanceof SolarApiError ? error.message : SOLAR_FALLBACK_MESSAGE;

/**
 * Các API dashboard-* giờ bọc số liệu của nhà cung cấp thêm một lớp:
 * `data: { data: {...}, ngayCapNhat }` (BE lưu đệm, `ngayCapNhat` là lúc lấy).
 * `get-list-solar` vẫn trả mảng thẳng trong `data`.
 */
type SolarCachedPayload<T> = {
  data?: T | null;
  ngayCapNhat?: string | null;
};

type SolarEnvelope<T> = {
  message?: string | null;
  data?: T | SolarCachedPayload<T> | null;
};

const isCachedPayload = <T>(
  payload: T | SolarCachedPayload<T> | null | undefined,
): payload is SolarCachedPayload<T> =>
  payload != null &&
  typeof payload === "object" &&
  !Array.isArray(payload) &&
  "data" in payload;

/** Nhận cả dạng có lớp bọc lẫn dạng cũ, để BE đổi qua lại không làm màn trống. */
const unwrapSolarData = <T>(envelope: SolarEnvelope<T>): T | null => {
  const payload = envelope?.data;
  if (payload == null) return null;

  return isCachedPayload(payload) ? payload.data ?? null : payload;
};

const endpointName = (url: string) => url.split("/").pop() ?? url;

const callSolar = async <T>(url: string, body: object): Promise<T> => {
  let envelope: SolarEnvelope<T>;

  try {
    envelope = await callApi<SolarEnvelope<T>>("POST", url, body);
  } catch (error: any) {
    log(
      `[SOLAR] ${endpointName(url)} ${JSON.stringify(body)} -> lỗi`,
      error?.response?.status ?? error?.message,
    );

    if (error?.response?.status === 403) {
      throw new SolarApiError(SOLAR_NO_PERMISSION_MESSAGE, true);
    }

    throw new SolarApiError(
      getApiErrorMessage(error, SOLAR_FALLBACK_MESSAGE).trim() ||
        SOLAR_FALLBACK_MESSAGE,
    );
  }

  const data = unwrapSolarData(envelope);

  log(
    `[SOLAR] ${endpointName(url)} ${JSON.stringify(body)} ->`,
    JSON.stringify({
      message: envelope?.message,
      ngayCapNhat: isCachedPayload(envelope?.data)
        ? envelope.data.ngayCapNhat
        : undefined,
      data: JSON.stringify(data)?.slice(0, 400),
    }),
  );

  if (data == null) {
    throw new SolarApiError(
      envelope?.message?.trim() || SOLAR_FALLBACK_MESSAGE,
    );
  }

  return data;
};

export type SolarUnit = "W" | "kW" | "MW" | "Wh" | "kWh" | "MWh" | string;

export type SolarSite = {
  iD_DongHoSolar: number;
  siteName?: string | null;
};

export type SolarFlowNode = {
  status?: string | null;
  currentPower?: number | null;
};

export type SolarPowerFlowData = {
  siteCurrentPowerFlow?: {
    updateRefreshRate?: number | null;
    unit?: SolarUnit | null;
    connections?: { from?: string | null; to?: string | null }[] | null;
    GRID?: SolarFlowNode | null;
    LOAD?: SolarFlowNode | null;
    PV?: SolarFlowNode | null;
  } | null;
};

export type SolarOverviewData = {
  overview?: {
    lastUpdateTime?: string | null;
    lastDayData?: { energy?: number | null } | null;
    lastMonthData?: { energy?: number | null } | null;
    lastYearData?: { energy?: number | null } | null;
    lifeTimeData?: { energy?: number | null } | null;
  } | null;
};

export type SolarMeterPoint = {
  date?: string | null;
  value?: number | null;
};

export type SolarMeterSeries = {
  type?: string | null;
  values?: SolarMeterPoint[] | null;
};

export type SolarEnergyDetailsData = {
  energyDetails?: {
    timeUnit?: string | null;
    unit?: SolarUnit | null;
    meters?: SolarMeterSeries[] | null;
  } | null;
};

export type SolarPowerDetailsData = {
  powerDetails?: {
    timeUnit?: string | null;
    unit?: SolarUnit | null;
    meters?: SolarMeterSeries[] | null;
  } | null;
};

export type SolarEnergyData = {
  energy?: {
    timeUnit?: string | null;
    unit?: SolarUnit | null;
    values?: SolarMeterPoint[] | null;
  } | null;
};

export type SolarEnvBenefitsData = {
  envBenefits?: {
    gasEmissionSaved?: {
      units?: string | null;
      co2?: number | null;
      so2?: number | null;
      nox?: number | null;
    } | null;
    treesPlanted?: number | null;
    lightBulbs?: number | null;
  } | null;
};

export type SolarTimeUnit =
  | "QUARTER_OF_AN_HOUR"
  | "HOUR"
  | "DAY"
  | "WEEK"
  | "MONTH"
  | "YEAR";

export const getSolarSiteList = () =>
  callSolar<SolarSite[]>(API_ENDPOINTS.GET_LIST_SOLAR, {});

/** Khối 1 — Dòng năng lượng thời gian thực. Bỏ qua tham số ngày. */
export const getSolarPowerFlow = (meterId: number) =>
  callSolar<SolarPowerFlowData>(API_ENDPOINTS.SOLAR_POWER_FLOW, {
    iD_DongHoSolar: meterId,
  });

/** Khối 2 — Sản lượng tích luỹ (hôm nay / tháng / năm / từ đầu). */
export const getSolarOverview = (meterId: number) =>
  callSolar<SolarOverviewData>(API_ENDPOINTS.SOLAR_OVERVIEW, {
    iD_DongHoSolar: meterId,
  });

/** Khối 3 — Cân bằng năng lượng theo kỳ đang chọn. */
export const getSolarEnergyDetails = (
  meterId: number,
  tuNgay: string,
  denNgay: string,
  timeUnit: SolarTimeUnit,
) =>
  callSolar<SolarEnergyDetailsData>(API_ENDPOINTS.SOLAR_ENERGY_DETAILS, {
    iD_DongHoSolar: meterId,
    tuNgay,
    denNgay,
    timeUnit,
  });

/** Khối 4 — Công suất trong ngày (1 ngày duy nhất, 96 mốc 15 phút). */
export const getSolarPowerDetails = (meterId: number, ngay: string) =>
  callSolar<SolarPowerDetailsData>(API_ENDPOINTS.SOLAR_POWER_DETAILS, {
    iD_DongHoSolar: meterId,
    tuNgay: ngay,
    denNgay: ngay,
  });

/** Khối 5 — Sản lượng theo tháng của trọn 1 năm (gọi 2 lần để so sánh). */
export const getSolarEnergy = (
  meterId: number,
  tuNgay: string,
  denNgay: string,
  timeUnit: SolarTimeUnit = "MONTH",
) =>
  callSolar<SolarEnergyData>(API_ENDPOINTS.SOLAR_ENERGY, {
    iD_DongHoSolar: meterId,
    tuNgay,
    denNgay,
    timeUnit,
  });

/** Khối 6 — Lợi ích môi trường tích luỹ. */
export const getSolarEnvBenefits = (meterId: number) =>
  callSolar<SolarEnvBenefitsData>(API_ENDPOINTS.SOLAR_ENV_BENEFITS, {
    iD_DongHoSolar: meterId,
  });
