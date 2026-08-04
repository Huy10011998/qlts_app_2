import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { readStoredAuthUsername } from "../../../context/authStorage";
import { fetchTaiSanDashboard } from "../../../services/data/dashboardApi";
import { error as logError } from "../../../utils/Logger";
import { mapTaiSanDashboard, type HomeDashboardPayload } from "./homeData";
import { formatHomeUpdatedAt } from "./homeFormat";

const HOME_DASHBOARD_CACHE_KEY = "@home:dashboard";

const getHomeDashboardCacheKey = (userName: string | null) => {
  const normalizedUserName = userName?.trim().toLowerCase();

  if (!normalizedUserName) return HOME_DASHBOARD_CACHE_KEY;

  // Cache theo user: nếu dùng chung một key, đăng nhập tài khoản khác sẽ thấy
  // số của người trước trong lúc chờ API trả về.
  return `${HOME_DASHBOARD_CACHE_KEY}:user:${encodeURIComponent(
    normalizedUserName
  )}`;
};

const fetchHomeDashboard = async (): Promise<HomeDashboardPayload> =>
  mapTaiSanDashboard(await fetchTaiSanDashboard());

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

/**
 * Dữ liệu dashboard của Trang chủ, tách riêng khỏi permission và menu.
 *
 * Hook này cố tình KHÔNG bao giờ đẩy lỗi ra ngoài dưới dạng chặn màn hình: API
 * dashboard chết thì chỉ phần TỔNG QUAN mất, lưới CHỨC NĂNG vẫn bấm được.
 */
export function useHomeDashboard() {
  const [dashboard, setDashboard] = useState<HomeDashboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const cacheKeyRef = useRef(HOME_DASHBOARD_CACHE_KEY);
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);

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

  useEffect(() => {
    let isActive = true;

    const hydrateThenLoad = async () => {
      try {
        const storedUserName = await readStoredAuthUsername();
        cacheKeyRef.current = getHomeDashboardCacheKey(storedUserName);

        const rawValue = await AsyncStorage.getItem(cacheKeyRef.current);
        const parsedValue = rawValue ? JSON.parse(rawValue) : null;

        // Hiện số trong cache ngay để Trang chủ không trống trong lúc chờ API,
        // rồi refresh nền.
        if (isActive && isHomeDashboardPayload(parsedValue)) {
          setDashboard(parsedValue);
          setIsLoading(false);
        }
      } catch {
        // Cache hỏng thì bỏ qua, cứ gọi API.
      }

      if (isActive) {
        await loadDashboard();
      }
    };

    hydrateThenLoad();

    return () => {
      isActive = false;
    };
  }, [loadDashboard]);

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
    refreshDashboard: loadDashboard,
    updatedAtLabel,
  };
}
