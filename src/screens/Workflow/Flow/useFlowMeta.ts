import { useEffect, useState } from "react";

import { getPropertyClass } from "../../../services/data/commonApi";
import { getFlowFields } from "../../../services/data/flowApi";
import { isWorkflowNotFound } from "../../../services/data/workflowApi";
import type { FlowInfo, PropertyResponse } from "../../../types/index";
import { getWorkflowErrorMessage } from "../shared/workflowErrors";
import { normalizeWorkflowFields, WorkflowField } from "../shared/workflowFields";

type FlowMeta = {
  flow: FlowInfo;
  fields: WorkflowField[];
  /**
   * Tên cột SỐ PHIẾU của flow (get-class-by-name → propertyTuDongTang, vd
   * "SoTicket") — khác nhau giữa các flow nên phải hỏi server, đừng đoán.
   * null khi chưa khai: số phiếu hiện "#<id>".
   */
  soPhieuField: string | null;
};

/** Tên cột số phiếu; lỗi thì coi như chưa khai — chỉ ảnh hưởng chỗ hiện số. */
const loadSoPhieuField = (nameClass: string) =>
  getPropertyClass<{ data?: PropertyResponse | null }>(nameClass)
    .then((res) => res?.data?.propertyTuDongTang?.trim() || null)
    .catch(() => null);

/** Metadata theo tên bảng, giữ trong phiên (danh sách, chi tiết, form dùng chung). */
const cache = new Map<string, Promise<FlowMeta>>();

export const loadFlowMeta = (nameClass: string) => {
  const cached = cache.get(nameClass);
  if (cached) return cached;

  const promise = Promise.all([getFlowFields(nameClass), loadSoPhieuField(nameClass)])
    .then(([data, soPhieuField]) => {
      if (!data?.flow) throw Object.assign(new Error("FLOW_NOT_FOUND"), { response: { status: 404 } });
      return { flow: data.flow, fields: normalizeWorkflowFields(data.fields), soPhieuField };
    })
    .catch((err) => {
      cache.delete(nameClass);
      throw err;
    });

  cache.set(nameClass, promise);
  return promise;
};

/**
 * Metadata của flow (get-flow-fields): `flow.id` là ID_Flow (giá trị hệ thống
 * khi lập phiếu và cấp cha của ô Loại đề nghị), `flow.ten` là tiêu đề màn.
 * 404 = tên bảng chưa khai flow. Kèm tên cột số phiếu (get-class-by-name).
 */
export function useFlowMeta(nameClass?: string | null) {
  const [meta, setMeta] = useState<FlowMeta | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!nameClass) {
      setLoading(false);
      setErrorMessage("Chưa khai tên bảng của phiếu.");
      return;
    }

    let alive = true;
    setLoading(true);
    loadFlowMeta(nameClass)
      .then((result) => {
        if (!alive) return;
        setMeta(result);
        setErrorMessage(null);
      })
      .catch((err) => {
        if (!alive) return;
        setErrorMessage(
          isWorkflowNotFound(err)
            ? `"${nameClass}" chưa được khai quy trình.`
            : getWorkflowErrorMessage(err, "Không tải được cấu hình phiếu."),
        );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [nameClass]);

  return { meta, errorMessage, loading };
}
