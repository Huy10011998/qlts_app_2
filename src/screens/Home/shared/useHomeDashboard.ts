import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { readStoredAuthUsername } from "../../../context/authStorage";
import {
  fetchMayMocDashboard,
  fetchTaiSanDashboard,
} from "../../../services/data/dashboardApi";
import { error as logError } from "../../../utils/Logger";
import {
  mapMayMocDashboard,
  mapTaiSanDashboard,
  type HomeDashboardPayload,
  type HomeMachineDashboardPayload,
} from "./homeData";
import { formatHomeUpdatedAt } from "./homeFormat";

const HOME_DASHBOARD_CACHE_KEY = "@home:dashboard";
const HOME_MACHINE_CACHE_KEY = "@home:machineDashboard";

const withUserSuffix = (baseKey: string, userName: string | null) => {
  const normalizedUserName = userName?.trim().toLowerCase();

  if (!normalizedUserName) return baseKey;

  // Cache theo user: nếu dùng chung một key, đăng nhập tài khoản khác sẽ thấy
  // số của người trước trong lúc chờ API trả về.
  return `${baseKey}:user:${encodeURIComponent(normalizedUserName)}`;
};

const getHomeDashboardCacheKey = (userName: string | null) =>
  withUserSuffix(HOME_DASHBOARD_CACHE_KEY, userName);

const getHomeMachineCacheKey = (userName: string | null) =>
  withUserSuffix(HOME_MACHINE_CACHE_KEY, userName);

const fetchHomeDashboard = async (): Promise<HomeDashboardPayload> =>
  mapTaiSanDashboard(await fetchTaiSanDashboard());

const fetchHomeMachineDashboard =
  async (): Promise<HomeMachineDashboardPayload> =>
    mapMayMocDashboard(await fetchMayMocDashboard());

/**
 * Cache có thể là payload của bản app cũ (shape khác hẳn). Kiểm ba khối bắt buộc
 * chứ không chỉ `updatedAt`: thiếu là bỏ cache, gọi API lại.
 */
const isHomeDashboardPayload = (
  value: unknown
): value is HomeDashboardPayload => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<HomeDashboardPayload>;

  return (
    typeof candidate.updatedAt === "string" &&
    !!candidate.devices &&
    typeof candidate.devices.machines === "number" &&
    Array.isArray(candidate.utilities?.items) &&
    Array.isArray(candidate.attendance?.departments)
  );
};

const isHomeMachinePayload = (
  value: unknown
): value is HomeMachineDashboardPayload => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<HomeMachineDashboardPayload>;

  return (
    typeof candidate.totalQuantity === "number" &&
    typeof candidate.totalValue === "number" &&
    Array.isArray(candidate.units) &&
    Array.isArray(candidate.growth)
  );
};

/**
 * Dữ liệu dashboard của Trang chủ, tách riêng khỏi permission và menu.
 *
 * Hook này cố tình KHÔNG bao giờ đẩy lỗi ra ngoài dưới dạng chặn màn hình: API
 * dashboard chết thì chỉ phần TỔNG QUAN mất, lưới CHỨC NĂNG vẫn bấm được.
 *
 * Hai endpoint (`get-dashboard-taisan` và `MayMoc/dashboard`) gọi SONG SONG và
 * giữ lỗi riêng: hai card máy móc hỏng thì chỉ hai card đó báo trống, phần còn
 * lại vẫn hiện bình thường — không gộp vào chung một try/catch.
 */
export function useHomeDashboard() {
  const [dashboard, setDashboard] = useState<HomeDashboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [machine, setMachine] = useState<HomeMachineDashboardPayload | null>(
    null
  );
  const [isMachineLoading, setIsMachineLoading] = useState(true);
  const [hasMachineError, setHasMachineError] = useState(false);
  const cacheKeyRef = useRef(HOME_DASHBOARD_CACHE_KEY);
  const machineCacheKeyRef = useRef(HOME_MACHINE_CACHE_KEY);
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const fetchingMachineRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadDashboard = useCallback(async () => {
    if (fetchingRef.current) return;

    fetchingRef.current = true;

    try {
      const payload = await fetchHomeDashboard();

      if (isMountedRef.current) {
        setDashboard(payload);
        setHasError(false);
      }

      await AsyncStorage.setItem(
        cacheKeyRef.current,
        JSON.stringify(payload)
      ).catch(() => undefined);
    } catch (e) {
      logError("[HomeDashboard] fetch error:", e);

      if (isMountedRef.current) {
        setHasError(true);
      }
    } finally {
      fetchingRef.current = false;

      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const loadMachineDashboard = useCallback(async () => {
    if (fetchingMachineRef.current) return;

    fetchingMachineRef.current = true;

    try {
      const payload = await fetchHomeMachineDashboard();

      if (isMountedRef.current) {
        setMachine(payload);
        setHasMachineError(false);
      }

      await AsyncStorage.setItem(
        machineCacheKeyRef.current,
        JSON.stringify(payload)
      ).catch(() => undefined);
    } catch (e) {
      logError("[HomeDashboard] fetch maymoc error:", e);

      if (isMountedRef.current) {
        setHasMachineError(true);
      }
    } finally {
      fetchingMachineRef.current = false;

      if (isMountedRef.current) {
        setIsMachineLoading(false);
      }
    }
  }, []);

  /** Làm mới thì gọi lại CẢ HAI endpoint, mỗi cái giữ lỗi của riêng nó. */
  const refreshDashboard = useCallback(async () => {
    await Promise.all([loadDashboard(), loadMachineDashboard()]);
  }, [loadDashboard, loadMachineDashboard]);

  useEffect(() => {
    let isActive = true;

    const hydrateThenLoad = async () => {
      try {
        const storedUserName = await readStoredAuthUsername();
        cacheKeyRef.current = getHomeDashboardCacheKey(storedUserName);
        machineCacheKeyRef.current = getHomeMachineCacheKey(storedUserName);

        const [rawValue, rawMachineValue] = await Promise.all([
          AsyncStorage.getItem(cacheKeyRef.current),
          AsyncStorage.getItem(machineCacheKeyRef.current),
        ]);
        const parsedValue = rawValue ? JSON.parse(rawValue) : null;
        const parsedMachineValue = rawMachineValue
          ? JSON.parse(rawMachineValue)
          : null;

        // Hiện số trong cache ngay để Trang chủ không trống trong lúc chờ API,
        // rồi refresh nền.
        if (isActive && isHomeDashboardPayload(parsedValue)) {
          setDashboard(parsedValue);
          setIsLoading(false);
        }

        if (isActive && isHomeMachinePayload(parsedMachineValue)) {
          setMachine(parsedMachineValue);
          setIsMachineLoading(false);
        }
      } catch {
        // Cache hỏng thì bỏ qua, cứ gọi API.
      }

      if (isActive) {
        await refreshDashboard();
      }
    };

    hydrateThenLoad();

    return () => {
      isActive = false;
    };
  }, [refreshDashboard]);

  const updatedAtLabel = useMemo(
    () => formatHomeUpdatedAt(dashboard?.updatedAt),
    [dashboard?.updatedAt]
  );

  return {
    dashboard,
    hasDashboardError: hasError,
    isDashboardLoading: isLoading,
    /** Đang hiện số cũ vì lần gọi mới nhất thất bại. */
    isDashboardStale: hasError && dashboard !== null,
    refreshDashboard,
    updatedAtLabel,
    /** Hai card máy móc — nguồn riêng, lỗi riêng. */
    machine,
    hasMachineError,
    isMachineLoading,
    /** Nút "Thử lại" của riêng hai card máy móc, không kéo theo endpoint kia. */
    refreshMachineDashboard: loadMachineDashboard,
  };
}
