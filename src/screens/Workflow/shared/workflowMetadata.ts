import { getFieldActive } from "../../../services/data/commonApi";
import { normalizeWorkflowFields, WorkflowField } from "./workflowFields";

/**
 * Metadata (get-fields-active) của CV_CongViec / CV_KeHoach. Tài liệu: "gọi 1
 * lần khi mở màn hình" — giữ trong phiên để màn danh sách, chi tiết và form
 * không gọi lại ba lần liên tiếp. Admin đổi metadata trên web thì mở lại app
 * là thấy.
 */
const cache = new Map<string, Promise<WorkflowField[]>>();

export const loadClassFields = (nameClass: string) => {
  const cached = cache.get(nameClass);
  if (cached) return cached;

  const promise = getFieldActive<{ data?: unknown }>(nameClass)
    .then((res) => normalizeWorkflowFields(res?.data))
    .catch((err) => {
      cache.delete(nameClass);
      throw err;
    });

  cache.set(nameClass, promise);
  return promise;
};
