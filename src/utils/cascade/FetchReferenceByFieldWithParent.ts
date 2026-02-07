import { API_ENDPOINTS } from "../../config/API";
import { callApi } from "../../services/Index";
import { log } from "../Logger";
import { cascadeRequestTracker } from "./CascadeRequestTracker";

export const fetchReferenceByFieldWithParent = async (
  referenceName: string,
  fieldName: string,
  parentValue: any,
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
  const requestId = Date.now();

  // đánh dấu request mới nhất
  cascadeRequestTracker[fieldName] = requestId;

  try {
    const {
      textSearch = "",
      pageSize = 20,
      skipSize = 0,
      append = false,
    } = options || {};

    const payload: any = {
      type: referenceName,
      currentID: [],
      textSearch,
      pageSize,
      skipSize,
    };

    if (parentValue != null && parentValue !== "") {
      payload.lstParent = String(parentValue);
    }

    const res = await callApi<{
      success: boolean;
      data: {
        items: any[];
        totalCount: number;
      };
    }>("POST", API_ENDPOINTS.GET_CATEGORY, payload);

    // QUAN TRỌNG — chặn stale response
    if (cascadeRequestTracker[fieldName] !== requestId) {
      return;
    }

    const items = (res.data?.items ?? []).map((x: any) => ({
      value: x.id,
      text: x.text,
      typeMulti: x.typeMulti ?? null,
    }));

    setReference((prev) => ({
      ...prev,
      [fieldName]: {
        items,
        totalCount: res.data?.totalCount ?? items.length,
      },
    }));
  } catch (e) {
    log("Fetch cascade error:", e);
  }
};
