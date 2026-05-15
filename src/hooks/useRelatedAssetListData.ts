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
  nameClass?: string;
  pageSize?: number;
  enabled?: boolean;
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
  enabled = true,
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
  const [total, setTotal] = useState(0);

  const skipRef = useRef(0);
  const isFetchingRef = useRef(false);
  const fieldActiveRef = useRef<Field[]>([]);
  const propertyClassRef = useRef<PropertyResponse | undefined>(undefined);
  const isFirstLoadRef = useRef(true);

  const fetchData = useCallback(
    async (isLoadMore = false, options?: { isRefresh?: boolean }) => {
      if (!enabled || !nameClass) return;
      if (isFetchingRef.current) return;

      const isRefresh = options?.isRefresh;
      const shouldReloadFieldConfig =
        !isLoadMore && (isRefresh || fieldActiveRef.current.length === 0);
      const shouldReloadPropertyClass =
        !isLoadMore && (isRefresh || !propertyClassRef.current);

      if (!isLoadMore && !isRefresh && isFirstLoadRef.current) {
        setIsLoading(true);
      }

      try {
        isFetchingRef.current = true;

        if (shouldReloadFieldConfig) {
          const resField = await getFieldActive(nameClass);
          const fields = resField?.data || [];
          fieldActiveRef.current = fields;
          setFieldActive(fields);
          setFieldShowMobile(fields.filter((field: Field) => field.isShowMobile));
        }

        if (shouldReloadPropertyClass) {
          const resProp = await getPropertyClass(nameClass);
          const nextPropertyClass = resProp?.data;
          propertyClassRef.current = nextPropertyClass;
          setPropertyClass(nextPropertyClass);
        }

        const currentSkip = isLoadMore ? skipRef.current : 0;
        const res = await getList(
          nameClass,
          "id desc",
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
          isFirstLoadRef.current = false;
          setIsLoading(false);
          setIsLoadingMore(false);
          setIsSearching(false);
          setIsRefreshingTop(false);
        }
      }
    },
    [
      conditions,
      debouncedSearch,
      isMounted,
      nameClass,
      enabled,
      pageSize,
      showAlertIfActive,
    ],
  );

  useAutoReload(fetchData, { enabled });

  useEffect(() => {
    if (!enabled || !nameClass) {
      setData([]);
      setFieldActive([]);
      setFieldShowMobile([]);
      setPropertyClass(undefined);
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsSearching(false);
      setIsRefreshingTop(false);
      setTotal(0);
      fieldActiveRef.current = [];
      propertyClassRef.current = undefined;
      isFirstLoadRef.current = true;
      skipRef.current = 0;
      isFetchingRef.current = false;
      return;
    }

    const isSearch = debouncedSearch.trim().length > 0;

    if (isSearch) setIsSearching(true);

    skipRef.current = 0;

    fetchData(false).finally(() => {
      if (isSearch && isMounted()) {
        setIsSearching(false);
      }
    });
  }, [debouncedSearch, enabled, fetchData, isMounted, nameClass]);

  const refreshTop = async () => {
    if (!enabled || !nameClass || isRefreshingTop) return;

    setIsRefreshingTop(true);
    skipRef.current = 0;

    await fetchData(false, { isRefresh: true });
  };

  const handleLoadMore = () => {
    if (!enabled || !nameClass) return;
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
