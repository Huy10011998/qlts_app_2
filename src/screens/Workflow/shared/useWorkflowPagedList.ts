import { useCallback, useEffect, useRef, useState } from "react";

import type { WorkflowListResult } from "../../../types/index";
import { getWorkflowErrorMessage } from "./workflowErrors";

type Options = {
  pageSize?: number;
  /** false: chưa gọi (vd chờ quyền / metadata). */
  enabled?: boolean;
  /** Đổi giá trị (tab, từ khoá, bộ lọc) là nạp lại từ đầu. */
  queryKey: string;
  /** Gọi sau mỗi trang về — để nạp thông tin phụ của đúng các dòng đó. */
  onPage?: (items: any[]) => void;
};

/**
 * Danh sách phân trang PageSize / SkipSize theo khuôn `AssetList`: kéo xuống
 * làm mới, cuộn cuối nạp thêm, bỏ response cũ khi người dùng đã đổi tab / từ
 * khoá trước khi request trước kịp về.
 */
export function useWorkflowPagedList<T>(
  fetchPage: (skipSize: number, pageSize: number) => Promise<WorkflowListResult<T>>,
  { pageSize = 20, enabled = true, queryKey, onPage }: Options,
) {
  const [items, setItems] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Lỗi đang hiện là của lượt nạp thêm (cuộn cuối) hay của lượt nạp lại — chân
  // danh sách nói đúng việc hỏng và "Thử lại" gọi lại đúng lượt đó.
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);

  const requestIdRef = useRef(0);
  const itemsRef = useRef<T[]>([]);
  const fetchRef = useRef(fetchPage);
  const onPageRef = useRef(onPage);
  fetchRef.current = fetchPage;
  onPageRef.current = onPage;

  const load = useCallback(
    async (mode: "initial" | "refresh" | "more" | "silent") => {
      const requestId = ++requestIdRef.current;
      const skip = mode === "more" ? itemsRef.current.length : 0;

      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      if (mode === "more") setLoadingMore(true);
      // "silent": không bật chỉ báo nào. Bật `refreshing` của RefreshControl bằng
      // code (người dùng không kéo) lúc vừa quay lại màn, iOS đẩy danh sách xuống
      // một khoảng chừa vòng xoay và có khi kẹt luôn tới khi kéo tay.

      try {
        const result = await fetchRef.current(skip, pageSize);
        if (requestId !== requestIdRef.current) return;

        const page = Array.isArray(result?.items) ? result.items : [];
        const next = mode === "more" ? [...itemsRef.current, ...page] : page;

        itemsRef.current = next;
        setItems(next);
        setTotalCount(Number(result?.totalCount) || next.length);
        setErrorMessage(null);
        setLoadMoreFailed(false);
        onPageRef.current?.(page);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setErrorMessage(getWorkflowErrorMessage(err, "Không tải được dữ liệu."));
        setLoadMoreFailed(mode === "more");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [pageSize],
  );

  useEffect(() => {
    if (!enabled) return;
    load("initial");
  }, [enabled, load, queryKey]);

  const refresh = useCallback(() => load("refresh"), [load]);
  /** Nạp lại im lặng (không vòng xoay, không khung chờ) — dùng khi quay lại màn có thay đổi. */
  const reload = useCallback(() => load(itemsRef.current.length ? "silent" : "initial"), [load]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || refreshing) return;
    if (itemsRef.current.length >= totalCount) return;
    load("more");
  }, [load, loading, loadingMore, refreshing, totalCount]);

  /** Nút "Thử lại" ở chân danh sách (đã có dòng mà lượt nạp gần nhất hỏng). */
  const retry = useCallback(
    () => (loadMoreFailed ? loadMore() : reload()),
    [loadMore, loadMoreFailed, reload],
  );

  return {
    items,
    setItems,
    totalCount,
    loading,
    refreshing,
    loadingMore,
    errorMessage,
    loadMoreFailed,
    refresh,
    reload,
    loadMore,
    retry,
  };
}
