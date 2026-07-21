import { API_ENDPOINTS } from "../../config/api";
import { callApi } from "../../services";
import { cascadeRequestTracker } from "../cascade/CascadeRequestTracker";
import { log } from "../Logger";
import type { ReferenceDataMap } from "../../types";

type SetReference = React.Dispatch<React.SetStateAction<ReferenceDataMap>>;

export type FetchReferenceOptions = {
  textSearch?: string;
  pageSize?: number;
  skipSize?: number;
  append?: boolean;
  currentIds?: Array<string | number>;
  /** Cascade parent value; sent as `lstParent` when present. */
  parentValue?: unknown;
};

/**
 * Fetch a reference/category list for a form field and merge it into the
 * reference-data map, deduped by value. A per-field request id guards against
 * stale responses when the user types/scrolls quickly. Pass `parentValue` for
 * cascade fields.
 */
export const fetchReference = async (
  referenceName: string,
  fieldName: string,
  setReference: SetReference,
  options?: FetchReferenceOptions,
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
      parentValue,
    } = options || {};

    const payload: Record<string, unknown> = {
      type: referenceName,
      currentID: currentIds,
      textSearch,
      pageSize,
      skipSize,
    };

    if (parentValue != null && parentValue !== "") {
      payload.lstParent = String(parentValue);
    }

    const res = await callApi<{
      success?: boolean;
      data?: { items?: any[]; totalCount?: number };
    }>("POST", API_ENDPOINTS.GET_CATEGORY, payload);

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
    return {
      items: [],
      totalCount: 0,
      errorMessage: "Vui lòng kiểm tra kết nối mạng rồi thử lại.",
    };
  }
};

/** Non-cascade reference fetch (kept for existing call sites). */
export const fetchReferenceByField = (
  referenceName: string,
  fieldName: string,
  setReference: SetReference,
  options?: Omit<FetchReferenceOptions, "parentValue">,
) => fetchReference(referenceName, fieldName, setReference, options);
