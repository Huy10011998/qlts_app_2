import { useCallback, useEffect, useRef, useState } from "react";
import {
  getFieldActive,
  getList,
  getPropertyClass,
} from "../services/Index";
import { Field, PropertyResponse } from "../types/Index";
import { error } from "../utils/Logger";
import { useAutoReload } from "./useAutoReload";
import { isAuthExpiredError } from "../services/data/CallApi";

type RelatedAssetListDataParams = {
  conditions: any[];
  debouncedSearch: string;
  nameClass: string;
  pageSize?: number;
  showAlertIfActive: (
    title: string,
    message?: string,
    buttons?: any[],
    options?: any,
  ) => void;
  isMounted: () => boolean;
};

export function useRelatedAssetListData({
  conditions,
  debouncedSearch,
  nameClass,
  pageSize = 20,
  showAlertIfActive,
  isMounted,
}: RelatedAssetListDataParams) {
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [fieldActive, setFieldActive] = useState<Field[]>([]);
  const [fieldShowMobile, setFieldShowMobile] = useState<Field[]>([]);
  const [propertyClass, setPropertyClass] = useState<PropertyResponse>();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshingTop, setIsRefreshingTop] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [total, setTotal] = useState(0);

  const skipRef = useRef(0);
  const isFetchingRef = useRef(false);

  const fetchData = useCallback(
    async (isLoadMore = false, options?: { isRefresh?: boolean }) => {
      if (isFetchingRef.current) return;

      const isRefresh = options?.isRefresh;
      const shouldReloadFieldConfig =
        !isLoadMore && (isRefresh || fieldActive.length === 0);
      const shouldReloadPropertyClass =
        !isLoadMore && (isRefresh || !propertyClass);

      if (!isLoadMore && !isRefresh && isFirstLoad) {
        setIsLoading(true);
      }

      try {
        isFetchingRef.current = true;

        if (shouldReloadFieldConfig) {
          const resField = await getFieldActive(nameClass);
          const fields = resField?.data || [];
          setFieldActive(fields);
          setFieldShowMobile(fields.filter((field: Field) => field.isShowMobile));
        }

        if (shouldReloadPropertyClass) {
          const resProp = await getPropertyClass(nameClass);
          setPropertyClass(resProp?.data);
        }

        const currentSkip = isLoadMore ? skipRef.current : 0;
        const res = await getList(
          nameClass,
          "",
          pageSize,
          currentSkip,
          debouncedSearch,
          conditions,
          [],
        );

        const items = res?.data?.items || [];
        const totalCount = res?.data?.totalCount || 0;

        if (isLoadMore) {
          setData((prev) => {
            const map = new Map<string, any>();
            [...prev, ...items].forEach((item) => map.set(String(item.id), item));
            return Array.from(map.values());
          });
          skipRef.current = currentSkip + pageSize;
        } else {
          setData(items);
          skipRef.current = pageSize;
        }

        setTotal(totalCount);
      } catch (e) {
        error(e);
        if (!isAuthExpiredError(e)) {
          showAlertIfActive("Lỗi", "Không thể tải dữ liệu");
        }
        if (!isLoadMore) setData([]);
      } finally {
        isFetchingRef.current = false;
        if (isMounted()) {
          setIsLoading(false);
          setIsLoadingMore(false);
          setIsSearching(false);
          setIsRefreshingTop(false);
          setIsFirstLoad(false);
        }
      }
    },
    [
      conditions,
      debouncedSearch,
      fieldActive.length,
      isFirstLoad,
      isMounted,
      nameClass,
      pageSize,
      propertyClass,
      showAlertIfActive,
    ],
  );

  useAutoReload(fetchData);

  useEffect(() => {
    const isSearch = debouncedSearch.trim().length > 0;

    if (isSearch) setIsSearching(true);

    skipRef.current = 0;
    setData([]);
    setIsLoading(true);

    fetchData(false).finally(() => {
      if (isSearch && isMounted()) {
        setIsSearching(false);
      }
    });
  }, [debouncedSearch, fetchData, isMounted]);

  const refreshTop = async () => {
    if (isRefreshingTop) return;

    setIsRefreshingTop(true);
    skipRef.current = 0;

    await fetchData(false, { isRefresh: true });
  };

  const handleLoadMore = () => {
    if (isLoading || isLoadingMore || isSearching || data.length >= total) {
      return;
    }

    setIsLoadingMore(true);
    fetchData(true);
  };

  return {
    data,
    fieldActive,
    fieldShowMobile,
    propertyClass,
    isLoading,
    isLoadingMore,
    isSearching,
    isRefreshingTop,
    total,
    fetchData,
    refreshTop,
    handleLoadMore,
  };
}
