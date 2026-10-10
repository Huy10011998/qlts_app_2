import { useEffect, useState } from "react";

import { useAuth } from "../../../context/AuthContext";
import { useNhanVienInfo } from "../../../hooks/useNhanVienInfo";
import { getWorkflowMe } from "../../../services/data/workflowApi";
import type { WorkflowMe } from "../../../types/index";

type GetInfoResult = Pick<WorkflowMe, "iD_NhanVien">;

/**
 * get-info gọi một lần cho cả phiên. Khoá theo token để đăng xuất rồi đăng
 * nhập tài khoản khác không đọc nhầm nhân viên cũ — token xoay vòng khi refresh
 * chỉ làm tốn thêm một lượt gọi nhẹ.
 */
let cached: { token: string | null; promise: Promise<GetInfoResult> } | null = null;

const loadWorkflowMe = (token: string | null) => {
  if (cached && cached.token === token) return cached.promise;

  const promise = getWorkflowMe().catch((err) => {
    if (cached?.promise === promise) cached = null;
    throw err;
  });

  cached = { token, promise };
  return promise;
};

/**
 * Người đăng nhập của view Workflow.
 *   · `iD_NhanVien` (get-info): null = chưa liên kết nhân viên — chỉ xem, ẩn
 *     Thêm / Duyệt.
 *   · `iD_PhongBan` (get-nhan-vien-info): điền ID_PhongBan_Tao khi lập phiếu.
 *     Danh thiếp này đã nạp một lần sau đăng nhập (Redux), chưa có thì tự nạp.
 *     KHÔNG gọi NhanVien/get-single — cần quyền tài khoản thường không có.
 *
 * get-info lỗi mạng thì tạm lấy ID nhân viên từ danh thiếp (cùng một nhân
 * viên), để màn không khoá oan.
 */
export function useWorkflowMe() {
  const { token } = useAuth();
  const { info: nhanVien } = useNhanVienInfo();
  const [getInfo, setGetInfo] = useState<GetInfoResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    setLoading(true);
    loadWorkflowMe(token)
      .then((result) => {
        if (!alive) return;
        setGetInfo(result);
        setFailed(false);
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [token]);

  const iD_NhanVien = getInfo
    ? getInfo.iD_NhanVien
    : failed
    ? nhanVien?.id ?? null
    : null;

  const me: WorkflowMe = {
    iD_NhanVien,
    iD_PhongBan: nhanVien?.iD_PhongBan ?? null,
  };

  return { me, loading };
}
