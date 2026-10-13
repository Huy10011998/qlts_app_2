import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { usePermission } from "../../hooks/usePermission";
import { cvThongBao } from "../../services/data/congViecApi";
import { useAppSelector } from "../../store/hooks";
import { warn } from "../../utils/Logger";
import { WORKFLOW_VIEW_CODE } from "./workflowMenu";

/**
 * Số trên ô Workflow (Chức năng + Truy cập nhanh) và nút Việc cần xử lý cạnh
 * chuông: số dòng cv-thong-bao (phiếu chờ duyệt, việc được giao, sắp hạn, quá
 * hạn, bình luận).
 * Là thống kê công việc, không phải số thông báo chưa đọc, nên chuông không
 * hiện số này.
 *
 * Tự tải khi có quyền View.Workflow, khi quay lại app và sau mỗi thao tác ghi
 * Workflow (duyệt phiếu, chuyển trạng thái việc...); làm mới danh mục thì gọi
 * `reload`.
 */
export const useWorkflowTileCount = () => {
  const { canView, loaded } = usePermission();
  const enabled = loaded && canView(WORKFLOW_VIEW_CODE);
  const version = useAppSelector((state) => state.workflow.version);
  const [count, setCount] = useState(0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const requestRef = useRef(0);

  const reload = useCallback(async () => {
    if (!enabledRef.current) return;

    const requestId = ++requestRef.current;

    try {
      const items = await cvThongBao();
      // Lượt mới hơn đã chạy — bỏ số cũ.
      if (requestId === requestRef.current) setCount(items.length);
    } catch (err) {
      // Giữ số cũ: mất mạng thoáng qua không làm ô mất số.
      warn("[Workflow] Tải số trên ô Workflow thất bại", err);
    }
  }, []);

  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload, version]);

  useEffect(() => {
    if (!enabled) return;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") reload();
    });
    return () => subscription.remove();
  }, [enabled, reload]);

  return { count: enabled ? count : 0, reload };
};
