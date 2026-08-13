import { useEffect, useMemo, useState } from "react";

import type { AssetItem } from "../../types/navigator.d";
import type { Conditions, TabItem } from "../../types";
import { SqlOperator, TypeProperty } from "../../utils/Enum";
import { getListAttachFile } from "../../services";
import { usePermission } from "../../hooks/usePermission";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { isNetworkRequestError } from "../../utils/helpers/api";
import { error } from "../../utils/Logger";

/** Chỉ cần con số, không cần bản ghi nào — xin đúng 1 dòng cho nhẹ. */
const COUNT_PAGE_SIZE = 1;

/**
 * Gắn dấu hiệu "trong mục này có gì" lên thanh chuyển mục, để không phải bấm vào
 * từng mục mới biết.
 *
 * Hai mục có dữ liệu khác hẳn nhau nên dấu hiệu cũng khác:
 * - Note: `item.notes` là một khối HTML, không phải danh sách nên không có gì để
 *   đếm → chấm tròn "có ghi chú", lấy ngay từ item, không tốn request.
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

  const id = item?.id;
  const hasAttachTab = Boolean(tabs?.some((tab) => tab.key === "attach"));
  const canAttach = Boolean(
    loaded && nameClass && hasAttachTab && can(nameClass, "AttachFile"),
  );

  const hasNote =
    typeof item?.notes === "string" && item.notes.trim().length > 0;

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
      if (tab.key === "notes" && hasNote) return { ...tab, badge: "dot" as const };
      if (tab.key === "attach" && attachCount) {
        return { ...tab, badge: attachCount };
      }

      return tab;
    });
  }, [attachCount, hasNote, tabs]);
}
