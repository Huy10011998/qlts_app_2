import {
  CV_CONG_VIEC_NAME_CLASS,
  CV_KE_HOACH_NAME_CLASS,
} from "../../../services/data/workflowApi";
import type { WorkflowCondition } from "../../../types/index";
import { SqlOperator, TypeProperty } from "../../../utils/Enum";

/**
 * Bảng của view Workflow mà BE chặn CRUD chung: `/{bảng}/get-list`, `insert`,
 * `update`… trả 400 "… chỉ đọc / ghi qua các chức năng của màn hình …" — chỉ
 * đọc / ghi qua API `cv-*` / `kh-*` (4-Mobile-CongViec, 5-Mobile-KeHoach).
 *
 * Mấy bảng này vẫn lọt vào những chỗ dựng theo metadata: tab Chi tiết của Nhân
 * viên có "Công việc" / "Kế hoạch" (khoá `ID_NhanVien_Tao`). Chỗ đó phải rẽ sang
 * màn Workflow, đi màn danh sách / form chung là ăn 400.
 */
const WORKFLOW_LIST_ROUTES = {
  [CV_CONG_VIEC_NAME_CLASS]: "CongViec",
  [CV_KE_HOACH_NAME_CLASS]: "KeHoach",
} as const;

export type WorkflowListRoute =
  (typeof WORKFLOW_LIST_ROUTES)[keyof typeof WORKFLOW_LIST_ROUTES];

/** Màn Workflow thay cho danh sách chung của `nameClass`; `null` = bảng thường. */
export const getWorkflowListRoute = (
  nameClass?: string,
): WorkflowListRoute | null =>
  WORKFLOW_LIST_ROUTES[
    (nameClass ?? "").trim() as keyof typeof WORKFLOW_LIST_ROUTES
  ] ?? null;

export const isWorkflowOnlyClass = (nameClass?: string) =>
  getWorkflowListRoute(nameClass) !== null;

/**
 * Danh sách Workflow mở từ tab Chi tiết của một bản ghi: chỉ hiện dòng có
 * `property = idRoot` (vd `ID_NhanVien_Tao = 231`). Server vẫn tự giới hạn theo
 * người đăng nhập — chỉ ra việc / kế hoạch mình thấy được ở màn Workflow.
 */
export type WorkflowRelatedFilter = {
  property: string;
  idRoot: string;
  nameClassRoot?: string;
  /** Mã bản ghi cha — pill góc phải header, như `AssetRelatedList`. */
  rootRecordLabel?: string;
  groupMenuId?: number;
  viewPermission?: string;
  assetTitleHeader?: string;
};

/** Rỗng khi thiếu field / id không phải số — nơi mở màn phải chặn trước. */
export const buildRelatedConditions = (
  related?: WorkflowRelatedFilter,
): WorkflowCondition[] => {
  const property = related?.property?.trim();
  const idRoot = Number(related?.idRoot);

  if (!property || !Number.isSafeInteger(idRoot) || idRoot <= 0) return [];

  return [
    {
      Property: property,
      Operator: SqlOperator.Equals,
      Value: idRoot,
      Type: TypeProperty.Int,
    },
  ];
};
