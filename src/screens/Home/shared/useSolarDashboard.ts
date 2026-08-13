import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useIsFocused } from "@react-navigation/native";

import { useNetworkAwareReload } from "../../../hooks/useNetworkAwareReload";
import {
  getSolarEnergy,
  getSolarEnergyDetails,
  getSolarEnvBenefits,
  getSolarOverview,
  getSolarPowerDetails,
  getSolarPowerFlow,
  getSolarSiteList,
  getSolarErrorMessage,
  SolarApiError,
  SOLAR_NO_CONFIG_MESSAGE,
  SOLAR_NO_PERMISSION_MESSAGE,
} from "../../../services/data/solarApi";
import type { TreeNode } from "../../../types";
import { error as logError } from "../../../utils/Logger";
import {
  addDays,
  buildComparativeView,
  formatApiDate,
  getEnergyDetailsTimeUnit,
  getPowerDetailsDate,
  mapEnergyDetails,
  mapEnvBenefits,
  mapOverview,
  mapPowerDetails,
  mapPowerDetailsPeak,
  mapPowerFlow,
  mapSitesToTreeNodes,
  type PeriodTab,
  type SolarComparativeView,
  type SolarDateRange,
  type SolarEnergyBalanceView,
  type SolarEnvBenefitsView,
  type SolarOverviewView,
  type SolarPowerFlowView,
  type SolarPowerSeriesView,
} from "../SolarPlantScreen.helpers";

/**
 * Trạng thái tải của một khối. Mỗi khối tải độc lập, một khối lỗi không được
 * làm hỏng khối khác:
 *   - `data == null && isLoading`  -> lần đầu, dựng skeleton.
 *   - `data != null && isLoading`  -> làm mới, GIỮ NGUYÊN số cũ + vạch mảnh.
 *   - `error != null`              -> hộp lỗi trong khối, số cũ vẫn còn.
 */
export type SolarBlockState<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  /**
   * `data` đang giữ được tải cho kỳ/khoảng ngày KHÁC với cái đang chọn. Giữ số
   * cũ khi làm mới cùng tham số là đúng, nhưng số của kỳ khác thì KHÔNG được vẽ:
   * đổi Ngày → Tuần mà vẽ luôn sẽ ra một cột to bằng dữ liệu một ngày, nhảy một
   * cái rồi mới thành biểu đồ tuần.
   */
  isStale: boolean;
  /** Tham số của lượt tải đã tạo ra `data`. Dùng để suy ra `isStale`. */
  paramsKey: string | null;
};

const emptyBlock = <T>(): SolarBlockState<T> => ({
  data: null,
  error: null,
  isLoading: false,
  isStale: false,
  paramsKey: null,
});

type SolarBlocks = {
  flow: SolarBlockState<SolarPowerFlowView>;
  overview: SolarBlockState<SolarOverviewView>;
  balance: SolarBlockState<SolarEnergyBalanceView>;
  power: SolarBlockState<SolarPowerSeriesView>;
  compare: SolarBlockState<SolarComparativeView>;
  env: SolarBlockState<SolarEnvBenefitsView>;
};

type SolarBlockKey = keyof SolarBlocks;

const createBlocks = (): SolarBlocks => ({
  flow: emptyBlock(),
  overview: emptyBlock(),
  balance: emptyBlock(),
  power: emptyBlock(),
  compare: emptyBlock(),
  env: emptyBlock(),
});

/** Thứ tự gọi đúng thứ tự người dùng nhìn từ trên xuống. */
const FULL_SEQUENCE: SolarBlockKey[] = [
  "flow",
  "overview",
  "balance",
  "power",
  "compare",
  "env",
];

const RANGE_SEQUENCE: SolarBlockKey[] = ["balance", "power", "compare"];

const sequenceForPeriod = (period: PeriodTab, sequence: SolarBlockKey[]) =>
  period === "Day" ? sequence : sequence.filter((key) => key !== "power");

export const blockParamsKey = (
  key: SolarBlockKey,
  period: PeriodTab,
  dateRange: SolarDateRange,
) => {
  if (key === "balance") {
    return `${period}|${formatApiDate(dateRange.fromDate)}|${formatApiDate(
      dateRange.toDate,
    )}`;
  }

  if (key === "power") return formatApiDate(getPowerDetailsDate(dateRange));
  if (key === "compare") return String(dateRange.fromDate.getFullYear());

  return "";
};

/** Chỉ 3 khối này mới có chuyện "số của kỳ khác". */
const isRangeDependent = (key: SolarBlockKey) => RANGE_SEQUENCE.includes(key);

export type SolarSiteStatus =
  | "loading"
  | "ready"
  | "empty"
  | "forbidden"
  | "error";

/**
 * Khoảng nghỉ tối thiểu giữa hai lần tự tải lại khi focus lại màn hình. Bằng
 * đúng nhịp tự tải lại trong màn hình để hai cơ chế không đá nhau: gọi lại sớm
 * hơn thì phần nhiều nhận về đúng số cũ, chỉ tốn 6 lượt round-trip vô ích.
 */
const FOCUS_RELOAD_MIN_INTERVAL_MS = 2 * 60 * 1000;

/**
 * Nhịp tự tải lại khi người dùng đang đứng trong màn hình. Chạy nền (app ở
 * background, hoặc màn hình đã mất focus) thì KHÔNG gọi — vừa vô ích vừa đốt
 * hạn mức 300 lượt/ngày/site của nhà cung cấp.
 */
const AUTO_REFRESH_INTERVAL_MS = 2 * 60 * 1000;

const OFFLINE_MESSAGE =
  "Mất kết nối mạng. Số liệu đang hiển thị có thể chưa phải mới nhất.";

type UseSolarDashboardArgs = {
  /** Bỏ qua toàn bộ việc gọi API khi tài khoản không có quyền Solar_Dashboard. */
  enabled: boolean;
  period: PeriodTab;
  dateRange: SolarDateRange;
};

export function useSolarDashboard({
  enabled,
  period,
  dateRange,
}: UseSolarDashboardArgs) {
  const [sites, setSites] = useState<TreeNode[]>([]);
  const [selectedSite, setSelectedSite] = useState<TreeNode | null>(null);
  const [siteStatus, setSiteStatus] = useState<SolarSiteStatus>("loading");
  const [siteError, setSiteError] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<SolarBlocks>(createBlocks);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const isFocused = useIsFocused();
  const mountedRef = useRef(true);
  const runIdRef = useRef(0);
  /** Site đã chạy xong lượt tải đầy đủ, để lần sau chỉ tải lại khối theo kỳ. */
  const loadedSiteRef = useRef<string | null>(null);
  /** Thời điểm bắt đầu lượt tải gần nhất, dùng để giãn nhịp tải lại khi focus. */
  const lastRunAtRef = useRef(0);
  const wasFocusedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Vô hiệu hoá mọi lượt đang chạy khi màn hình bị huỷ.
      runIdRef.current += 1;
    };
  }, []);

  const meterId = Number(selectedSite?.value);

  // ─── Bước khởi tạo: danh sách site ─────────────────────────────────────────

  const loadSites = useCallback(async () => {
    if (!enabled) {
      setSiteStatus("forbidden");
      setSiteError(SOLAR_NO_PERMISSION_MESSAGE);
      return;
    }

    setSiteStatus("loading");
    setSiteError(null);

    try {
      const list = await getSolarSiteList();
      if (!mountedRef.current) return;

      const nodes = mapSitesToTreeNodes(list ?? []);

      if (!nodes.length) {
        setSites([]);
        setSelectedSite(null);
        setSiteStatus("empty");
        setSiteError(SOLAR_NO_CONFIG_MESSAGE);
        return;
      }

      setSites(nodes);
      // Lấy phần tử đầu tiên làm site đang xem.
      setSelectedSite(nodes[0]);
      setSiteStatus("ready");
      setIsOffline(false);
    } catch (caught) {
      logError("SOLAR get-list-solar failed", caught);
      if (!mountedRef.current) return;

      const denied =
        caught instanceof SolarApiError && caught.isPermissionDenied;

      setSites([]);
      setSelectedSite(null);
      setSiteStatus(denied ? "forbidden" : "error");
      setSiteError(getSolarErrorMessage(caught));
    }
  }, [enabled]);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  // ─── Tải từng khối ─────────────────────────────────────────────────────────

  const runBlock = useCallback(
    async <K extends SolarBlockKey>(
      key: K,
      runId: number,
      paramsKey: string,
      load: () => Promise<NonNullable<SolarBlocks[K]["data"]>>,
    ) => {
      // Lượt này đã bị lượt sau ghi đè (đổi site/đổi kỳ) — khác với cờ `isStale`
      // của khối, cái đó nói về việc SỐ ĐANG GIỮ thuộc kỳ nào.
      const isSuperseded = () =>
        !mountedRef.current || runId !== runIdRef.current;

      if (isSuperseded()) return;

      setBlocks((current) => ({
        ...current,
        [key]: { ...current[key], isLoading: true, error: null },
      }));

      try {
        const data = await load();
        if (isSuperseded()) return;

        // Một khối về được nghĩa là đường truyền đã thông lại.
        setIsOffline(false);
        setBlocks((current) => ({
          ...current,
          [key]: {
            data,
            error: null,
            isLoading: false,
            isStale: false,
            paramsKey,
          },
        }));
      } catch (caught) {
        logError(`SOLAR block "${key}" failed`, caught);
        if (isSuperseded()) return;

        if (caught instanceof SolarApiError && caught.isPermissionDenied) {
          setSiteStatus("forbidden");
          setSiteError(SOLAR_NO_PERMISSION_MESSAGE);
        }

        // Giữ số cũ, chỉ gắn thêm hộp lỗi vào khối.
        setBlocks((current) => ({
          ...current,
          [key]: {
            ...current[key],
            isLoading: false,
            error: getSolarErrorMessage(caught),
          },
        }));
      }
    },
    [],
  );

  const loaders = useMemo(
    () => ({
      flow: (id: number) => getSolarPowerFlow(id).then(mapPowerFlow),
      overview: (id: number) => getSolarOverview(id).then(mapOverview),
      balance: (id: number) =>
        getSolarEnergyDetails(
          id,
          formatApiDate(dateRange.fromDate),
          formatApiDate(dateRange.toDate),
          getEnergyDetailsTimeUnit(period, dateRange),
        ).then(mapEnergyDetails),
      power: async (id: number) => {
        const chartDate = getPowerDetailsDate(dateRange);
        const series = mapPowerDetails(
          await getSolarPowerDetails(id, formatApiDate(chartDate)),
        );

        const previousDayPeak = await getSolarPowerDetails(
          id,
          formatApiDate(addDays(chartDate, -1)),
        )
          .then(mapPowerDetailsPeak)
          .catch((caught) => {
            logError("SOLAR previous-day peak failed", caught);
            return null;
          });

        return { ...series, previousDayPeak };
      },
      compare: async (id: number) => {
        const currentYear = dateRange.fromDate.getFullYear();
        const previousYear = currentYear - 1;

        const previous = await getSolarEnergy(
          id,
          formatApiDate(new Date(previousYear, 0, 1)),
          formatApiDate(new Date(previousYear, 11, 31)),
        );
        const current = await getSolarEnergy(
          id,
          formatApiDate(new Date(currentYear, 0, 1)),
          formatApiDate(new Date(currentYear, 11, 31)),
        );

        return buildComparativeView(
          previousYear,
          currentYear,
          previous,
          current,
        );
      },
      env: (id: number) => getSolarEnvBenefits(id).then(mapEnvBenefits),
    }),
    [dateRange, period],
  );

  const runSequence = useCallback(
    async (id: number, sequence: SolarBlockKey[]) => {
      const runId = ++runIdRef.current;
      lastRunAtRef.current = Date.now();
      setIsRefreshing(true);

      setBlocks(
        (current) =>
          Object.fromEntries(
            (Object.keys(current) as SolarBlockKey[]).map((key) => [
              key,
              sequence.includes(key) || !current[key].isLoading
                ? current[key]
                : { ...current[key], isLoading: false },
            ]),
          ) as SolarBlocks,
      );

      for (const key of sequence) {
        if (!mountedRef.current || runId !== runIdRef.current) return;
        await runBlock(key, runId, blockParamsKey(key, period, dateRange), () =>
          loaders[key](id),
        );
      }

      if (mountedRef.current && runId === runIdRef.current) {
        setIsRefreshing(false);
      }
    },
    [dateRange, loaders, period, runBlock],
  );

  useEffect(() => {
    if (siteStatus !== "ready" || !Number.isFinite(meterId) || meterId <= 0) {
      return;
    }

    const siteKey = String(meterId);
    const isNewSite = loadedSiteRef.current !== siteKey;
    loadedSiteRef.current = siteKey;

    runSequence(
      meterId,
      sequenceForPeriod(period, isNewSite ? FULL_SEQUENCE : RANGE_SEQUENCE),
    );
  }, [meterId, period, runSequence, siteStatus]);

  // ─── Hành động ─────────────────────────────────────────────────────────────

  /**
   * Tải lại đúng 6 API dữ liệu với tham số đang chọn. Trả về promise để phía gọi
   * (kéo-để-tải-lại) biết lúc nào xong mà tắt spinner.
   */
  const refresh = useCallback((): Promise<void> => {
    if (siteStatus !== "ready") {
      return loadSites();
    }

    if (Number.isFinite(meterId) && meterId > 0) {
      return runSequence(meterId, sequenceForPeriod(period, FULL_SEQUENCE));
    }

    return Promise.resolve();
  }, [loadSites, meterId, period, runSequence, siteStatus]);

  // ─── Tự tải lại ────────────────────────────────────────────────────────────

  const hasError =
    isOffline ||
    siteStatus === "error" ||
    Object.values(blocks).some((block) => block.error != null);

  const refreshIfStale = useCallback(() => {
    const isFirstRunPending = lastRunAtRef.current === 0;
    const sinceLastRun = Date.now() - lastRunAtRef.current;

    if (
      !hasError &&
      (isFirstRunPending || sinceLastRun < FOCUS_RELOAD_MIN_INTERVAL_MS)
    ) {
      return;
    }

    refresh();
  }, [hasError, refresh]);

  useEffect(() => {
    if (!isFocused) {
      wasFocusedRef.current = false;
      return;
    }

    if (wasFocusedRef.current) return;
    wasFocusedRef.current = true;

    refreshIfStale();
  }, [isFocused, refreshIfStale]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!isFocused || siteStatus !== "ready") return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      if (AppState.currentState !== "active") return;
      if (Date.now() - lastRunAtRef.current < AUTO_REFRESH_INTERVAL_MS) return;

      refreshRef.current();
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(tick, AUTO_REFRESH_INTERVAL_MS);
    };

    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    if (AppState.currentState === "active") start();

    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          start();
          return;
        }

        stop();
      },
    );

    return () => {
      stop();
      subscription.remove();
    };
  }, [isFocused, siteStatus]);

  useNetworkAwareReload(refreshIfStale, {
    enabled: isFocused,
    hasError: isOffline,
    reconnectPollMs: 30_000,
    onOffline: () => setIsOffline(true),
  });

  const selectSite = useCallback(
    (node: TreeNode) => {
      if (node.value === selectedSite?.value) return;

      runIdRef.current += 1;
      loadedSiteRef.current = null;
      setBlocks(createBlocks());
      setIsRefreshing(false);
      setSelectedSite(node);
    },
    [selectedSite?.value],
  );

  const markedBlocks = useMemo(() => {
    const mark = <T>(
      key: SolarBlockKey,
      block: SolarBlockState<T>,
    ): SolarBlockState<T> => ({
      ...block,
      isStale:
        isRangeDependent(key) &&
        block.data != null &&
        block.paramsKey !== blockParamsKey(key, period, dateRange),
    });

    return {
      balance: mark("balance", blocks.balance),
      compare: mark("compare", blocks.compare),
      env: blocks.env,
      flow: blocks.flow,
      overview: blocks.overview,
      power: mark("power", blocks.power),
    };
  }, [blocks, dateRange, period]);

  return {
    blocks: markedBlocks,
    isOffline,
    isRefreshing,
    offlineMessage: OFFLINE_MESSAGE,
    refresh,
    selectSite,
    selectedSite,
    siteError,
    siteStatus,
    sites,
  };
}
