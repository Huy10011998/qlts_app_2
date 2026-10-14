import { API_ENDPOINTS } from "../../config/index";
import type { ThongBaoListResult, ThongBaoNhom } from "../../types/index";
import { removeThongBaoFromTray } from "../notifications/thongBaoPush";
import { postWorkflow } from "./workflowApi";

/**
 * Thông báo chuông (8-Mobile-ThongBao): server lưu từng thông báo của người
 * đăng nhập (phiếu / công việc / kế hoạch) kèm cờ đã đọc. Chỉ cần token — tài
 * khoản chưa liên kết nhân viên thì danh sách rỗng.
 */

export type ThongBaoListQuery = {
  pageSize?: number;
  skipSize?: number;
  chiChuaDoc?: boolean;
  /** null = tất cả nhóm. */
  nhom?: ThongBaoNhom | null;
};

/** Xếp MỚI → CŨ. `soChuaDoc` luôn là số của mọi nhóm. */
export const thongBaoGetList = ({
  pageSize = 20,
  skipSize = 0,
  chiChuaDoc = false,
  nhom = null,
}: ThongBaoListQuery = {}) =>
  postWorkflow<ThongBaoListResult>(
    API_ENDPOINTS.THONG_BAO_GET_LIST,
    { PageSize: pageSize, SkipSize: skipSize, ChiChuaDoc: chiChuaDoc, Nhom: nhom },
    { items: [], totalCount: 0, soChuaDoc: 0 },
  );

/**
 * Đánh dấu đã đọc. `ids` rỗng = TẤT CẢ. Trả số chưa đọc còn lại (null khi
 * server không trả — nơi gọi giữ số cũ).
 */
export const thongBaoDaDoc = async (ids: number[]) => {
  const left = await postWorkflow<number | null>(
    API_ENDPOINTS.THONG_BAO_DA_DOC,
    { IDs: ids },
    null,
  );
  // Đã đọc thì gỡ push của nó khỏi khay (rỗng = tất cả).
  removeThongBaoFromTray(ids.length ? ids : "all");
  return left == null || isNaN(Number(left)) ? null : Number(left);
};
