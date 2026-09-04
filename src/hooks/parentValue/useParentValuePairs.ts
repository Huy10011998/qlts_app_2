import { useEffect, useMemo, useRef, useState } from "react";
import type { Conditions } from "../../types/model.d";
import { getParentValue } from "../../services";
import { isNetworkRequestError } from "../../utils/helpers/api";
import { log, warn } from "../../utils/Logger";
import {
  buildParentConditions,
  buildParentValuePayload,
  buildReferenceOnlyConditions,
  getParentValueCacheKey,
  mergeReferenceCondition,
} from "./parentValueHelpers";

export type ParentValuePairs = {
  parentsFields: string[];
  parentsValues: Array<string | number | null | undefined>;
};

export type ParentValueStatus = "skipped" | "loading" | "ready" | "failed";

/**
 * Cache bộ cặp ở cấp module, không phải ref của từng hook: cùng một cặp
 * (cha, con) được hỏi từ nhiều nơi gần nhau — badge đếm ở thanh hành động rồi
 * danh sách con, và form thêm mới ngay sau đó. Cache riêng theo instance là gọi
 * lại mạng vô ích.
 *
 * Bộ cặp là quan hệ cấu trúc do metadata quyết định, chỉ đổi khi đổi dòng cha —
 * mà key đã mang `idRoot` nên đổi dòng cha là key khác.
 *
 * CỐ Ý không cache thất bại: lỗi mạng thì lần vào sau phải được thử lại.
 */
const pairsCache = new Map<string, ParentValuePairs>();
const inFlight = new Map<string, Promise<ParentValuePairs>>();

/** Dọn cache — chỉ dùng cho test. */
export const resetParentValueCache = () => {
  pairsCache.clear();
  inFlight.clear();
};

/**
 * Nhồi sẵn kết quả vào cache. Dùng cho `useLoadParentValue` (form thêm mới):
 * nó tự gọi API vì còn phải resolve nhãn reference, nhưng kết quả thô thì dùng
 * chung được.
 */
export const primeParentValueCache = (
  nameClassRoot: string,
  idRoot: number | string,
  nameClass: string,
  pairs: ParentValuePairs,
) => {
  pairsCache.set(getParentValueCacheKey(nameClassRoot, idRoot, nameClass), pairs);
};

const fetchPairs = async (
  key: string,
  idRoot: number | string,
  nameClassRoot: string,
  nameClass: string,
): Promise<ParentValuePairs> => {
  const existing = inFlight.get(key);
  if (existing) return existing;

  const request = (async () => {
    /* URL phải là controller của class CHA — server đọc bản ghi cha bằng service
       của controller đó. Gọi sai controller vẫn trả 200 nhưng đọc ID trong bảng
       SAI, ra giá trị tổ tiên rác. */
    const res = await getParentValue(
      nameClassRoot,
      buildParentValuePayload(idRoot, nameClassRoot, nameClass),
    );

    const parentsFields = res?.data?.parentsFields;

    if (!Array.isArray(parentsFields)) {
      throw new Error("parent-value trả về dữ liệu không hợp lệ");
    }

    const pairs: ParentValuePairs = {
      parentsFields,
      parentsValues: Array.isArray(res?.data?.parentsValues)
        ? res.data.parentsValues
        : [],
    };

    pairsCache.set(key, pairs);
    return pairs;
  })().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, request);
  return request;
};

type UseParentValuePairsParams = {
  idRoot?: number | string;
  nameClass?: string;
  nameClassRoot?: string;
  propertyReference?: string;
  enabled?: boolean;
  /**
   * Tăng số này để nạp lại bộ cặp, bỏ qua cache. Dùng cho kéo-xuống-làm-mới:
   * bộ cặp là quan hệ cấu trúc nên hiếm đổi, nhưng sửa cột cấp cha của bản ghi
   * cha rồi thì cache cũ sẽ lọc sai cho tới khi tắt app.
   */
  reloadToken?: number;
};

/**
 * Lấy bộ cặp field/value của bản ghi cha để lọc danh sách bản ghi CON.
 *
 * Vì sao không lọc bằng khoá ngoại tới cha là đủ: bộ cặp còn mang điều kiện
 * phân loại. Class LinhKien có cha là MayTinh thì kèm `ID_LoaiThietBiCNTT = 7`;
 * thiếu cặp đó là danh sách lẫn cả linh kiện của Server (giá trị 8). Cứ gửi
 * TRỌN bộ server trả về, đừng tự bỏ cặp nào.
 *
 * `conditions` LUÔN dùng được: chưa lấy được bộ cặp (đang tải / lỗi / thiếu
 * tham số) thì trả về đúng điều kiện kiểu cũ (`propertyReference = idRoot`), nên
 * không có nhánh nào cho ra danh sách trắng.
 *
 * `isReady` là hợp đồng chặn get-list — nơi gọi phải truyền
 * `enabled: isReady` cho hook tải danh sách, để không gọi một lượt với điều kiện
 * rộng rồi gọi lại với điều kiện đúng (nháy dữ liệu sai).
 */
export const useParentValuePairs = ({
  idRoot,
  nameClass,
  nameClassRoot,
  propertyReference,
  enabled = true,
  reloadToken = 0,
}: UseParentValuePairsParams) => {
  const canFetch = Boolean(
    enabled && idRoot != null && idRoot !== "" && nameClass && nameClassRoot,
  );

  const cacheKey = canFetch
    ? getParentValueCacheKey(nameClassRoot!, idRoot!, nameClass!)
    : null;

  /* Đọc cache ngay trong initializer: hit cache thì render đầu đã `ready`, không
     nháy khung chờ và không gọi mạng lần hai. */
  const [state, setState] = useState<{
    key: string | null;
    status: ParentValueStatus;
    pairs: ParentValuePairs | null;
  }>(() => {
    if (!cacheKey) return { key: null, status: "skipped", pairs: null };

    const cached = pairsCache.get(cacheKey);

    return cached
      ? { key: cacheKey, status: "ready", pairs: cached }
      : { key: cacheKey, status: "loading", pairs: null };
  });

  const lastReloadRef = useRef(reloadToken);

  useEffect(() => {
    if (!cacheKey) {
      setState({ key: null, status: "skipped", pairs: null });
      return;
    }

    /* Người dùng vừa kéo làm mới: bỏ cache của đúng key này rồi hỏi lại. */
    if (lastReloadRef.current !== reloadToken) {
      lastReloadRef.current = reloadToken;
      pairsCache.delete(cacheKey);
    }

    const cached = pairsCache.get(cacheKey);

    if (cached) {
      setState({ key: cacheKey, status: "ready", pairs: cached });
      return;
    }

    let active = true;
    setState({ key: cacheKey, status: "loading", pairs: null });

    fetchPairs(cacheKey, idRoot!, nameClassRoot!, nameClass!)
      .then((pairs) => {
        if (!active) return;

        log("[useParentValuePairs] bộ cặp:", { cacheKey, ...pairs });
        setState({ key: cacheKey, status: "ready", pairs });
      })
      .catch((err) => {
        if (!active) return;

        /* Không báo cho người dùng: điều kiện lọc là hạ tầng và đã có fallback.
           Danh sách vẫn hiện, chỉ là thiếu điều kiện phân loại. */
        if (!isNetworkRequestError(err)) {
          warn("[useParentValuePairs] lấy bộ cặp thất bại:", err);
        }

        setState({ key: cacheKey, status: "failed", pairs: null });
      });

    return () => {
      active = false;
    };
  }, [cacheKey, idRoot, nameClass, nameClassRoot, reloadToken]);

  /* Trạng thái của key HIỆN TẠI, không phải của key vừa đổi: `cacheKey` đổi thì
     effect chưa chạy nên `state` còn của key cũ — coi như đang tải, và bộ cặp
     của dòng cha cũ tuyệt đối không được dùng để lọc dòng cha mới. */
  const isCurrentKey = state.key === cacheKey;
  const status: ParentValueStatus = isCurrentKey
    ? state.status
    : cacheKey
    ? "loading"
    : "skipped";
  const pairs = isCurrentKey ? state.pairs : null;

  /* Key ổn định cho memo: `conditions` nằm trong deps của hook tải danh sách nên
     mảng mới mỗi render là vòng lặp fetch. */
  const pairsKey = pairs ? JSON.stringify(pairs) : "";

  const conditions = useMemo<Conditions[]>(() => {
    if (status !== "ready" || !pairs) {
      return buildReferenceOnlyConditions(propertyReference, idRoot);
    }

    return mergeReferenceCondition(
      buildParentConditions(pairs.parentsFields, pairs.parentsValues),
      propertyReference,
      idRoot,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pairsKey, propertyReference, idRoot]);

  return {
    conditions,
    pairs,
    status,
    isLoading: status === "loading",
    /** `ready | failed | skipped` — đã chốt điều kiện, cho phép gọi get-list. */
    isReady: status !== "loading",
  };
};
