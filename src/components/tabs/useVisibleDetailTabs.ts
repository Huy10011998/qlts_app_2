import { useMemo } from "react";

import type { TabItem } from "../../types";
import { usePermission } from "../../hooks/usePermission";
import { useParams } from "../../hooks/useParams";

/**
 * Danh sách mục thật sự hiện được trên thanh chuyển mục.
 *
 * Dùng chung cho cả thanh chuyển mục và cử chỉ vuốt ngang: vuốt phải nhảy đúng
 * theo thứ tự đang thấy, không rơi vào mục đã bị lọc vì thiếu quyền.
 */
export function useVisibleDetailTabs(tabs?: readonly TabItem[]) {
  const { nameClass } = useParams();
  const { can, loaded } = usePermission();

  const hasAttachPermission = useMemo(() => {
    if (!loaded || !nameClass) return false;
    return can(nameClass, "AttachFile");
  }, [can, loaded, nameClass]);

  return useMemo(
    () =>
      (tabs ?? []).filter((tab) => {
        if (tab.key === "attach") return hasAttachPermission;
        return true;
      }),
    [hasAttachPermission, tabs],
  );
}
