import { useEffect, useMemo, useState } from "react";

import type { AssetItem } from "../../types/navigator.d";
import type { Conditions, TabItem } from "../../types";
import { SqlOperator, TypeProperty } from "../../utils/Enum";
import {
  getClassReference,
  getListAttachFile,
  getListHistory,
} from "../../services";
import { usePermission } from "../../hooks/usePermission";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { isNetworkRequestError } from "../../utils/helpers/api";
import { error } from "../../utils/Logger";

/** Chỉ cần con số, không cần bản ghi nào — xin đúng 1 dòng cho nhẹ. */
const COUNT_PAGE_SIZE = 1;

/**
 * Danh mục liên kết là cấu hình của class, không đổi trong một lần dùng app, nên
 * giữ lại theo class: mở lại chi tiết của cùng loại tài sản thì badge có ngay,
 * không gọi mạng nữa.
 */
const referenceCountCache = new Map<string, number>();

/**
 * Gắn dấu hiệu "trong mục này có gì" lên thanh chuyển mục, để không phải bấm vào
 * từng mục mới biết.
 *
 * Hai mục có dữ liệu khác hẳn nhau nên dấu hiệu cũng khác:
 * - Note: `item.notes` là một khối HTML, không phải danh sách nên không có gì để
 *   đếm → chấm tròn "có ghi chú", lấy ngay từ item, không tốn request.
 * - Chi tiết: đếm số danh mục liên kết (`getClassReference`) — cùng nguồn với
 *   danh sách trong mục đó, nhưng phải xin sớm mới có số lúc vào màn.
 * - Lịch sử: `get-list-history` không có phân trang, trả về cả danh sách, nên
 *   badge phải trả giá đúng một request như vậy — đổi lấy việc biết ngay bản ghi
 *   có bao nhiêu lần sửa mà không cần mở mục. Không cache: lịch sử đổi theo mỗi
 *   lần sửa bản ghi.
 * - Tệp: đếm được, nhưng `AssetAttachFile` chỉ tải khi mở mục đó. Muốn có số
 *   ngay khi vào màn thì phải xin `totalCount` riêng — một request `pageSize: 1`,
 *   và chỉ khi có quyền AttachFile (trùng điều kiện mục Tệp được hiện).
 */
export function useDetailTabBadges({
  tabs,
  item,
  nameClass,
}: {
  tabs?: readonly TabItem[];
  item: AssetItem | null | undefined;
  nameClass?: string;
}): readonly TabItem[] | undefined {
  const { can, loaded } = usePermission();
  const { isMounted } = useSafeAlert();
  const [attachCount, setAttachCount] = useState<number | null>(null);
  const [historyCount, setHistoryCount] = useState<number | null>(null);
  const [referenceCount, setReferenceCount] = useState<number | null>(
    () => (nameClass ? referenceCountCache.get(nameClass) ?? null : null),
  );

  const id = item?.id;
  const hasAttachTab = Boolean(tabs?.some((tab) => tab.key === "attach"));
  const canAttach = Boolean(
    loaded && nameClass && hasAttachTab && can(nameClass, "AttachFile"),
  );

  const hasDetailsTab = Boolean(tabs?.some((tab) => tab.key === "details"));
  const hasHistoryTab = Boolean(tabs?.some((tab) => tab.key === "history"));

  const hasNote =
    typeof item?.notes === "string" && item.notes.trim().length > 0;

  useEffect(() => {
    if (!hasDetailsTab || !nameClass) {
      setReferenceCount(null);
      return;
    }

    const cached = referenceCountCache.get(nameClass);
    if (cached !== undefined) {
      setReferenceCount(cached);
      return;
    }

    let active = true;

    getClassReference(nameClass)
      .then((response) => {
        const data = response?.data;
        if (!Array.isArray(data)) return;

        referenceCountCache.set(nameClass, data.length);
        if (active && isMounted()) setReferenceCount(data.length);
      })
      .catch((e) => {
        // Badge là thông tin phụ: đếm không được thì ẩn, không báo lỗi cho user.
        if (!isNetworkRequestError(e)) error("Đếm danh mục liên kết lỗi:", e);
        if (active) setReferenceCount(null);
      });

    return () => {
      active = false;
    };
  }, [hasDetailsTab, isMounted, nameClass]);

  useEffect(() => {
    if (!hasHistoryTab || !id || !nameClass) {
      setHistoryCount(null);
      return;
    }

    let active = true;

    getListHistory(String(id), nameClass)
      .then((response) => {
        if (!active || !isMounted()) return;

        const data = response?.data;
        setHistoryCount(Array.isArray(data) ? data.length : null);
      })
      .catch((e) => {
        // Badge là thông tin phụ: đếm không được thì ẩn, không báo lỗi cho user.
        if (!isNetworkRequestError(e)) error("Đếm lịch sử lỗi:", e);
        if (active) setHistoryCount(null);
      });

    return () => {
      active = false;
    };
  }, [hasHistoryTab, id, isMounted, nameClass]);

  useEffect(() => {
    if (!canAttach || !id || !nameClass) {
      setAttachCount(null);
      return;
    }

    let active = true;
    const conditions: Conditions[] = [
      {
        property: "ID_Class",
        operator: SqlOperator.Equals,
        value: String(id),
        type: TypeProperty.Int,
      },
      {
        property: "Name_Class",
        operator: SqlOperator.Equals,
        value: String(nameClass),
        type: TypeProperty.String,
      },
    ];

    getListAttachFile(nameClass, "", COUNT_PAGE_SIZE, 0, "", conditions, [])
      .then((response) => {
        if (!active || !isMounted()) return;

        setAttachCount(response?.data?.totalCount || 0);
      })
      .catch((e) => {
        // Badge là thông tin phụ: đếm không được thì ẩn, không báo lỗi cho user.
        if (!isNetworkRequestError(e)) error("Đếm tệp đính kèm lỗi:", e);
        if (active) setAttachCount(null);
      });

    return () => {
      active = false;
    };
  }, [canAttach, id, isMounted, nameClass]);

  return useMemo(() => {
    if (!tabs) return tabs;

    return tabs.map((tab) => {
      if (tab.key === "details" && referenceCount) {
        return { ...tab, badge: referenceCount };
      }
      if (tab.key === "history" && historyCount) {
        return { ...tab, badge: historyCount };
      }
      if (tab.key === "notes" && hasNote) return { ...tab, badge: "dot" as const };
      if (tab.key === "attach" && attachCount) {
        return { ...tab, badge: attachCount };
      }

      return tab;
    });
  }, [attachCount, hasNote, historyCount, referenceCount, tabs]);
}
