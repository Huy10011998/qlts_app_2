import { useEffect, useState } from "react";

import { getFieldActive } from "../../../services/data/commonApi";
import { normalizeWorkflowFields, WorkflowField } from "./workflowFields";

/**
 * Metadata (get-fields-active) của CV_CongViec / CV_KeHoach. Tài liệu: "gọi 1
 * lần khi mở màn hình" — giữ trong phiên để màn danh sách, chi tiết và form
 * không gọi lại ba lần liên tiếp. Admin đổi metadata trên web thì mở lại app
 * là thấy.
 */
const cache = new Map<string, Promise<WorkflowField[]>>();
/** Bản đã về của `cache` — đọc đồng bộ để lần mở sau vẽ thẻ thật ngay khung đầu. */
const resolved = new Map<string, WorkflowField[]>();

export const loadClassFields = (nameClass: string) => {
  const cached = cache.get(nameClass);
  if (cached) return cached;

  const promise = getFieldActive<{ data?: unknown }>(nameClass)
    .then((res) => {
      const fields = normalizeWorkflowFields(res?.data);
      resolved.set(nameClass, fields);
      return fields;
    })
    .catch((err) => {
      cache.delete(nameClass);
      throw err;
    });

  cache.set(nameClass, promise);
  return promise;
};

type ClassFieldsState = { fields: WorkflowField[]; ready: boolean };

/**
 * Field của class cho màn danh sách / chi tiết. `ready` = đã có câu trả lời
 * (lỗi thì coi như rỗng — vẫn vẽ được, chỉ thiếu dòng). Màn giữ khung chờ tới
 * khi `ready`: vẽ thẻ trước thì thẻ trống số, tiêu đề, các dòng rồi mới hiện ra.
 */
export function useClassFields(nameClass: string): ClassFieldsState {
  const [state, setState] = useState<ClassFieldsState>(() => {
    const fields = resolved.get(nameClass);
    return fields ? { fields, ready: true } : { fields: [], ready: false };
  });

  useEffect(() => {
    let active = true;
    loadClassFields(nameClass)
      .then((fields) => {
        // Đã đọc sẵn từ `resolved` thì giữ nguyên, khỏi vẽ lại.
        if (active) setState((prev) => (prev.fields === fields ? prev : { fields, ready: true }));
      })
      .catch(() => {
        if (active) setState({ fields: [], ready: true });
      });
    return () => {
      active = false;
    };
  }, [nameClass]);

  return state;
}
