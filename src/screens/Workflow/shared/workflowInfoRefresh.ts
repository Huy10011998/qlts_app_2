import { useEffect, useRef } from "react";

/**
 * Đóng màn Bình luận / Đính kèm (nút nào, vuốt lùi hay back) → các màn bên dưới
 * nạp lại số bình luận / số file (flow-thong-tin / cv-thong-tin) cho dòng đang
 * hiện — bản 14/10 tài liệu 3 mục 11, tài liệu 4 mục 9. Không chỉ khi mình gửi:
 * người khác có thể vừa bình luận (realtime) hoặc thêm / xoá file.
 *
 * Gọi nhẹ, không nạp lại cả danh sách (khỏi mất vị trí cuộn / trang đã tải).
 */
type Listener = (apiBase: string) => void;

const listeners = new Set<Listener>();

export const notifyWorkflowInfoStale = (apiBase: string) => {
  listeners.forEach((listener) => listener(apiBase));
};

/** `onStale(apiBase)` mỗi khi 1 màn Bình luận / Đính kèm đóng. */
export const useOnWorkflowInfoStale = (onStale: Listener) => {
  const ref = useRef(onStale);
  ref.current = onStale;

  useEffect(() => {
    const listener: Listener = (apiBase) => ref.current(apiBase);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
};

/** Đặt trong màn Bình luận / Đính kèm: lúc gỡ màn thì báo. */
export const useNotifyInfoStaleOnClose = (apiBase: string) => {
  useEffect(() => () => notifyWorkflowInfoStale(apiBase), [apiBase]);
};
