import { API_ENDPOINTS } from "../../config/API";
import { callApi } from "../../services/Index";
import { cascadeRequestTracker } from "../cascade/CascadeRequestTracker";

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
    } = options || {};

    const payload = {
      type: referenceName,
      textSearch,
      pageSize,
      skipSize,
    };

    const res = await callApi<any>("POST", API_ENDPOINTS.GET_CATEGORY, payload);

    // nếu không phải request mới nhất → bỏ
    if (cascadeRequestTracker[fieldName] !== requestId) {
      return;
    }

    const items = (res.data?.items ?? []).map((x: any) => ({
      value: x.id,
      text: x.text,
      typeMulti: x.typeMulti ?? null,
    }));

    setReference((prev) => {
      const oldItems = prev[fieldName]?.items || [];
      const newItems = append ? [...oldItems, ...items] : items;

      return {
        ...prev,
        [fieldName]: {
          items: newItems,
          totalCount: res.data?.totalCount ?? newItems.length,
        },
      };
    });
  } catch (e) {
    console.log("Fetch reference error:", e);
  }
};
