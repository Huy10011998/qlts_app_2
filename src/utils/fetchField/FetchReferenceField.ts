import { API_ENDPOINTS } from "../../config/API";
import { callApi } from "../../services/Index";
import { cascadeRequestTracker } from "../cascade/CascadeRequestTracker";
import { log } from "../Logger";

export const fetchReferenceByField = async (
  referenceName: string,
  fieldName: string,
  setReference: React.Dispatch<
    React.SetStateAction<Record<string, { items: any[]; totalCount: number }>>
  >,
  options?: {
    textSearch?: string;
    pageSize?: number;
    skipSize?: number;
    append?: boolean;
    currentIds?: Array<string | number>;
  },
) => {
  // chặn stale request
  const requestId = Date.now();
  cascadeRequestTracker[fieldName] = requestId;

  try {
    const {
      textSearch = "",
      pageSize = 20,
      skipSize = 0,
      append = false,
      currentIds = [],
    } = options || {};

    const payload = {
      type: referenceName,
      currentID: currentIds,
      textSearch,
      pageSize,
      skipSize,
    };

    const res = await callApi<any>("POST", API_ENDPOINTS.GET_CATEGORY, payload);

    // nếu không phải request mới nhất → bỏ
    if (cascadeRequestTracker[fieldName] !== requestId) {
      return { items: [], totalCount: 0 };
    }

    const items = (res.data?.items ?? []).map((x: any) => ({
      value: x.id,
      text: x.text,
      typeMulti: x.typeMulti ?? null,
    }));

    setReference((prev) => {
      const oldItems = prev[fieldName]?.items || [];
      const nextItems = append ? [...oldItems, ...items] : items;
      const uniqueItems = Array.from(
        new Map(
          nextItems.map((item: any) => [String(item.value), item] as const),
        ).values(),
      );

      return {
        ...prev,
        [fieldName]: {
          items: uniqueItems,
          totalCount: res.data?.totalCount ?? uniqueItems.length,
        },
      };
    });

    return {
      items,
      totalCount: res.data?.totalCount ?? items.length,
    };
  } catch (e) {
    log("Fetch reference error:", e);
    return { items: [], totalCount: 0 };
  }
};
