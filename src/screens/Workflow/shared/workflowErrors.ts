import { getApiErrorMessage, isNetworkRequestError } from "../../../utils/helpers/api";

/**
 * Câu báo lỗi cho người dùng: lỗi server thì lấy `message` server trả (đã là
 * tiếng Việt); lỗi do app tự ném (vd file quá 20MB) thì lấy câu của lỗi đó;
 * còn lại dùng câu dự phòng.
 */
export const getWorkflowErrorMessage = (err: any, fallback: string) => {
  if (err?.response) return getApiErrorMessage(err, fallback);
  if (isNetworkRequestError(err)) {
    return "Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.";
  }
  if (err instanceof Error && !(err as any).isAxiosError && err.message) {
    return err.message;
  }
  return fallback;
};
