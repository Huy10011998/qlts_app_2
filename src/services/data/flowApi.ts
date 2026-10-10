import { API_ENDPOINTS } from "../../config/index";
import type {
  FlowChonNguoi,
  FlowChonNguoiPair,
  FlowDuyetPayload,
  FlowFieldsResult,
  FlowRecord,
  FlowTab,
  FlowThaoTacResult,
  FlowThongTin,
  FlowTienTrinh,
  WorkflowCondition,
  WorkflowEnvelope,
  WorkflowListResult,
  WorkflowSaveResult,
} from "../../types/index";
import { SqlOperator, TypeProperty } from "../../utils/Enum";
import { callApi } from "./httpClient";
import { postWorkflow } from "./workflowApi";

/**
 * API màn phiếu đề nghị dùng chung mọi quy trình. `name` là tên bảng nghiệp vụ
 * (Flow.TenBang, vd `Ticket_PhongBan`) — mọi API nằm dưới `/api/{name}/...` và
 * giống hệt nhau giữa các flow.
 */

const EMPTY_LIST = { items: [], totalCount: 0 };
const EMPTY_CHON_NGUOI: FlowChonNguoi = {
  buocs: [],
  ungViens: [],
  daChons: [],
  nhanViens: [],
  taoCongViec: null,
};
const EMPTY_THAO_TAC: FlowThaoTacResult = { soThanhCong: 0, loi: [] };

export type FlowListQuery = {
  tab: FlowTab;
  searchText?: string | null;
  conditions?: WorkflowCondition[];
  pageSize?: number;
  skipSize?: number;
};

/** Metadata của flow. 404 = tên bảng chưa khai flow. */
export const getFlowFields = (name: string) =>
  postWorkflow<FlowFieldsResult | null>(
    API_ENDPOINTS.GET_FLOW_FIELDS,
    { TenBang: name },
    null,
  );

export const flowGetList = (
  name: string,
  { tab, searchText, conditions = [], pageSize = 20, skipSize = 0 }: FlowListQuery,
) =>
  postWorkflow<WorkflowListResult<FlowRecord>>(
    `/${name}/flow-get-list`,
    {
      Tab: tab,
      SearchText: searchText?.trim() || null,
      Conditions: conditions,
      Orderby: "ID DESC",
      PageSize: pageSize,
      SkipSize: skipSize,
    },
    EMPTY_LIST,
  );

/**
 * Một phiếu theo ID (mở từ thông báo, thẻ công việc, nạp lại sau thao tác).
 * Không có API riêng: tài liệu BE chỉ định dùng danh sách tab "TatCa" + điều
 * kiện ID — vẫn đúng luật ai được xem. KHÔNG dùng get-single (bỏ qua luật xem).
 * null = phiếu không tới tôi / đã xoá.
 */
export const flowGetById = async (name: string, id: number) => {
  const result = await flowGetList(name, {
    tab: "TatCa",
    pageSize: 1,
    conditions: [
      {
        Property: "ID",
        Operator: SqlOperator.Equals,
        Value: id,
        Type: TypeProperty.Int,
      },
    ],
  });

  return result.items?.[0] ?? null;
};

/** Số trên tab — chỉ ChoDuyet / DangXuLy / Nhap có số. Key PascalCase. */
export const flowDemTab = (
  name: string,
  searchText?: string | null,
  conditions: WorkflowCondition[] = [],
) =>
  postWorkflow<Record<string, number>>(
    `/${name}/flow-dem-tab`,
    { SearchText: searchText?.trim() || null, Conditions: conditions },
    {},
  );

/** Thông tin phụ của các dòng ĐANG HIỆN — gọi 1 lần / trang. */
export const flowThongTin = (name: string, ids: number[]) =>
  ids.length
    ? postWorkflow<FlowThongTin[]>(`/${name}/flow-thong-tin`, { IDs: ids }, [])
    : Promise.resolve([] as FlowThongTin[]);

export const flowTienTrinh = (name: string, idHoSo: number) =>
  postWorkflow<FlowTienTrinh>(
    `/${name}/flow-tien-trinh`,
    { ID_HoSo: idHoSo },
    { buocs: [], nguoiDuyets: [], congViec: null },
  );

/**
 * Bước phải chọn người duyệt lúc nộp. Sửa nháp: id phiếu; nhân bản: id phiếu
 * gốc; phiếu mới: 0. Gọi lại mỗi lần đổi Loại đề nghị.
 */
export const flowChonNguoi = (name: string, idHoSo: number, idLoaiFlow: number) =>
  postWorkflow<FlowChonNguoi>(
    `/${name}/flow-chon-nguoi`,
    { ID_HoSo: idHoSo, ID_LoaiFlow: idLoaiFlow },
    EMPTY_CHON_NGUOI,
  );

/** Hỏi trước khi duyệt 1 phiếu: có phải chọn người / có Tạo công việc không. */
export const flowChonNguoiDuyet = (name: string, idHoSo: number) =>
  postWorkflow<FlowChonNguoi>(
    `/${name}/flow-chon-nguoi-duyet`,
    { ID_HoSo: idHoSo },
    EMPTY_CHON_NGUOI,
  );

/** Danh sách lỗi theo field; rỗng = hợp lệ. */
export const flowCheckValidation = (
  name: string,
  data: Record<string, any>,
  id: number,
) =>
  postWorkflow<Array<{ fieldName?: string; errorType?: string; message?: string }>>(
    `/${name}/check-validation`,
    { Data: data, ID: id },
    [],
  );

/** Lưu nháp MỚI — trả ID phiếu. */
export const flowInsertOutId = async (name: string, entity: Record<string, any>) => {
  const id = await postWorkflow<number | null>(
    `/${name}/insert-out-id`,
    { Entities: [entity], SaveHistory: true },
    null,
  );

  return Number(id) || 0;
};

/** Sửa nháp — `entity` là trọn dòng. */
export const flowUpdate = (name: string, entity: Record<string, any>, id: number) =>
  callApi<WorkflowEnvelope<unknown>>("POST", `/${name}/update`, {
    Entity: entity,
    IDs: [id],
    lstIncludeProperties: [],
    lstExcludeProperties: ["Notes"],
    SaveHistory: true,
  });

export const flowLuuChonNguoi = (
  name: string,
  idHoSo: number,
  chons: FlowChonNguoiPair[],
) =>
  callApi<WorkflowEnvelope<unknown>>("POST", `/${name}/flow-luu-chon-nguoi`, {
    ID_HoSo: idHoSo,
    Chons: chons.map((chon) => ({
      ID_Buoc: chon.iD_Buoc,
      ID_NhanVien: chon.iD_NhanVien,
    })),
  });

/** Nộp: cấp số + chụp quy trình + mở bước đầu. */
export const flowNopHoSo = (name: string, idHoSo: number) =>
  postWorkflow<FlowThaoTacResult>(
    `/${name}/flow-nop-ho-so`,
    { ID_HoSo: idHoSo },
    EMPTY_THAO_TAC,
  );

export const flowDuyetHoSo = (name: string, payload: FlowDuyetPayload) =>
  postWorkflow<FlowThaoTacResult>(
    `/${name}/flow-duyet-ho-so`,
    payload,
    EMPTY_THAO_TAC,
  );

/** ID các phiếu đang ở lượt cuối của loại bật "Tạo công việc". */
export const flowKiemTaoCongViec = (name: string, ids: number[]) =>
  postWorkflow<number[]>(`/${name}/flow-kiem-tao-cong-viec`, { IDs: ids }, []);

export const flowTaoCongViec = (
  name: string,
  payload: { ID_HoSo: number; YKien: string | null; CongViec: Record<string, any> },
) =>
  postWorkflow<WorkflowSaveResult>(`/${name}/flow-tao-cong-viec`, payload, {
    id: 0,
    soLuong: 0,
    loi: null,
  });

export const flowDelete = (name: string, ids: number[]) =>
  callApi<WorkflowEnvelope<unknown>>("POST", `/${name}/delete`, {
    IDs: ids,
    SaveHistory: true,
  });
