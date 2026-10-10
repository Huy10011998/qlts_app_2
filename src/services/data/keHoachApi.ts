import { API_ENDPOINTS } from "../../config/index";
import type {
  FlowThaoTacResult,
  KeHoachChiTiet,
  KeHoachItem,
  KeHoachSavePayload,
  KeHoachTab,
  WorkflowListResult,
  WorkflowSaveResult,
} from "../../types/index";
import { postWorkflow } from "./workflowApi";

/**
 * API màn Kế hoạch. Chủ trì = người tạo; số việc / % hoàn thành luôn tính
 * trên MỌI việc của kế hoạch. CRUD generic của bảng bị chặn.
 */

export const khGetList = ({
  tab,
  searchText,
  pageSize = 20,
  skipSize = 0,
}: {
  tab: KeHoachTab;
  searchText?: string | null;
  pageSize?: number;
  skipSize?: number;
}) =>
  postWorkflow<WorkflowListResult<KeHoachItem>>(
    API_ENDPOINTS.KH_GET_LIST,
    {
      Tab: tab,
      SearchText: searchText?.trim() || null,
      Conditions: [],
      // null = DenNgay DESC.
      Orderby: null,
      PageSize: pageSize,
      SkipSize: skipSize,
    },
    { items: [], totalCount: 0 },
  );

/** 404 = không xem được. */
export const khChiTiet = (id: number) =>
  postWorkflow<KeHoachChiTiet | null>(API_ENDPOINTS.KH_CHI_TIET, { ID: id }, null);

export const khThem = (payload: KeHoachSavePayload) =>
  postWorkflow<WorkflowSaveResult>(API_ENDPOINTS.KH_THEM, payload, {
    id: 0,
    soLuong: 0,
    loi: null,
  });

export const khSua = (payload: KeHoachSavePayload) =>
  postWorkflow<WorkflowSaveResult>(API_ENDPOINTS.KH_SUA, payload, {
    id: 0,
    soLuong: 0,
    loi: null,
  });

/** Chỉ chủ trì, khi không còn công việc. `loi` có câu thì hiện nguyên văn. */
export const khXoa = (id: number) =>
  postWorkflow<FlowThaoTacResult>(API_ENDPOINTS.KH_XOA, { ID: id }, {
    soThanhCong: 0,
    loi: [],
  });
