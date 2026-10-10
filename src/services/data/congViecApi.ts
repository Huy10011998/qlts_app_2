import { API_ENDPOINTS } from "../../config/index";
import type {
  CongViecChiTiet,
  CongViecItem,
  CongViecLichSu,
  CongViecSavePayload,
  CongViecTab,
  CongViecThongTin,
  FlowThaoTacResult,
  WorkflowCondition,
  WorkflowEmployee,
  WorkflowEnvelope,
  WorkflowListResult,
  WorkflowPickedFile,
  WorkflowSaveResult,
  WorkflowThongBao,
} from "../../types/index";
import { callApi } from "./httpClient";
import { postWorkflow, uploadWorkflowFileTo } from "./workflowApi";

/**
 * API màn Công việc. Luật nằm ở server (proc usp_CV_*); app chỉ ẩn / hiện nút
 * theo cờ quyền server trả về. CRUD generic của bảng bị chặn — đừng gọi.
 */

const EMPTY_SAVE: WorkflowSaveResult = { id: 0, soLuong: 0, loi: null };
const EMPTY_THAO_TAC: FlowThaoTacResult = { soThanhCong: 0, loi: [] };

export type CongViecListQuery = {
  tab: CongViecTab;
  /** Lọc màu (maMau), rỗng = không lọc. */
  mau?: string[];
  searchText?: string | null;
  conditions?: WorkflowCondition[];
  pageSize?: number;
  skipSize?: number;
};

export const cvGetList = ({
  tab,
  mau = [],
  searchText,
  conditions = [],
  pageSize = 20,
  skipSize = 0,
}: CongViecListQuery) =>
  postWorkflow<WorkflowListResult<CongViecItem>>(
    API_ENDPOINTS.CV_GET_LIST,
    {
      Tab: tab,
      Mau: mau,
      SearchText: searchText?.trim() || null,
      Conditions: conditions,
      // null = DenNgay DESC, ID DESC.
      Orderby: null,
      PageSize: pageSize,
      SkipSize: skipSize,
    },
    { items: [], totalCount: 0 },
  );

/** Số trên tab, cùng bộ lọc với danh sách. Key PascalCase. */
export const cvDemTab = (
  mau: string[] = [],
  searchText?: string | null,
  conditions: WorkflowCondition[] = [],
) =>
  postWorkflow<Record<string, number>>(
    API_ENDPOINTS.CV_DEM_TAB,
    { Mau: mau, SearchText: searchText?.trim() || null, Conditions: conditions },
    {},
  );

/** Số bình luận / file + cờ quyền của các dòng ĐANG HIỆN. */
export const cvThongTin = (ids: number[]) =>
  ids.length
    ? postWorkflow<CongViecThongTin[]>(API_ENDPOINTS.CV_THONG_TIN, { IDs: ids }, [])
    : Promise.resolve([] as CongViecThongTin[]);

/** 404 = không xem được (không tham gia). */
export const cvChiTiet = (id: number) =>
  postWorkflow<CongViecChiTiet | null>(API_ENDPOINTS.CV_CHI_TIET, { ID: id }, null);

/** Danh sách nhân viên để chọn người tham gia (dùng chung cho kế hoạch). */
export const cvNhanVien = () =>
  postWorkflow<WorkflowEmployee[]>(API_ENDPOINTS.CV_NHAN_VIEN, {}, []);

export const cvThem = (payload: CongViecSavePayload) =>
  postWorkflow<WorkflowSaveResult>(API_ENDPOINTS.CV_THEM, payload, EMPTY_SAVE);

export const cvSua = (payload: CongViecSavePayload) =>
  postWorkflow<WorkflowSaveResult>(API_ENDPOINTS.CV_SUA, payload, EMPTY_SAVE);

/** Nhiều việc 1 lần thì không kèm file; 1 việc thì file đi sau qua iD_LichSus. */
export const cvChuyenTrangThai = (
  ids: number[],
  trangThaiMoi: number,
  ghiChu: string | null,
) =>
  postWorkflow<FlowThaoTacResult>(
    API_ENDPOINTS.CV_CHUYEN_TRANG_THAI,
    { IDs: ids, TrangThaiMoi: trangThaiMoi, GhiChu: ghiChu },
    EMPTY_THAO_TAC,
  );

/** File kết quả của MỘT lần chuyển — gắn vào ID dòng lịch sử, không phải ID việc. */
export const cvTaiFileLichSu = (idLichSu: number, file: WorkflowPickedFile) =>
  uploadWorkflowFileTo(API_ENDPOINTS.CV_TAI_FILE_LICH_SU, idLichSu, file);

export const cvGiaHan = (id: number, denNgayMoi: string, ghiChu: string | null) =>
  postWorkflow<FlowThaoTacResult>(
    API_ENDPOINTS.CV_GIA_HAN,
    { ID: id, DenNgayMoi: denNgayMoi, GhiChu: ghiChu },
    EMPTY_THAO_TAC,
  );

export const cvDoiChuTri = (id: number, idNhanVienMoi: number, ghiChu: string | null) =>
  postWorkflow<FlowThaoTacResult>(
    API_ENDPOINTS.CV_DOI_CHU_TRI,
    { ID: id, ID_NhanVien_Moi: idNhanVienMoi, GhiChu: ghiChu },
    EMPTY_THAO_TAC,
  );

/** Dòng thời gian cũ → mới. */
export const cvLichSu = (id: number) =>
  postWorkflow<CongViecLichSu[]>(API_ENDPOINTS.CV_LICH_SU, { ID: id }, []);

/** Chỉ người tạo, việc còn Mới, không sinh từ phiếu. 400 + câu lý do nếu không được. */
export const cvDelete = (ids: number[]) =>
  callApi<WorkflowEnvelope<unknown>>("POST", API_ENDPOINTS.CV_DELETE, {
    IDs: ids,
    SaveHistory: true,
  });

/**
 * Thông báo của tôi, mới → cũ: việc được giao / sắp hạn / quá hạn / bình luận,
 * và mỗi flow 1 dòng gom các phiếu đang chờ tôi duyệt. Không có trạng thái đã
 * đọc — danh sách là ảnh chụp hiện tại.
 */
export const cvThongBao = () =>
  postWorkflow<WorkflowThongBao[]>(API_ENDPOINTS.CV_THONG_BAO, {}, []);
