import { Buffer } from "buffer";

import { API_ENDPOINTS } from "../../config/index";
import type {
  FlowThaoTacResult,
  WorkflowApiBase,
  WorkflowComment,
  WorkflowEnvelope,
  WorkflowFileItem,
  WorkflowMe,
  WorkflowPickedFile,
} from "../../types/index";
import { api, callApi } from "./httpClient";

/**
 * Phần dùng chung của view Workflow: vỏ response, bình luận + file (cùng khuôn
 * `/api/{apiBase}/flow-*` cho phiếu đề nghị lẫn công việc) và người đăng nhập.
 */

/** Giới hạn server cho mỗi file (bình luận, đính kèm, file kết quả). */
export const WORKFLOW_MAX_FILE_BYTES = 20 * 1024 * 1024;

/** File 20MB qua mạng di động: rộng tay hơn 15s mặc định của client. */
const UPLOAD_TIMEOUT = 120000;

export const CV_CONG_VIEC_NAME_CLASS = "CV_CongViec";
export const CV_KE_HOACH_NAME_CLASS = "CV_KeHoach";

/** POST rồi đọc payload ở `data` của vỏ chung. */
export const postWorkflow = async <T,>(
  url: string,
  body: unknown,
  fallback: T,
): Promise<T> => {
  const res = await callApi<WorkflowEnvelope<T> | null>("POST", url, body ?? {});
  return (res?.data ?? fallback) as T;
};

/** `loi` của FlowThaoTacResult gộp thành một câu, rỗng = thành công. */
export const getThaoTacError = (result?: FlowThaoTacResult | null) =>
  (result?.loi ?? []).filter(Boolean).join("\n");

export const isWorkflowNotFound = (error: any) =>
  error?.response?.status === 404;

const appendFile = (form: FormData, file: WorkflowPickedFile) => {
  form.append("File", {
    uri: file.uri,
    name: file.name,
    type: file.type || "application/octet-stream",
  } as any);
};

const assertFileSize = (file: WorkflowPickedFile) => {
  if (file.size != null && file.size > WORKFLOW_MAX_FILE_BYTES) {
    throw new Error(`File "${file.name}" vượt quá 20MB.`);
  }
};

/**
 * Tải 1 file lên một bản ghi (multipart, mỗi file 1 lần). `url` là đường dẫn
 * đầy đủ của API tải file, `idClass` là ID bản ghi nhận file.
 */
export const uploadWorkflowFileTo = async (
  url: string,
  idClass: number,
  file: WorkflowPickedFile,
) => {
  assertFileSize(file);

  const form = new FormData();
  form.append("FileAttachment.ID_Class", String(idClass));
  appendFile(form, file);

  return callApi<WorkflowEnvelope<unknown>>("POST", url, form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: UPLOAD_TIMEOUT,
  });
};

// =====================================================
// NGƯỜI ĐĂNG NHẬP
// =====================================================

const toNullableId = (value: unknown) => {
  const id = Number(value);
  return value != null && value !== "" && Number.isFinite(id) && id > 0
    ? id
    : null;
};

/**
 * `iD_NhanVien` null = tài khoản chưa liên kết nhân viên — chỉ xem, ẩn nút
 * Thêm / Duyệt. Phòng ban KHÔNG có ở get-info: lấy ở get-nhan-vien-info (xem
 * `useWorkflowMe`).
 */
export const getWorkflowMe = async (): Promise<Pick<WorkflowMe, "iD_NhanVien">> => {
  const data = await postWorkflow<Record<string, unknown> | null>(
    API_ENDPOINTS.GET_INFO,
    {},
    null,
  );

  return { iD_NhanVien: toNullableId(data?.iD_NhanVien) };
};

// =====================================================
// BÌNH LUẬN + FILE (phiếu đề nghị và công việc dùng chung)
// =====================================================

/** Bình luận cũ → mới. */
export const getWorkflowComments = (apiBase: WorkflowApiBase, idHoSo: number) =>
  postWorkflow<WorkflowComment[]>(
    `/${apiBase}/flow-binh-luan`,
    { ID_HoSo: idHoSo },
    [],
  );

export const addWorkflowComment = async (
  apiBase: WorkflowApiBase,
  idHoSo: number,
  noiDung: string,
  file?: WorkflowPickedFile | null,
) => {
  const form = new FormData();
  form.append("ID_HoSo", String(idHoSo));
  form.append("NoiDung", noiDung);
  if (file) {
    assertFileSize(file);
    appendFile(form, file);
  }

  return callApi<WorkflowEnvelope<unknown>>(
    "POST",
    `/${apiBase}/flow-them-binh-luan`,
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: file ? UPLOAD_TIMEOUT : undefined,
    },
  );
};

export const getWorkflowFiles = (apiBase: WorkflowApiBase, idHoSo: number) =>
  postWorkflow<WorkflowFileItem[]>(
    `/${apiBase}/flow-file`,
    { ID_HoSo: idHoSo },
    [],
  );

export const uploadWorkflowFile = (
  apiBase: WorkflowApiBase,
  idHoSo: number,
  file: WorkflowPickedFile,
) => uploadWorkflowFileTo(`/${apiBase}/flow-tai-file`, idHoSo, file);

export const deleteWorkflowFile = (apiBase: WorkflowApiBase, idFile: number) =>
  callApi<WorkflowEnvelope<unknown>>("POST", `/${apiBase}/flow-xoa-file`, {
    ID: idFile,
  });

/**
 * Nội dung file (server trả THẲNG file, không vỏ JSON) dưới dạng base64. Dùng
 * chung cho file đính kèm, file bình luận và file kết quả lịch sử công việc.
 */
export const viewWorkflowFile = async (
  apiBase: WorkflowApiBase,
  idFile: number,
) => {
  const res = await api.post(
    `/${apiBase}/flow-xem-file`,
    { ID: idFile },
    { responseType: "arraybuffer", timeout: UPLOAD_TIMEOUT },
  );

  return {
    contentType: String(res.headers?.["content-type"] ?? ""),
    base64: Buffer.from(res.data, "binary").toString("base64"),
  };
};
